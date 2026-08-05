import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAudit, checkDriftBudget } from "../src/audit.js";
import { addWaiver } from "../src/baseline.js";
import { createProjectLayout } from "../src/layout.js";
import { formatSarif } from "../src/sarif.js";

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
  });

  it("fails check when coverage is degraded outside git", async () => {
    const root = await tempProject();
    const result = await checkDriftBudget(root);

    expect(result.passed).toBe(false);
    expect(result.report.degraded.length).toBeGreaterThan(0);
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
