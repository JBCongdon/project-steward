import { runAudit } from "../audit.js";

export async function statusCommand(root: string): Promise<string> {
  const report = await runAudit(root);
  const newFindings = report.findings.filter((finding) => finding.status === "new");

  return [
    "Kairn status",
    `commit: ${report.baselineCommit}`,
    `baseline: ${
      report.baseline
        ? `${report.baseline.findingCount} finding(s), ${report.baseline.ageDays} day(s) old at ${report.baseline.baselineCommit}`
        : "none"
    }`,
    `new findings: ${newFindings.length}`,
    `waivers: ${report.waivers.active} active, ${report.waivers.expired} expired`,
    `degraded coverage: ${report.degraded.length}`,
    `governance coverage: ${report.coverage.requiredProjectFilesPresent}/${report.coverage.requiredProjectFilesTotal} required project files`
  ].join("\n") + "\n";
}
