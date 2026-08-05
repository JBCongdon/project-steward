import fs from "node:fs/promises";
import path from "node:path";
import { createFinding } from "../finding.js";
import { exists, toPosix, walkFiles } from "../fsx.js";
import type { Detector, Finding } from "../types.js";

const LINK_PATTERN = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export const markdownLinksDetector: Detector = {
  id: "markdown-links",
  description: "Checks relative Markdown links for missing files and anchors.",
  async run({ root, excludedPaths }) {
    const files = await walkFiles(root, {
      extensions: [".md"],
      includeHidden: true,
      exclude: excludedPaths
    });
    const findings: Finding[] = [];
    const anchorCache = new Map<string, Promise<Set<string>>>();

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
          const target = parseTarget(rawTarget);

          if (shouldSkipTarget(rawTarget)) {
            continue;
          }

          const decodedPath = safeDecode(target.path);
          const resolved = decodedPath
            ? path.resolve(path.dirname(absoluteFile), decodedPath)
            : absoluteFile;

          if (!(await exists(resolved))) {
            const displayFile = toPosix(relativeFile);
            findings.push(missingTargetFinding(displayFile, rawTarget, lineIndex, match.index));
            continue;
          }

          if (!target.anchor || path.extname(resolved) !== ".md") {
            continue;
          }

          const anchors = await getAnchors(resolved, anchorCache);
          const decodedAnchor = safeDecode(target.anchor).toLowerCase();

          if (!anchors.has(decodedAnchor)) {
            const displayFile = toPosix(relativeFile);
            findings.push(
              createFinding({
                detectorId: "markdown-links",
                title: "Markdown link anchor does not exist",
                message: `${displayFile} links to missing anchor #${target.anchor} in ${rawTarget}.`,
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
                    detail: `Markdown anchor #${target.anchor} was not found in ${toPosix(path.relative(root, resolved))}.`
                  }
                ],
                impact:
                  "A future maintainer or coding agent may follow stale project documentation.",
                recommendedAction:
                  "Update the anchor, rename the heading, or remove the stale link.",
                reversibility: "trivial",
                requiredApproval: "none",
                explanation:
                  "The markdown-links detector resolves Markdown links, computes heading anchors for Markdown targets, and reports anchor fragments that do not match any heading."
              })
            );
          }
        }
      }
    }

    return findings;
  }
};

export async function countMarkdownFiles(
  root: string,
  excludedPaths: string[] = []
): Promise<number> {
  return (
    await walkFiles(root, {
      extensions: [".md"],
      includeHidden: true,
      exclude: excludedPaths
    })
  ).length;
}

function shouldSkipTarget(target: string): boolean {
  return (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.includes("://")
  );
}

function stripAngleBrackets(target: string): string {
  if (target.startsWith("<") && target.endsWith(">")) {
    return target.slice(1, -1);
  }

  return target;
}

function parseTarget(target: string): { path: string; anchor?: string } {
  const [targetPath, anchor] = target.split("#", 2);
  return {
    path: targetPath,
    anchor: anchor || undefined
  };
}

function missingTargetFinding(
  displayFile: string,
  rawTarget: string,
  lineIndex: number,
  matchIndex: number
): Finding {
  return createFinding({
    detectorId: "markdown-links",
    title: "Markdown link target does not exist",
    message: `${displayFile} links to missing target ${rawTarget}.`,
    location: {
      path: displayFile,
      line: lineIndex + 1,
      column: matchIndex + 1
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
      "The markdown-links detector scans Markdown links, ignores URLs, resolves relative targets from the containing file, and reports targets that are absent on disk."
  });
}

async function getAnchors(
  absoluteFile: string,
  cache: Map<string, Promise<Set<string>>>
): Promise<Set<string>> {
  const cached = cache.get(absoluteFile);
  if (cached) {
    return cached;
  }

  const anchors = readAnchors(absoluteFile);
  cache.set(absoluteFile, anchors);
  return anchors;
}

async function readAnchors(absoluteFile: string): Promise<Set<string>> {
  const contents = await fs.readFile(absoluteFile, "utf8");
  const anchors = new Set<string>();
  const seen = new Map<string, number>();

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (!match) {
      continue;
    }

    const base = slugifyHeading(match[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

function slugifyHeading(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function safeDecode(target: string): string {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}
