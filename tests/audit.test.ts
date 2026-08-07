import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { runAudit, checkDriftBudget } from "../src/audit.js";
import { addWaiver, pruneExpiredWaivers, readWaivers, renewWaiver } from "../src/baseline.js";
import { initCommand } from "../src/commands/init.js";
import { baselineCommand } from "../src/commands/baseline.js";
import { detectorsCommand } from "../src/commands/detectors.js";
import { waiverCommand } from "../src/commands/waiver.js";
import {
  compileContextPacket,
  compileExecutionBrief,
  recordRetrievalFeedback
} from "../src/context.js";
import { rebuildIndex } from "../src/indexer.js";
import { judgeIntent, proposeAdr, runDecisionStudy } from "../src/judgment.js";
import { createProjectLayout } from "../src/layout.js";
import { installAgentAdapters } from "../src/agentAdapters.js";
import { runPacketBenchmark } from "../src/packetBenchmark.js";
import { formatSarif } from "../src/sarif.js";
import {
  generateHandoff,
  readCurrentSession,
  reconcileDryRun,
  recordSessionEntry,
  startSession
} from "../src/session.js";
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

  it("appends .kairn to an existing gitignore during init", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "kairn-"));
    await fs.writeFile(path.join(root, ".gitignore"), "dist/\n", "utf8");

    await createProjectLayout(root);

    await expect(fs.readFile(path.join(root, ".gitignore"), "utf8")).resolves.toBe(
      "dist/\n.kairn/\n"
    );
  });

  it("installs agent adapters during init", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "kairn-init-"));

    const result = await initCommand(root);

    await expect(fs.readFile(path.join(root, "AGENTS.md"), "utf8")).resolves.toContain(
      "Kairn Agent Instructions"
    );
    await expect(fs.readFile(path.join(root, "CLAUDE.md"), "utf8")).resolves.toContain(
      "kairn brief"
    );
    await expect(
      fs.readFile(path.join(root, ".github", "copilot-instructions.md"), "utf8")
    ).resolves.toContain("kairn reconcile --dry-run");
    await expect(
      fs.readFile(path.join(root, ".cursor", "rules", "kairn.mdc"), "utf8")
    ).resolves.toContain("alwaysApply: true");
    await expect(
      fs.readFile(path.join(root, ".codex", "config.toml"), "utf8")
    ).resolves.toContain("[mcp_servers.kairn]");
    expect(result).toContain("Kairn agent adapters");
  });

  it("reports missing agent adapters", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "kairn-adapters-"));
    await createProjectLayout(root);

    const report = await runAudit(root);

    expect(report.findings.map((finding) => finding.message)).toContain(
      "AGENTS.md is missing the Kairn agent adapter."
    );
  });

  it("scans ordinary fixtures directories unless policy excludes them", async () => {
    const root = await tempProject();
    await fs.mkdir(path.join(root, "fixtures"), { recursive: true });
    await fs.writeFile(
      path.join(root, "fixtures", "example.md"),
      "See [missing](missing.md).\n",
      "utf8"
    );

    const report = await runAudit(root);

    expect(report.findings.map((finding) => finding.message)).toContain(
      "fixtures/example.md links to missing target missing.md."
    );
  });

  it("honors policy exclude_paths", async () => {
    const root = await tempProject();
    await fs.mkdir(path.join(root, "fixtures", "evaluation"), { recursive: true });
    await fs.writeFile(
      path.join(root, "fixtures", "evaluation", "example.md"),
      "See [missing](missing.md).\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(root, ".project", "policy.yaml"),
      "exclude_paths:\n  - fixtures/evaluation/**\n",
      "utf8"
    );

    const report = await runAudit(root);

    expect(report.findings.map((finding) => finding.message)).not.toContain(
      "fixtures/evaluation/example.md links to missing target missing.md."
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

  it("reports and clears baseline through the baseline command", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, "README.md"),
      "See [missing docs](docs/missing.md).\n",
      "utf8"
    );
    await runAudit(root, { acceptBaseline: true });

    const status = await baselineCommand(root, ["status"]);
    const rejectedClear = await baselineCommand(root, ["clear"]);
    const clear = await baselineCommand(root, ["clear"], new Set(["force"]));
    const emptyStatus = await baselineCommand(root, ["status"]);

    expect(status.text).toContain("Baseline:");
    expect(rejectedClear.ok).toBe(false);
    expect(rejectedClear.text).toContain("--force");
    expect(clear.ok).toBe(true);
    expect(clear.data).toEqual({ cleared: true });
    expect(emptyStatus.text).toBe("No baseline recorded.\n");
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
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: source });
    execFileSync("git", ["add", "."], { cwd: source });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: source });

    const clone = await fs.mkdtemp(path.join(os.tmpdir(), "kairn-shallow-"));
    await fs.rm(clone, { recursive: true, force: true });
    execFileSync("git", ["clone", "--depth=1", `file://${source}`, clone]);

    const report = await runAudit(clone);

    expect(report.degraded).toContain(
      "Shallow clone detected; git-correlation detectors are disabled."
    );
  });

  it("reports required project records that are not tracked by git", async () => {
    const root = await tempProject();
    execFileSync("git", ["init", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: root });
    await fs.writeFile(path.join(root, "README.md"), "# Fixture\n", "utf8");
    execFileSync("git", ["add", "README.md"], { cwd: root });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: root });

    const report = await runAudit(root);
    const gitFindings = report.findings.filter(
      (finding) => finding.detectorId === "project-git-state"
    );

    expect(gitFindings.length).toBeGreaterThan(0);
    expect(gitFindings.map((finding) => finding.message)).toContain(
      ".project/project.md exists but is not tracked by git."
    );
  });

  it("reports local baseline and waiver files that are not tracked by git", async () => {
    const root = await tempProject();
    execFileSync("git", ["init", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: root });
    execFileSync("git", ["add", ".project"], { cwd: root });
    execFileSync("git", ["commit", "-m", "project records"], { cwd: root });
    await fs.writeFile(
      path.join(root, ".project", "audit-baseline.json"),
      '{"version":1,"acceptedAt":"2999-01-01T00:00:00.000Z","baselineCommit":"abc","fingerprints":[]}\n',
      "utf8"
    );
    await fs.writeFile(
      path.join(root, ".project", "waivers.json"),
      "[]\n",
      "utf8"
    );

    const report = await runAudit(root);
    const messages = report.findings
      .filter((finding) => finding.detectorId === "project-git-state")
      .map((finding) => finding.message);

    expect(messages).toContain(
      ".project/audit-baseline.json exists but is not tracked by git."
    );
    expect(messages).toContain(".project/waivers.json exists but is not tracked by git.");
  });

  it("reports tracked project records with uncommitted changes", async () => {
    const root = await tempProject();
    execFileSync("git", ["init", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: root });
    execFileSync("git", ["add", ".project"], { cwd: root });
    execFileSync("git", ["commit", "-m", "project records"], { cwd: root });
    await fs.appendFile(
      path.join(root, ".project", "project.md"),
      "\n## Local-only note\n\nNot committed yet.\n",
      "utf8"
    );

    const report = await runAudit(root);
    const messages = report.findings
      .filter((finding) => finding.detectorId === "project-git-state")
      .map((finding) => finding.message);

    expect(messages).toContain(".project/project.md has uncommitted changes.");
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
      id: "KRN-ACTIVE",
      reason: "Still under review.",
      owner: "test",
      expires: "2999-01-01"
    });
    await addWaiver(root, {
      id: "KRN-EXPIRED",
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
      id: "KRN-RENEW",
      reason: "Needs more time.",
      owner: "test",
      expires: "2000-01-01"
    });
    await addWaiver(root, {
      id: "KRN-KEEP",
      reason: "Still active.",
      owner: "test",
      expires: "2999-01-01"
    });

    const renewed = await renewWaiver(root, "KRN-RENEW", "2999-02-01");
    const pruned = await pruneExpiredWaivers(root);
    const waivers = await readWaivers(root);

    expect(renewed?.expires).toBe("2999-02-01");
    expect(pruned.pruned).toHaveLength(0);
    expect(waivers.map((waiver) => waiver.id)).toEqual(["KRN-KEEP", "KRN-RENEW"]);
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
      ["add", "KRN-NOTFOUND"],
      new Map([
        ["reason", "Typo test."],
        ["owner", "test"],
        ["expires", "2999-01-01"]
      ])
    );
    const forced = await waiverCommand(
      root,
      ["add", "KRN-NOTFOUND"],
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

  it("reports active plans with stale git history", async () => {
    const root = await tempProject();
    execFileSync("git", ["init", "-b", "main"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: root });
    await fs.writeFile(
      path.join(root, ".project", "policy.yaml"),
      "plans:\n  stale_after_days: 7\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(root, ".project", "plans", "active", "stale-work.md"),
      "# Stale Work\n\nStatus: Active\n",
      "utf8"
    );
    execFileSync("git", ["add", ".project"], { cwd: root });
    execFileSync("git", ["commit", "-m", "old active plan"], {
      cwd: root,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z"
      }
    });
    await fs.writeFile(path.join(root, "README.md"), "# Fixture\n", "utf8");
    execFileSync("git", ["add", "README.md"], { cwd: root });
    execFileSync("git", ["commit", "-m", "recent repository work"], {
      cwd: root,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2000-02-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2000-02-01T00:00:00Z"
      }
    });

    const report = await runAudit(root);
    const stalePlan = report.findings.find(
      (finding) =>
        finding.detectorId === "plan-state" &&
        finding.title === "Active plan appears stale"
    );

    expect(stalePlan?.message).toContain(
      ".project/plans/active/stale-work.md is active but has no plan-file commits"
    );
    expect(stalePlan?.confidence).toBe("medium");
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
    await expectValidSarif(sarif);
  });

  it("exports SARIF with findings that conforms to the SARIF 2.1.0 schema", async () => {
    const root = await tempProject();
    await fs.writeFile(
      path.join(root, "README.md"),
      "See [missing docs](docs/missing.md).\n",
      "utf8"
    );

    const sarif = formatSarif(await runAudit(root));

    expect(sarif.runs[0].results).toHaveLength(1);
    await expectValidSarif(sarif);
  });

  it("compiles context packets with inclusion reasons and budget accounting", async () => {
    const root = await tempProject();
    await fs.mkdir(path.join(root, "src", "auth"), { recursive: true });
    await fs.writeFile(
      path.join(root, "src", "auth", "policy.ts"),
      "export function authorizationPolicyForObjectDownloads() { return true; }\n",
      "utf8"
    );

    const packet = await compileContextPacket(
      root,
      "Add authorization checks to object downloads",
      { budgetTokens: 800 }
    );

    expect(packet.id).toMatch(/^pkt-/);
    expect(packet.usedTokens).toBeLessThanOrEqual(packet.budgetTokens);
    expect(packet.items.some((item) => item.path === "src/auth/policy.ts")).toBe(true);
    expect(packet.items.every((item) => item.reason.length > 0)).toBe(true);
    expect(packet.exclusions.considered).toBeGreaterThan(packet.items.length);
  });

  it("builds execution briefs and records retrieval feedback", async () => {
    const root = await tempProject();
    const brief = await compileExecutionBrief(
      root,
      "Add CLI command for entitlement policy"
    );

    const feedback = await recordRetrievalFeedback(root, {
      packetId: brief.packetId,
      objective: brief.objective,
      supplied: brief.context.map((item) => item.path),
      touched: ["src/cli.ts"]
    });

    expect(brief.requiredEvidence).toContain("CLI output and exit-code coverage.");
    expect(feedback.touchedWithoutContext).toContain("src/cli.ts");
    await expect(
      fs.readFile(
        path.join(root, ".kairn", "feedback", "retrieval-feedback.jsonl"),
        "utf8"
      )
    ).resolves.toContain(brief.packetId);
  });

  it("records session ledgers and generates handoff/reconcile dry-runs", async () => {
    const root = await tempProject();
    const session = await startSession(root, "Ship context packets");
    await recordSessionEntry(root, {
      file: "src/context.ts",
      command: "npm test",
      test: "npm test",
      passed: true,
      note: "Context packet tests passed."
    });

    const current = await readCurrentSession(root);
    const handoff = await generateHandoff(root);
    const reconcile = await reconcileDryRun(root);

    expect(current?.id).toBe(session.id);
    expect(handoff.text).toContain("Ship context packets");
    expect(reconcile.data.documentationUpdates).toContain("docs/architecture.md");
  });

  it("judges decision-worthy work and can draft proposed ADRs", async () => {
    const root = await tempProject();
    const judgment = judgeIntent("Change authentication policy for downloads");
    const proposed = await proposeAdr(root, {
      title: "Authentication Policy for Downloads",
      objective: "Change authentication policy for downloads",
      write: false
    });

    expect(judgment.classification).toBe("decision-required");
    expect(proposed.path).toMatch(/ADR-0001-authentication-policy-for-downloads\.md$/);
    expect(proposed.text).toContain("Status: Proposed");
    expect(proposed.text).toContain("PENDING");
  });

  it("runs the decision study harness against labeled fixtures", async () => {
    const result = await runDecisionStudy(process.cwd());

    expect(result.fixtureCount).toBeGreaterThan(0);
    expect(result.passed).toBe(true);
  });

  it("runs the packet benchmark against labeled must-include fixtures", async () => {
    const result = await runPacketBenchmark(process.cwd());

    expect(result.caseCount).toBeGreaterThan(0);
    expect(result.passed).toBe(true);
    expect(result.recall).toBe(1);
  });
});

async function tempProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kairn-"));
  await createProjectLayout(root);
  await installAgentAdapters(root);
  return root;
}

async function expectValidSarif(sarif: unknown): Promise<void> {
  const schemaPath = path.join(
    process.cwd(),
    "node_modules",
    "@microsoft",
    "sarif-multitool-ts",
    "assets",
    "sarif-2.1.0.schema.json"
  );
  const schema = JSON.parse(await fs.readFile(schemaPath, "utf8")) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(sarif);

  expect(
    valid,
    JSON.stringify(validate.errors ?? [], null, 2)
  ).toBe(true);
}
