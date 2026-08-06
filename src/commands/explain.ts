import { findFindingById } from "../audit.js";

export async function explainFindingCommand(
  root: string,
  id: string | undefined
): Promise<{ found: boolean; text: string }> {
  if (!id) {
    return {
      found: false,
      text: "Usage: kairn explain finding <id>\n"
    };
  }

  const finding = await findFindingById(root, id);

  if (!finding) {
    return {
      found: false,
      text: `Finding not found: ${id}\n`
    };
  }

  const evidence = finding.evidence
    .map((item) => `  - ${item.kind}${item.path ? ` ${item.path}` : ""}: ${item.detail}`)
    .join("\n");

  return {
    found: true,
    text: [
      `${finding.id}: ${finding.title}`,
      `detector: ${finding.detectorId}`,
      `confidence: ${finding.confidence}`,
      `deterministic: ${finding.deterministic ? "yes" : "no"}`,
      `source: ${finding.source}`,
      "",
      finding.explanation,
      "",
      "evidence:",
      evidence,
      "",
      `impact: ${finding.impact}`,
      `recommended action: ${finding.recommendedAction}`
    ].join("\n") + "\n"
  };
}
