import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAudit, checkDriftBudget } from "../src/audit.js";
import { createProjectLayout } from "../src/layout.js";

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
});

async function tempProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "project-steward-"));
  await createProjectLayout(root);
  return root;
}
