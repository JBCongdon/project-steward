import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createFinding } from "../finding.js";
import { exists, toPosix, walkFiles } from "../fsx.js";
import { getGitInfo } from "../git.js";
import { loadPolicy } from "../policy.js";
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
    const policy = await loadPolicy(root);
    const git = getGitInfo(root);
    const canUseGitHistory = git.isGitRepository && !git.isShallow;

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

        if (planDirectory.expectedStatus === "active" && canUseGitHistory) {
          const staleFinding = staleActivePlanFinding(
            root,
            displayPath,
            policy.plans.stale_after_days
          );
          if (staleFinding) {
            findings.push(staleFinding);
          }
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

function staleActivePlanFinding(
  root: string,
  displayPath: string,
  staleAfterDays: number
): Finding | undefined {
  const lastCommit = lastCommitDate(root, displayPath);
  const referenceCommit = latestCommitDate(root);

  if (!referenceCommit) {
    return undefined;
  }

  if (!lastCommit) {
    return createFinding({
      detectorId: "plan-state",
      title: "Active plan has no git history",
      message: `${displayPath} is active but has no commits in git history.`,
      location: { path: displayPath },
      confidence: "medium",
      deterministic: true,
      source: "git-derived",
      evidence: [
        {
          kind: "git",
          path: displayPath,
          detail: "git log did not report a commit for this active plan file."
        }
      ],
      impact:
        "Other agents and collaborators may not have durable evidence for the active work plan.",
      recommendedAction:
        "Commit the active plan, or move it out of active plans if it is not real current work.",
      reversibility: "trivial",
      requiredApproval: "none",
      explanation:
        "The plan-state detector checks active plan files against git history when full history is available."
    });
  }

  const ageDays = Math.floor(
    (referenceCommit.getTime() - lastCommit.getTime()) / 86_400_000
  );
  if (ageDays <= staleAfterDays) {
    return undefined;
  }

  return createFinding({
    detectorId: "plan-state",
    title: "Active plan appears stale",
    message: `${displayPath} is active but has no plan-file commits within the policy threshold.`,
    location: { path: displayPath },
    confidence: "medium",
    deterministic: true,
    source: "git-derived",
    evidence: [
      {
        kind: "git",
        path: displayPath,
        detail: `Last plan-file commit was ${lastCommit.toISOString()}; latest repository commit was ${referenceCommit.toISOString()}; policy threshold is ${staleAfterDays} day(s).`
      }
    ],
    impact:
      "Agents may continue to treat abandoned or dormant work as active project direction.",
    recommendedAction:
      "Update the active plan with current evidence, move it to completed/abandoned, or adjust plans.stale_after_days in policy.",
    reversibility: "trivial",
    requiredApproval: "none",
    explanation:
      "The plan-state detector uses git log for active plan files when full history is available. It reports stale active plans using the policy plans.stale_after_days threshold."
  });
}

function lastCommitDate(root: string, displayPath: string): Date | undefined {
  return gitCommitDate(root, ["log", "-1", "--format=%cI", "--", displayPath]);
}

function latestCommitDate(root: string): Date | undefined {
  return gitCommitDate(root, ["log", "-1", "--format=%cI"]);
}

function gitCommitDate(root: string, args: string[]): Date | undefined {
  try {
    const raw = execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return raw ? new Date(raw) : undefined;
  } catch {
    return undefined;
  }
}
