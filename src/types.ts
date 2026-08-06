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
  excludedPaths: string[];
}

export interface Detector {
  id: string;
  description: string;
  run(context: DetectorContext): Promise<Finding[]>;
}

export interface KairnPolicy {
  exclude_paths: string[];
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

export interface ContextPacketItem {
  path: string;
  kind: string;
  score: number;
  estimatedTokens: number;
  reason: string;
  excerpt: string;
}

export interface ContextPacket {
  version: 1;
  id: string;
  objective: string;
  root: string;
  baselineCommit: string;
  budgetTokens: number;
  usedTokens: number;
  items: ContextPacketItem[];
  droppedByBudget: ContextPacketItem[];
  exclusions: {
    considered: number;
    included: number;
    droppedByBudget: number;
    nearestMisses: ContextPacketItem[];
  };
}

export interface ExecutionBrief {
  version: 1;
  objective: string;
  packetId: string;
  baselineCommit: string;
  context: Array<{ path: string; reason: string }>;
  requiredEvidence: string[];
  documentationObligations: string[];
  prohibitedActions: string[];
  definitionOfDone: string[];
}

export interface RetrievalFeedback {
  version: 1;
  recordedAt: string;
  packetId: string;
  objective?: string;
  supplied: string[];
  touched: string[];
  ignoredSupplied: string[];
  touchedWithoutContext: string[];
}

export interface SessionLedger {
  version: 1;
  id: string;
  objective: string;
  startedAt: string;
  updatedAt: string;
  filesChanged: string[];
  commandsRun: string[];
  testsRun: Array<{ command: string; passed?: boolean }>;
  assumptions: string[];
  deferred: string[];
  notes: string[];
  closedAt?: string;
}

export interface IntentJudgment {
  version: 1;
  objective: string;
  classification: "routine" | "plan-required" | "decision-required";
  confidence: Confidence;
  reasons: string[];
  recommendedAction: string;
  adrRecommended: boolean;
}

export interface DecisionStudyResult {
  version: 1;
  fixtureCount: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  naiveF1: number;
  passed: boolean;
}

export interface PacketBenchmarkCaseResult {
  name: string;
  objective: string;
  packetId: string;
  required: string[];
  included: string[];
  missing: string[];
  itemCount: number;
  recall: number;
  passed: boolean;
}

export interface PacketBenchmarkResult {
  version: 1;
  caseCount: number;
  totalRequired: number;
  totalIncludedRequired: number;
  recall: number;
  averagePacketItems: number;
  targetRecall: number;
  passed: boolean;
  cases: PacketBenchmarkCaseResult[];
}
