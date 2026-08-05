import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { createFinding } from "../finding.js";
import { exists } from "../fsx.js";
import { DEFAULT_POLICY } from "../policy.js";
import type { Detector, Finding } from "../types.js";

const POLICY_PATH = ".project/policy.yaml";

export const policyConfigDetector: Detector = {
  id: "policy-config",
  description: "Checks Project Steward policy configuration for invalid values.",
  async run({ root }) {
    const absolute = path.join(root, POLICY_PATH);
    if (!(await exists(absolute))) {
      return [];
    }

    const raw = await fs.readFile(absolute, "utf8");
    let parsed: unknown;

    try {
      parsed = YAML.parse(raw);
    } catch (error) {
      return [
        createFinding({
          detectorId: "policy-config",
          title: "Policy file is not valid YAML",
          message: `${POLICY_PATH} could not be parsed as YAML.`,
          location: { path: POLICY_PATH },
          confidence: "high",
          deterministic: true,
          source: "parsed",
          evidence: [
            {
              kind: "policy",
              path: POLICY_PATH,
              detail: error instanceof Error ? error.message : "YAML parser failed."
            }
          ],
          impact:
            "Project Steward must fall back to default policy, so configured detector and drift-budget behavior is unavailable.",
          recommendedAction: "Fix the YAML syntax in .project/policy.yaml.",
          reversibility: "trivial",
          requiredApproval: "none",
          explanation:
            "The policy-config detector parses .project/policy.yaml before validating known fields. Invalid YAML is high-confidence because the parser cannot construct a policy document."
        })
      ];
    }

    if (!isRecord(parsed)) {
      return [invalidValueFinding("Policy root must be a mapping/object.", "policy root")];
    }

    return [
      ...validateDetectors(parsed.detectors),
      ...validateBudget(parsed.drift_budget),
      ...validatePlans(parsed.plans)
    ];
  }
};

function validateDetectors(value: unknown): Finding[] {
  if (value === undefined) {
    return [];
  }

  if (!isRecord(value)) {
    return [invalidValueFinding("detectors must be a mapping of detector id to boolean.", "detectors")];
  }

  const findings: Finding[] = [];
  const known = new Set(Object.keys(DEFAULT_POLICY.detectors));

  for (const [key, enabled] of Object.entries(value)) {
    if (!known.has(key)) {
      findings.push(
        invalidValueFinding(`detectors.${key} is not a known detector id.`, `detectors.${key}`)
      );
      continue;
    }

    if (typeof enabled !== "boolean") {
      findings.push(
        invalidValueFinding(`detectors.${key} must be true or false.`, `detectors.${key}`)
      );
    }
  }

  return findings;
}

function validateBudget(value: unknown): Finding[] {
  if (value === undefined) {
    return [];
  }

  if (!isRecord(value)) {
    return [invalidValueFinding("drift_budget must be a mapping/object.", "drift_budget")];
  }

  return [
    ...validateNonNegativeInteger(
      value.high_confidence_findings_max,
      "drift_budget.high_confidence_findings_max"
    ),
    ...validateNonNegativeInteger(
      value.medium_confidence_findings_max,
      "drift_budget.medium_confidence_findings_max"
    )
  ];
}

function validatePlans(value: unknown): Finding[] {
  if (value === undefined) {
    return [];
  }

  if (!isRecord(value)) {
    return [invalidValueFinding("plans must be a mapping/object.", "plans")];
  }

  return validatePositiveInteger(value.stale_after_days, "plans.stale_after_days");
}

function validateNonNegativeInteger(value: unknown, field: string): Finding[] {
  if (value === undefined) {
    return [];
  }

  return Number.isInteger(value) && Number(value) >= 0
    ? []
    : [invalidValueFinding(`${field} must be a non-negative integer.`, field)];
}

function validatePositiveInteger(value: unknown, field: string): Finding[] {
  if (value === undefined) {
    return [];
  }

  return Number.isInteger(value) && Number(value) > 0
    ? []
    : [invalidValueFinding(`${field} must be a positive integer.`, field)];
}

function invalidValueFinding(message: string, field: string): Finding {
  return createFinding({
    detectorId: "policy-config",
    title: "Policy value is invalid",
    message,
    location: { path: POLICY_PATH },
    confidence: "high",
    deterministic: true,
    source: "parsed",
    evidence: [
      {
        kind: "policy",
        path: POLICY_PATH,
        detail: `Invalid policy field: ${field}.`
      }
    ],
    impact:
      "Policy disagreement can disable detectors, weaken drift budgets, or make CI behavior differ from project intent.",
    recommendedAction: "Update .project/policy.yaml to match the supported policy schema.",
    reversibility: "trivial",
    requiredApproval: "none",
    explanation:
      "The policy-config detector validates known Project Steward policy fields and reports unsupported or mistyped values as deterministic findings."
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
