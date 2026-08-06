import { execFileSync } from "node:child_process";
import path from "node:path";
import { PROJECT_DIR, REQUIRED_PROJECT_FILES } from "../constants.js";
import { createFinding } from "../finding.js";
import { exists } from "../fsx.js";
import { getGitInfo } from "../git.js";
import type { Detector, Finding } from "../types.js";

const OPTIONAL_COMMITTED_PROJECT_FILES = ["audit-baseline.json", "waivers.json"];

export const projectGitStateDetector: Detector = {
  id: "project-git-state",
  description: "Checks that required .project records are tracked by git.",
  async run({ root }) {
    const git = getGitInfo(root);
    if (!git.isGitRepository) {
      return [];
    }

    const findings: Finding[] = [];

    for (const projectFile of [
      ...REQUIRED_PROJECT_FILES,
      ...OPTIONAL_COMMITTED_PROJECT_FILES
    ]) {
      const relative = path.join(PROJECT_DIR, projectFile);
      const absolute = path.join(root, relative);
      if (!(await exists(absolute))) {
        continue;
      }

      if (!isTracked(root, relative)) {
        findings.push(untrackedProjectRecordFinding(relative));
        continue;
      }

      if (hasUncommittedChanges(root, relative)) {
        findings.push(dirtyProjectRecordFinding(root, relative));
      }
    }

    return findings;
  }
};

function untrackedProjectRecordFinding(relative: string): Finding {
  return createFinding({
    detectorId: "project-git-state",
    title: "Project record is not tracked by git",
    message: `${relative} exists but is not tracked by git.`,
    location: { path: relative },
    confidence: "high",
    deterministic: true,
    source: "git-derived",
    evidence: [
      {
        kind: "git",
        path: relative,
        detail: "git ls-files did not report this required project record as tracked."
      }
    ],
    impact:
      "Project memory may exist only locally and disappear for other agents, CI, or collaborators.",
    recommendedAction: `Commit ${relative} or remove Kairn from this repository.`,
    reversibility: "trivial",
    requiredApproval: "none",
    explanation:
      "The project-git-state detector checks required .project records with git ls-files. Existing records that are not tracked are high-confidence because .project is intended to be committed project memory."
  });
}

function dirtyProjectRecordFinding(root: string, relative: string): Finding {
  return createFinding({
    detectorId: "project-git-state",
    title: "Project record has uncommitted changes",
    message: `${relative} has uncommitted changes.`,
    location: { path: relative },
    confidence: "medium",
    deterministic: true,
    source: "git-derived",
    evidence: [
      {
        kind: "git",
        path: relative,
        detail: `git status --porcelain reports: ${porcelainStatus(root, relative)}`
      }
    ],
    impact:
      "Local project memory differs from the committed version that other agents, CI, or collaborators will read.",
    recommendedAction:
      "Commit the project record change, revert it, or move incomplete notes into a local session ledger.",
    reversibility: "trivial",
    requiredApproval: "none",
    explanation:
      "The project-git-state detector checks committed .project records with git status. Dirty project records are reported because .project is intended to be shared, durable project memory."
  });
}

function isTracked(root: string, relativePath: string): boolean {
  try {
    execFileSync("git", ["-C", root, "ls-files", "--error-unmatch", relativePath], {
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

function hasUncommittedChanges(root: string, relativePath: string): boolean {
  return porcelainStatus(root, relativePath).length > 0;
}

function porcelainStatus(root: string, relativePath: string): string {
  try {
    return execFileSync("git", ["-C", root, "status", "--porcelain", "--", relativePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}
