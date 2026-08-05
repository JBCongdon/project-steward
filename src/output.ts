import type { AuditReport, Finding, ProjectIndex } from "./types.js";

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function formatAudit(report: AuditReport): string {
  const lines: string[] = [];
  const newCount = report.findings.filter((finding) => finding.status === "new").length;
  const baselineCount = report.findings.filter(
    (finding) => finding.status === "baseline"
  ).length;
  const waivedCount = report.findings.filter(
    (finding) => finding.status === "waived"
  ).length;

  lines.push("Project Steward audit");
  lines.push(`commit: ${report.baselineCommit}`);
  lines.push(
    `coverage: ${report.coverage.markdownFilesScanned} markdown files, ${report.coverage.decisions} decisions, ${report.coverage.activePlans} active plans`
  );
  lines.push(
    `baseline: ${
      report.baseline
        ? `${report.baseline.findingCount} finding(s), ${report.baseline.ageDays} day(s) old`
        : "none"
    }`
  );
  lines.push(
    `waivers: ${report.waivers.active} active, ${report.waivers.expired} expired`
  );

  if (report.degraded.length > 0) {
    lines.push("");
    lines.push("degraded:");
    for (const degraded of report.degraded) {
      lines.push(`  - ${degraded}`);
    }
  }

  lines.push("");
  lines.push(
    `findings: ${newCount} new, ${baselineCount} baseline, ${waivedCount} waived`
  );

  for (const finding of report.findings) {
    lines.push("");
    lines.push(formatFinding(finding));
  }

  return `${lines.join("\n")}\n`;
}

export function formatFinding(finding: Finding): string {
  const location = finding.location
    ? `${finding.location.path}${finding.location.line ? `:${finding.location.line}` : ""}`
    : "repository";

  return [
    `[${finding.status}] ${finding.id} ${finding.title}`,
    `  detector: ${finding.detectorId}`,
    `  confidence: ${finding.confidence}`,
    `  location: ${location}`,
    `  message: ${finding.message}`,
    `  action: ${finding.recommendedAction}`
  ].join("\n");
}

export function formatIndex(index: ProjectIndex): string {
  return [
    "Project Steward index rebuilt",
    `commit: ${index.baselineCommit}`,
    `documents: ${index.documents.length}`,
    `decisions: ${index.decisions.length}`,
    `plans: ${index.plans.length}`
  ].join("\n");
}
