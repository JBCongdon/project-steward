export type Confidence = "high" | "medium" | "low";

export type FindingStatus = "new" | "baseline" | "waived";

export interface Evidence {
  kind: "file" | "git" | "policy" | "scan";
  path?: string;
  detail: string;
}

export interface Finding {
  id: string;
  fingerprint: string;
  detectorId: string;
  title: string;
  message: string;
  location?: {
    path: string;
    line?: number;
    column?: number;
  };
  confidence: Confidence;
  deterministic: boolean;
  source: "parsed" | "git-derived" | "inferred" | "user-asserted";
  evidence: Evidence[];
  impact: string;
  recommendedAction: string;
  reversibility: "trivial" | "moderate" | "hard";
  requiredApproval: "none" | "human";
  status: FindingStatus;
  explanation: string;
}

export interface DetectorContext {
  root: string;
}

export interface Detector {
  id: string;
  description: string;
  run(context: DetectorContext): Promise<Finding[]>;
}

export interface StewardPolicy {
  detectors: Record<string, boolean>;
  drift_budget: {
    high_confidence_findings_max: number;
    medium_confidence_findings_max: number;
  };
  plans: {
    stale_after_days: number;
  };
}

export interface AuditBaseline {
  version: 1;
  acceptedAt: string;
  baselineCommit: string;
  fingerprints: string[];
}

export interface Waiver {
  fingerprint?: string;
  id?: string;
  reason: string;
  owner: string;
  expires: string;
}

export interface AuditReport {
  version: 1;
  generatedAt: string;
  root: string;
  baselineCommit: string;
  degraded: string[];
  coverage: {
    markdownFilesScanned: number;
    decisions: number;
    activePlans: number;
    requiredProjectFilesPresent: number;
    requiredProjectFilesTotal: number;
  };
  baseline?: {
    acceptedAt: string;
    baselineCommit: string;
    findingCount: number;
    ageDays: number;
  };
  waivers: {
    total: number;
    active: number;
    expired: number;
  };
  findings: Finding[];
}

export interface ProjectIndex {
  version: 1;
  generatedAt: string;
  root: string;
  baselineCommit: string;
  documents: Array<{ path: string; kind: string }>;
  decisions: Array<{ path: string; status: string }>;
  plans: Array<{ path: string; status: string }>;
}
