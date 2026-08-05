import path from "node:path";
import { REQUIRED_PROJECT_FILES } from "./constants.js";
import { readBaseline, readWaivers, writeBaseline, applyFindingStatuses } from "./baseline.js";
import { DETECTORS } from "./detectors/index.js";
import { countMarkdownFiles } from "./detectors/markdownLinks.js";
import { exists, walkFiles } from "./fsx.js";
import { getGitInfo } from "./git.js";
import { requiredProjectFileStatus } from "./layout.js";
import { loadPolicy } from "./policy.js";
import type { AuditReport, Finding } from "./types.js";

export interface AuditOptions {
  acceptBaseline?: boolean;
}

export async function runAudit(
  root: string,
  options: AuditOptions = {}
): Promise<AuditReport> {
  const git = getGitInfo(root);
  const degraded = git.degraded ? [git.degraded] : [];
  const policy = await loadPolicy(root);
  const detectorFindings: Finding[] = [];

  for (const detector of DETECTORS) {
    if (policy.detectors[detector.id] === false) {
      degraded.push(`Detector ${detector.id} is disabled by policy.`);
      continue;
    }

    detectorFindings.push(...(await detector.run({ root })));
  }

  let baseline = await readBaseline(root);
  const waivers = await readWaivers(root);

  if (options.acceptBaseline) {
    baseline = await writeBaseline(root, git.commit, detectorFindings);
  }

  const findings = applyFindingStatuses(detectorFindings, baseline, waivers);
  const projectStatus = await requiredProjectFileStatus(root);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    root,
    baselineCommit: git.commit,
    degraded,
    coverage: {
      markdownFilesScanned: await countMarkdownFiles(root),
      decisions: await countMarkdownRecords(root, ".project/decisions"),
      activePlans: await countMarkdownRecords(root, ".project/plans/active"),
      requiredProjectFilesPresent: projectStatus.present.length,
      requiredProjectFilesTotal: REQUIRED_PROJECT_FILES.length
    },
    findings
  };
}

export function newUnwaivedFindings(report: AuditReport): Finding[] {
  return report.findings.filter((finding) => finding.status === "new");
}

export async function checkDriftBudget(root: string): Promise<{
  passed: boolean;
  report: AuditReport;
  summary: string;
}> {
  const policy = await loadPolicy(root);
  const report = await runAudit(root);
  const newFindings = newUnwaivedFindings(report);
  const high = newFindings.filter((finding) => finding.confidence === "high").length;
  const medium = newFindings.filter((finding) => finding.confidence === "medium").length;

  const highBudget = policy.drift_budget.high_confidence_findings_max;
  const mediumBudget = policy.drift_budget.medium_confidence_findings_max;
  const passed = high <= highBudget && medium <= mediumBudget && report.degraded.length === 0;

  const degradedSuffix =
    report.degraded.length > 0
      ? `; degraded coverage: ${report.degraded.length} condition(s)`
      : "";

  return {
    passed,
    report,
    summary: `new findings: high=${high}/${highBudget}, medium=${medium}/${mediumBudget}${degradedSuffix}`
  };
}

export async function findFindingById(
  root: string,
  id: string
): Promise<Finding | undefined> {
  const report = await runAudit(root);
  return report.findings.find(
    (finding) => finding.id === id || finding.fingerprint === id
  );
}

async function countMarkdownRecords(root: string, relativeDirectory: string): Promise<number> {
  const absolute = path.join(root, relativeDirectory);
  if (!(await exists(absolute))) {
    return 0;
  }

  return (await walkFiles(absolute, { extensions: [".md"], includeHidden: true })).length;
}
