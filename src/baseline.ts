import path from "node:path";
import { PROJECT_DIR } from "./constants.js";
import { readJson, writeJson } from "./fsx.js";
import type { AuditBaseline, Finding, Waiver } from "./types.js";

export function baselinePath(root: string): string {
  return path.join(root, PROJECT_DIR, "audit-baseline.json");
}

export function waiversPath(root: string): string {
  return path.join(root, PROJECT_DIR, "waivers.json");
}

export async function readBaseline(root: string): Promise<AuditBaseline | undefined> {
  return readJson<AuditBaseline>(baselinePath(root));
}

export async function writeBaseline(
  root: string,
  baselineCommit: string,
  findings: Finding[]
): Promise<AuditBaseline> {
  const baseline: AuditBaseline = {
    version: 1,
    acceptedAt: new Date().toISOString(),
    baselineCommit,
    fingerprints: [...new Set(findings.map((finding) => finding.fingerprint))].sort()
  };

  await writeJson(baselinePath(root), baseline);
  return baseline;
}

export async function readWaivers(root: string): Promise<Waiver[]> {
  return (await readJson<Waiver[]>(waiversPath(root))) ?? [];
}

export function applyFindingStatuses(
  findings: Finding[],
  baseline: AuditBaseline | undefined,
  waivers: Waiver[],
  now = new Date()
): Finding[] {
  const baselineFingerprints = new Set(baseline?.fingerprints ?? []);
  const activeWaivers = waivers.filter((waiver) => {
    const expires = Date.parse(waiver.expires);
    return Number.isFinite(expires) && expires >= now.getTime();
  });

  return findings.map((finding) => {
    const isWaived = activeWaivers.some(
      (waiver) =>
        waiver.fingerprint === finding.fingerprint || waiver.id === finding.id
    );

    if (isWaived) {
      return { ...finding, status: "waived" };
    }

    if (baselineFingerprints.has(finding.fingerprint)) {
      return { ...finding, status: "baseline" };
    }

    return { ...finding, status: "new" };
  });
}
