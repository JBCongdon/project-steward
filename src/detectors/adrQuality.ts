import fs from "node:fs/promises";
import path from "node:path";
import { createFinding } from "../finding.js";
import { exists, toPosix, walkFiles } from "../fsx.js";
import type { Detector, Finding } from "../types.js";

const REQUIRED_SECTIONS = ["Context", "Decision", "Consequences", "Rollback"];

export const adrQualityDetector: Detector = {
  id: "adr-quality",
  description: "Checks ADR files for required status and decision sections.",
  async run({ root }) {
    const decisionsDir = path.join(root, ".project", "decisions");
    if (!(await exists(decisionsDir))) {
      return [];
    }

    const files = (await walkFiles(decisionsDir, {
      extensions: [".md"],
      includeHidden: true
    })).filter((relative) => /^ADR-\d{4}-.+\.md$/.test(path.basename(relative)));

    const findings: Finding[] = [];

    for (const relative of files) {
      const absolute = path.join(decisionsDir, relative);
      const displayPath = toPosix(path.join(".project", "decisions", relative));
      const contents = await fs.readFile(absolute, "utf8");
      const lines = contents.split(/\r?\n/);

      if (!/^Status:\s*\S+/im.test(contents)) {
        findings.push(
          createFinding({
            detectorId: "adr-quality",
            title: "ADR is missing status",
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
              "Agents and maintainers cannot tell whether the decision is proposed, accepted, superseded, or retrospective.",
            recommendedAction:
              "Add a Status field such as `Status: Proposed`, `Status: Accepted`, or `Status: Superseded`.",
            reversibility: "trivial",
            requiredApproval: "none",
            explanation:
              "The adr-quality detector scans ADR files named ADR-NNNN-*.md and requires an explicit Status field so decision state is machine-readable."
          })
        );
      }

      for (const section of REQUIRED_SECTIONS) {
        if (hasHeading(lines, section)) {
          continue;
        }

        findings.push(
          createFinding({
            detectorId: "adr-quality",
            title: "ADR is missing required section",
            message: `${displayPath} is missing the ${section} section.`,
            location: { path: displayPath },
            confidence: "high",
            deterministic: true,
            source: "parsed",
            evidence: [
              {
                kind: "file",
                path: displayPath,
                detail: `No Markdown heading named ${section} was found.`
              }
            ],
            impact:
              "The decision record may be harder to evaluate, revisit, or reverse safely.",
            recommendedAction: `Add a ## ${section} section to the ADR.`,
            reversibility: "trivial",
            requiredApproval: "none",
            explanation:
              "The adr-quality detector checks ADR files for the minimal sections Project Steward needs for future retrieval, consequence tracking, and rollback reasoning."
          })
        );
      }
    }

    return findings;
  }
};

function hasHeading(lines: string[], heading: string): boolean {
  const normalized = heading.toLowerCase();
  return lines.some((line) => {
    const match = line.match(/^#{2,6}\s+(.+?)\s*#*$/);
    return match?.[1]?.trim().toLowerCase() === normalized;
  });
}
