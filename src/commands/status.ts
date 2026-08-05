import { readBaseline } from "../baseline.js";
import { runAudit } from "../audit.js";

export async function statusCommand(root: string): Promise<string> {
  const [baseline, report] = await Promise.all([readBaseline(root), runAudit(root)]);
  const newFindings = report.findings.filter((finding) => finding.status === "new");

  return [
    "Project Steward status",
    `commit: ${report.baselineCommit}`,
    `baseline: ${baseline ? `${baseline.fingerprints.length} finding(s) accepted at ${baseline.baselineCommit}` : "none"}`,
    `new findings: ${newFindings.length}`,
    `degraded coverage: ${report.degraded.length}`,
    `governance coverage: ${report.coverage.requiredProjectFilesPresent}/${report.coverage.requiredProjectFilesTotal} required project files`
  ].join("\n") + "\n";
}
