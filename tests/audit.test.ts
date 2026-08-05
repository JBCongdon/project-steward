import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAudit, checkDriftBudget } from "../src/audit.js";
import { addWaiver, pruneExpiredWaivers, readWaivers, renewWaiver } from "../src/baseline.js";
import { detectorsCommand } from "../src/commands/detectors.js";
import { waiverCommand } from "../src/commands/waiver.js";
import { rebuildIndex } from "../src/indexer.js";
import { createProjectLayout } from "../src/layout.js";
import { formatSarif } from "../src/sarif.js";
import { runEvaluation } from "../src/evalHarness.js";

describe("audit", () => {
  it("reports broken relative markdown links with stable ids", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, "README.md"),
      "See [missing docs](docs/missing.md).\n",
      "utf8"
    );

    const first = await runAudit(root);
    const second = await runAudit(root);
    const brokenLink = first.findings.find(
      (finding) => finding.detectorId === "markdown-links"
    );

    expect(brokenLink).toBeDefined();
    expect(brokenLink?.confidence).toBe("high");
    expect(brokenLink?.status).toBe("new");
    expect(second.findings.map((finding) => finding.id)).toEqual(
      first.findings.map((finding) => finding.id)
    );
  });

  it("reports broken markdown anchors", async () => {
    const root = await tempProject();
    await fs.mkdir(path.join(root, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(root, "README.md"),
      "# Start\n\nSee [missing local](#missing-heading) and [missing remote](docs/guide.md#missing-remote).\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(root, "docs", "guide.md"),
      "# Guide\n\n## Existing Remote\n",
      "utf8"
    );

    const report = await runAudit(root);
    const messages = report.findings
      .filter((finding) => finding.detectorId === "markdown-links")
      .map((finding) => finding.message);

    expect(messages).toContain(
      "README.md links to missing anchor #missing-heading in #missing-heading."
    );
    expect(messages).toContain(
      "README.md links to missing anchor #missing-remote in docs/guide.md#missing-remote."
    );
  });

  it("accepts the current audit as a baseline", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, "README.md"),
      "See [missing docs](docs/missing.md).\n",
      "utf8"
    );

    const report = await runAudit(root, { acceptBaseline: true });

    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.every((finding) => finding.status === "baseline")).toBe(
      true
    );
    expect(report.baseline?.findingCount).toBe(report.findings.length);
    expect(report.baseline?.ageDays).toBe(0);
  });

  it("fails check when coverage is degraded outside git", async () => {
    const root = await tempProject();
    const result = await checkDriftBudget(root);

    expect(result.passed).toBe(false);
    expect(result.report.degraded.length).toBeGreaterThan(0);
  });

  it("reports shallow git clones as degraded", async () => {
    const source = await tempProject();
    execFileSync("git", ["init", "-b", "main"], { cwd: source });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: source });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: source });
    execFileSync("git", ["add", "."], { cwd: source });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: source });

    const clone = await fs.mkdtemp(path.join(os.tmpdir(), "project-steward-shallow-"));
    await fs.rm(clone, { recursive: true, force: true });
    execFileSync("git", ["clone", "--depth=1", `file://${source}`, clone]);

    const report = await runAudit(clone);

    expect(report.degraded).toContain(
      "Shallow clone detected; git-correlation detectors are disabled."
    );
  });

  it("does not count decisions/index.md as an ADR", async () => {
    const root = await tempProject();
    const report = await runAudit(root);
    const index = await rebuildIndex(root);

    expect(report.coverage.decisions).toBe(0);
    expect(index.decisions).toHaveLength(0);
    expect(index.documents.find((document) => document.path === ".project/decisions/index.md")?.kind).toBe(
      "project"
    );
  });

  it("marks active waivers without removing the underlying finding", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, "README.md"),
      "See [missing docs](docs/missing.md).\n",
      "utf8"
    );

    const first = await runAudit(root);
    const finding = first.findings.find(
      (candidate) => candidate.detectorId === "markdown-links"
    );
    expect(finding).toBeDefined();

    await addWaiver(root, {
      id: finding!.id,
      reason: "Fixture intentionally links to a missing target.",
      owner: "test",
      expires: "2999-01-01"
    });

    const second = await runAudit(root);
    const waived = second.findings.find((candidate) => candidate.id === finding!.id);

    expect(waived?.status).toBe("waived");
  });

  it("summarizes active and expired waivers", async () => {
    const root = await tempProject();

    await addWaiver(root, {
      id: "STW-ACTIVE",
      reason: "Still under review.",
      owner: "test",
      expires: "2999-01-01"
    });
    await addWaiver(root, {
      id: "STW-EXPIRED",
      reason: "Expired test waiver.",
      owner: "test",
      expires: "2000-01-01"
    });

    const report = await runAudit(root);

    expect(report.waivers).toEqual({
      total: 2,
      active: 1,
      expired: 1
    });
  });

  it("renews and prunes waivers", async () => {
    const root = await tempProject();

    await addWaiver(root, {
      id: "STW-RENEW",
      reason: "Needs more time.",
      owner: "test",
      expires: "2000-01-01"
    });
    await addWaiver(root, {
      id: "STW-KEEP",
      reason: "Still active.",
      owner: "test",
      expires: "2999-01-01"
    });

    const renewed = await renewWaiver(root, "STW-RENEW", "2999-02-01");
    const pruned = await pruneExpiredWaivers(root);
    const waivers = await readWaivers(root);

    expect(renewed?.expires).toBe("2999-02-01");
    expect(pruned.pruned).toHaveLength(0);
    expect(waivers.map((waiver) => waiver.id)).toEqual(["STW-KEEP", "STW-RENEW"]);
  });

  it("does not create a waiver file for a no-op prune", async () => {
    const root = await tempProject();

    const pruned = await pruneExpiredWaivers(root);

    await expect(
      fs.access(path.join(root, ".project", "waivers.json"))
    ).rejects.toThrow();
    expect(pruned).toEqual({ kept: [], pruned: [] });
  });

  it("refuses to add a waiver for an unknown finding unless forced", async () => {
    const root = await tempProject();

    const rejected = await waiverCommand(
      root,
      ["add", "STW-NOTFOUND"],
      new Map([
        ["reason", "Typo test."],
        ["owner", "test"],
        ["expires", "2999-01-01"]
      ])
    );
    const forced = await waiverCommand(
      root,
      ["add", "STW-NOTFOUND"],
      new Map([
        ["reason", "Offline waiver."],
        ["owner", "test"],
        ["expires", "2999-01-01"]
      ]),
      new Set(["force"])
    );

    expect(rejected.ok).toBe(false);
    expect(rejected.text).toContain("Finding not found");
    expect(forced.ok).toBe(true);
  });

  it("reports ADRs missing required sections", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, ".project", "decisions", "ADR-0002-thin-record.md"),
      "# ADR-0002: Thin record\n\nStatus: Accepted\n\n## Context\n\nTiny.\n",
      "utf8"
    );

    const report = await runAudit(root);
    const adrFindings = report.findings.filter(
      (finding) => finding.detectorId === "adr-quality"
    );

    expect(adrFindings.map((finding) => finding.message)).toContain(
      ".project/decisions/ADR-0002-thin-record.md is missing the Decision section."
    );
    expect(adrFindings.map((finding) => finding.message)).toContain(
      ".project/decisions/ADR-0002-thin-record.md is missing the Consequences section."
    );
    expect(adrFindings.map((finding) => finding.message)).toContain(
      ".project/decisions/ADR-0002-thin-record.md is missing the Rollback section."
    );
  });

  it("reports plans with missing or mismatched lifecycle state", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, ".project", "plans", "active", "completed-plan.md"),
      "# Completed Plan\n\nStatus: Completed\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(root, ".project", "plans", "completed", "missing-status.md"),
      "# Missing Status\n",
      "utf8"
    );

    const report = await runAudit(root);
    const planFindings = report.findings.filter(
      (finding) => finding.detectorId === "plan-state"
    );

    expect(planFindings.map((finding) => finding.message)).toContain(
      ".project/plans/active/completed-plan.md is in .project/plans/active but declares Status: Completed."
    );
    expect(planFindings.map((finding) => finding.message)).toContain(
      ".project/plans/completed/missing-status.md does not declare a Status field."
    );
  });

  it("reports invalid policy YAML without crashing audit", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, ".project", "policy.yaml"),
      "detectors:\n  markdown-links: [\n",
      "utf8"
    );

    const report = await runAudit(root);
    const policyFinding = report.findings.find(
      (finding) => finding.detectorId === "policy-config"
    );

    expect(policyFinding?.message).toBe(
      ".project/policy.yaml could not be parsed as YAML."
    );
  });

  it("reports unsupported policy detector ids", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, ".project", "policy.yaml"),
      "detectors:\n  not-a-detector: true\n",
      "utf8"
    );

    const report = await runAudit(root);
    const policyFinding = report.findings.find(
      (finding) => finding.detectorId === "policy-config"
    );

    expect(policyFinding?.message).toBe(
      "detectors.not-a-detector is not a known detector id."
    );
  });

  it("lists detectors with policy enabled state", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, ".project", "policy.yaml"),
      "detectors:\n  plan-state: false\n",
      "utf8"
    );

    const result = await detectorsCommand(root);
    const planState = result.data.find((detector) => detector.id === "plan-state");
    const markdownLinks = result.data.find(
      (detector) => detector.id === "markdown-links"
    );

    expect(planState?.enabled).toBe(false);
    expect(markdownLinks?.enabled).toBe(true);
    expect(result.text).toContain("disabled plan-state");
  });

  it("passes committed evaluation fixtures", async () => {
    const result = await runEvaluation(process.cwd());

    expect(result.passed).toBe(true);
    expect(result.fixtures.length).toBeGreaterThan(0);
  });

  it("exports only new unwaived findings to SARIF", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, "README.md"),
      "See [missing docs](docs/missing.md).\n",
      "utf8"
    );

    const baselineReport = await runAudit(root, { acceptBaseline: true });
    const sarif = formatSarif(baselineReport);

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].results).toHaveLength(0);
  });
});

async function tempProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "project-steward-"));
  await createProjectLayout(root);
  return root;
}
