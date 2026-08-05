import path from "node:path";
import { PROJECT_DIR } from "../constants.js";
import { createFinding } from "../finding.js";
import { requiredProjectFileStatus } from "../layout.js";
import type { Detector } from "../types.js";

export const projectLayoutDetector: Detector = {
  id: "project-layout",
  description: "Checks for the required committed .project files.",
  async run({ root }) {
    const status = await requiredProjectFileStatus(root);

    return status.missing.map((missing) =>
      createFinding({
        detectorId: "project-layout",
        title: "Required project record is missing",
        message: `${path.join(PROJECT_DIR, missing)} is missing.`,
        location: {
          path: PROJECT_DIR
        },
        confidence: "high",
        deterministic: true,
        source: "parsed",
        evidence: [
          {
            kind: "file",
            path: path.join(PROJECT_DIR, missing),
            detail: "Required project record was not found on disk."
          }
        ],
        impact:
          "Agents and maintainers may miss project intent, constraints, decisions, or handoff state.",
        recommendedAction: `Run steward init or create ${path.join(PROJECT_DIR, missing)}.`,
        reversibility: "trivial",
        requiredApproval: "none",
        explanation:
          "The project-layout detector compares the repository against the required .project storage layout. Missing files are high-confidence because the check is simple path existence."
      })
    );
  }
};
