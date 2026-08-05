import fs from "node:fs/promises";
import path from "node:path";
import { createFinding } from "../finding.js";
import { exists, toPosix, walkFiles } from "../fsx.js";
import type { Detector, Finding } from "../types.js";

const PLAN_DIRECTORIES = [
  { relative: ".project/plans/active", expectedStatus: "active" },
  { relative: ".project/plans/completed", expectedStatus: "completed" },
  { relative: ".project/plans/abandoned", expectedStatus: "abandoned" }
];

export const planStateDetector: Detector = {
  id: "plan-state",
  description: "Checks plan directory and Status field consistency.",
  async run({ root }) {
    const findings: Finding[] = [];

    for (const planDirectory of PLAN_DIRECTORIES) {
      const absoluteDirectory = path.join(root, planDirectory.relative);
      if (!(await exists(absoluteDirectory))) {
        continue;
      }

      const files = await walkFiles(absoluteDirectory, {
        extensions: [".md"],
        includeHidden: true
      });

      for (const relative of files) {
        const absolute = path.join(absoluteDirectory, relative);
        const displayPath = toPosix(path.join(planDirectory.relative, relative));
        const contents = await fs.readFile(absolute, "utf8");
        const status = readStatus(contents);

        if (!status) {
          findings.push(missingStatusFinding(displayPath));
          continue;
        }

        if (normalizeStatus(status) !== planDirectory.expectedStatus) {
          findings.push(
            createFinding({
              detectorId: "plan-state",
              title: "Plan status does not match directory",
              message: `${displayPath} is in ${planDirectory.relative} but declares Status: ${status}.`,
              location: { path: displayPath },
              confidence: "high",
              deterministic: true,
              source: "parsed",
              evidence: [
                {
                  kind: "file",
                  path: displayPath,
                  detail: `Plan directory implies ${planDirectory.expectedStatus}; Status field says ${status}.`
                }
              ],
              impact:
                "Agents and maintainers may treat completed, abandoned, or active work incorrectly.",
              recommendedAction:
                "Move the plan to the matching directory or update its Status field.",
              reversibility: "trivial",
              requiredApproval: "none",
              explanation:
                "The plan-state detector scans committed plan files and compares their Status field with the lifecycle implied by their directory."
            })
          );
        }
      }
    }

    return findings;
  }
};

function missingStatusFinding(displayPath: string): Finding {
  return createFinding({
    detectorId: "plan-state",
    title: "Plan is missing status",
    message: `${displayPath} does not declare a Status field.`,
    location: { path: displayPath },
    confidence: "high",
    deterministic: true,
    source: "parsed",
    evidence: [
      {
        kind: "file",
        path: displayPath,
        detail: "No line matching `Status: <value>` was found."
      }
    ],
    impact:
      "Agents and maintainers cannot tell whether the plan is active, completed, abandoned, blocked, or superseded.",
    recommendedAction: "Add a Status field to the plan.",
    reversibility: "trivial",
    requiredApproval: "none",
    explanation:
      "The plan-state detector requires an explicit Status field so plan lifecycle state is machine-readable."
  });
}

function readStatus(contents: string): string | undefined {
  return contents.match(/^Status:\s*(.+)$/im)?.[1]?.trim();
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().split(/\s+/)[0];
}
