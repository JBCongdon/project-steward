import { DETECTORS } from "../detectors/index.js";
import { loadPolicy } from "../policy.js";

export interface DetectorSummary {
  id: string;
  enabled: boolean;
  description: string;
}

export async function detectorsCommand(root: string): Promise<{
  text: string;
  data: DetectorSummary[];
}> {
  const policy = await loadPolicy(root);
  const data = DETECTORS.map((detector) => ({
    id: detector.id,
    enabled: policy.detectors[detector.id] !== false,
    description: detector.description
  })).sort((left, right) => left.id.localeCompare(right.id));

  const lines = ["Kairn detectors"];

  for (const detector of data) {
    lines.push("");
    lines.push(`${detector.enabled ? "enabled " : "disabled"} ${detector.id}`);
    lines.push(`  ${detector.description}`);
  }

  return {
    text: `${lines.join("\n")}\n`,
    data
  };
}
