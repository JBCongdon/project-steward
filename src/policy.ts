import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { PROJECT_DIR } from "./constants.js";
import { exists } from "./fsx.js";
import type { StewardPolicy } from "./types.js";

export const DEFAULT_POLICY: StewardPolicy = {
  exclude_paths: [],
  detectors: {
    "project-layout": true,
    "project-git-state": true,
    "policy-config": true,
    "markdown-links": true,
    "adr-quality": true,
    "plan-state": true
  },
  drift_budget: {
    high_confidence_findings_max: 0,
    medium_confidence_findings_max: 15
  },
  plans: {
    stale_after_days: 30
  }
};

export async function loadPolicy(root: string): Promise<StewardPolicy> {
  const policyPath = path.join(root, PROJECT_DIR, "policy.yaml");

  if (!(await exists(policyPath))) {
    return DEFAULT_POLICY;
  }

  const raw = await fs.readFile(policyPath, "utf8");
  let parsed: Partial<StewardPolicy> | undefined;

  try {
    parsed = YAML.parse(raw) as Partial<StewardPolicy> | undefined;
  } catch {
    return DEFAULT_POLICY;
  }

  return {
    exclude_paths: parsed?.exclude_paths ?? DEFAULT_POLICY.exclude_paths,
    detectors: {
      ...DEFAULT_POLICY.detectors,
      ...(parsed?.detectors ?? {})
    },
    drift_budget: {
      ...DEFAULT_POLICY.drift_budget,
      ...(parsed?.drift_budget ?? {})
    },
    plans: {
      ...DEFAULT_POLICY.plans,
      ...(parsed?.plans ?? {})
    }
  };
}

export function defaultPolicyYaml(): string {
  return YAML.stringify(DEFAULT_POLICY);
}
