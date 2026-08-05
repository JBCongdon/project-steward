import { VERSION } from "./constants.js";
import type { AuditReport, Confidence, Finding } from "./types.js";

interface SarifLog {
  version: "2.1.0";
  $schema: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      informationUri: string;
      version: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
  invocations: Array<{
    executionSuccessful: boolean;
    properties: Record<string, unknown>;
  }>;
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  help: { text: string };
  properties: Record<string, unknown>;
}

interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations?: SarifLocation[];
  partialFingerprints: {
    stewardFingerprint: string;
  };
  properties: Record<string, unknown>;
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region?: {
      startLine?: number;
      startColumn?: number;
    };
  };
}

export function formatSarif(report: AuditReport): SarifLog {
  const findings = report.findings.filter((finding) => finding.status === "new");
  const ruleIds = [...new Set(findings.map((finding) => finding.detectorId))].sort();
  const rules = ruleIds.map((ruleId) => ruleFor(ruleId, findings));
  const ruleIndexById = new Map(
    rules.map((rule, index) => [rule.id, index] as const)
  );

  return {
    version: "2.1.0",
    $schema:
      "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "Project Steward",
            informationUri: "https://github.com/JBCongdon/project-steward",
            version: VERSION,
            rules
          }
        },
        results: findings.map((finding) => resultFor(finding, ruleIndexById)),
        invocations: [
          {
            executionSuccessful: report.degraded.length === 0,
            properties: {
              baselineCommit: report.baselineCommit,
              generatedAt: report.generatedAt,
              degraded: report.degraded,
              coverage: report.coverage,
              baseline: report.baseline,
              waivers: report.waivers,
              exportScope: "new-unwaived-findings"
            }
          }
        ]
      }
    ]
  };
}

function ruleFor(ruleId: string, findings: Finding[]): SarifRule {
  const example = findings.find((finding) => finding.detectorId === ruleId);

  return {
    id: ruleId,
    name: ruleId,
    shortDescription: {
      text: example?.title ?? ruleId
    },
    fullDescription: {
      text: example?.explanation ?? `Project Steward detector ${ruleId}.`
    },
    help: {
      text:
        example?.recommendedAction ??
        "Inspect the Project Steward finding and associated evidence."
    },
    properties: {
      deterministic: example?.deterministic ?? true,
      source: example?.source ?? "parsed"
    }
  };
}

function resultFor(
  finding: Finding,
  ruleIndexById: Map<string, number>
): SarifResult {
  return {
    ruleId: finding.detectorId,
    ruleIndex: ruleIndexById.get(finding.detectorId) ?? 0,
    level: levelFor(finding.confidence),
    message: {
      text: `${finding.title}: ${finding.message}`
    },
    locations: finding.location ? [locationFor(finding)] : undefined,
    partialFingerprints: {
      stewardFingerprint: finding.fingerprint
    },
    properties: {
      stewardId: finding.id,
      confidence: finding.confidence,
      status: finding.status,
      impact: finding.impact,
      recommendedAction: finding.recommendedAction,
      reversibility: finding.reversibility,
      requiredApproval: finding.requiredApproval,
      evidence: finding.evidence
    }
  };
}

function locationFor(finding: Finding): SarifLocation {
  return {
    physicalLocation: {
      artifactLocation: {
        uri: finding.location?.path ?? "."
      },
      region:
        finding.location?.line || finding.location?.column
          ? {
              startLine: finding.location?.line,
              startColumn: finding.location?.column
            }
          : undefined
    }
  };
}

function levelFor(confidence: Confidence): "error" | "warning" | "note" {
  if (confidence === "high") {
    return "warning";
  }

  return "note";
}
