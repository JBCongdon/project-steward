import fs from "node:fs/promises";
import path from "node:path";
import { createFinding } from "../finding.js";
import { exists, toPosix, walkFiles } from "../fsx.js";
import type { Detector, Finding } from "../types.js";

const LINK_PATTERN = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export const markdownLinksDetector: Detector = {
  id: "markdown-links",
  description: "Checks relative Markdown links for missing targets.",
  async run({ root }) {
    const files = await walkFiles(root, { extensions: [".md"], includeHidden: true });
    const findings: Finding[] = [];

    for (const relativeFile of files) {
      const absoluteFile = path.join(root, relativeFile);
      const contents = await fs.readFile(absoluteFile, "utf8");
      const lines = contents.split(/\r?\n/);

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        LINK_PATTERN.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = LINK_PATTERN.exec(line))) {
          const rawTarget = stripAngleBrackets(match[1]);
          const target = stripAnchor(rawTarget);

          if (!target || shouldSkipTarget(target)) {
            continue;
          }

          const decoded = safeDecode(target);
          const resolved = path.resolve(path.dirname(absoluteFile), decoded);

          if (await exists(resolved)) {
            continue;
          }

          const displayFile = toPosix(relativeFile);
          findings.push(
            createFinding({
              detectorId: "markdown-links",
              title: "Markdown link target does not exist",
              message: `${displayFile} links to missing target ${rawTarget}.`,
              location: {
                path: displayFile,
                line: lineIndex + 1,
                column: match.index + 1
              },
              confidence: "high",
              deterministic: true,
              source: "parsed",
              evidence: [
                {
                  kind: "file",
                  path: displayFile,
                  detail: `Relative Markdown link target ${rawTarget} did not resolve from this file.`
                }
              ],
              impact:
                "A future maintainer or coding agent may follow stale project documentation.",
              recommendedAction:
                "Update the link target, restore the referenced file, or remove the stale reference.",
              reversibility: "trivial",
              requiredApproval: "none",
              explanation:
                "The markdown-links detector scans Markdown links, ignores URLs and same-page anchors, resolves relative targets from the containing file, and reports targets that are absent on disk."
            })
          );
        }
      }
    }

    return findings;
  }
};

export async function countMarkdownFiles(root: string): Promise<number> {
  return (await walkFiles(root, { extensions: [".md"], includeHidden: true })).length;
}

function shouldSkipTarget(target: string): boolean {
  return (
    target.startsWith("#") ||
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.includes("://")
  );
}

function stripAnchor(target: string): string {
  const [withoutAnchor] = target.split("#");
  return withoutAnchor;
}

function stripAngleBrackets(target: string): string {
  if (target.startsWith("<") && target.endsWith(">")) {
    return target.slice(1, -1);
  }

  return target;
}

function safeDecode(target: string): string {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}
