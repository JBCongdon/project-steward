import fs from "node:fs/promises";
import path from "node:path";
import { GENERATED_MARKER, PROJECT_DIR } from "./constants.js";
import { ensureDir, exists, toPosix, walkFiles } from "./fsx.js";
import { stableHash } from "./hash.js";
import type { DecisionStudyResult, IntentJudgment } from "./types.js";

const DECISION_TERMS = [
  "architecture",
  "auth",
  "authorization",
  "authentication",
  "database",
  "storage",
  "migration",
  "dependency",
  "framework",
  "security",
  "policy",
  "public api",
  "mcp",
  "protocol",
  "encryption",
  "multi-tenant"
];

const PLAN_TERMS = [
  "refactor",
  "rewrite",
  "release",
  "publish",
  "workflow",
  "integration",
  "adapter",
  "performance",
  "cache",
  "index",
  "evaluation",
  "benchmark"
];

export function judgeIntent(objective: string): IntentJudgment {
  const normalized = objective.trim();
  if (!normalized) {
    throw new Error("An objective is required.");
  }

  const lower = normalized.toLowerCase();
  const decisionMatches = DECISION_TERMS.filter((term) => lower.includes(term));
  const planMatches = PLAN_TERMS.filter((term) => lower.includes(term));
  const broad = /\b(all|through|entire|across|multiple|system|foundation)\b/.test(lower);

  if (decisionMatches.length > 0) {
    return {
      version: 1,
      objective: normalized,
      classification: "decision-required",
      confidence: decisionMatches.length > 1 ? "high" : "medium",
      reasons: decisionMatches.map((term) => `objective mentions ${term}`),
      recommendedAction: "Draft a Proposed ADR before implementation, then reconcile it with observed evidence before accepting.",
      adrRecommended: true
    };
  }

  if (planMatches.length > 0 || broad) {
    return {
      version: 1,
      objective: normalized,
      classification: "plan-required",
      confidence: planMatches.length > 1 || broad ? "high" : "medium",
      reasons: [
        ...planMatches.map((term) => `objective mentions ${term}`),
        ...(broad ? ["objective appears broad enough to need a plan"] : [])
      ],
      recommendedAction: "Create or update an active plan and define required evidence before implementation.",
      adrRecommended: false
    };
  }

  return {
    version: 1,
    objective: normalized,
    classification: "routine",
    confidence: "medium",
    reasons: ["objective appears narrow and implementation-local"],
    recommendedAction: "Proceed with normal implementation and record evidence in the session ledger.",
    adrRecommended: false
  };
}

export async function proposeAdr(
  root: string,
  input: { title: string; objective: string; write?: boolean }
): Promise<{ path: string; text: string; wrote: boolean; judgment: IntentJudgment }> {
  const judgment = judgeIntent(input.objective);
  const title = input.title.trim();
  if (!title) {
    throw new Error("An ADR title is required.");
  }

  const number = await nextAdrNumber(root);
  const relativePath = `${PROJECT_DIR}/decisions/ADR-${number}-${slugify(title)}.md`;
  const text = [
    GENERATED_MARKER,
    "",
    `# ADR-${number}: ${title}`,
    "",
    "Status: Proposed",
    "",
    "## Context",
    "",
    input.objective,
    "",
    "## Drivers",
    "",
    ...judgment.reasons.map((reason) => `- ${reason}`),
    "",
    "## Options",
    "",
    "- Option A: PENDING",
    "- Option B: PENDING",
    "",
    "## Decision",
    "",
    "PENDING",
    "",
    "## Consequences",
    "",
    "- Positive: unresolved.",
    "- Negative: unresolved.",
    "",
    "## Rollback",
    "",
    "PENDING",
    ""
  ].join("\n");

  if (!input.write) {
    return { path: relativePath, text, wrote: false, judgment };
  }

  const absolutePath = path.join(root, relativePath);
  await ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, text, "utf8");
  return { path: relativePath, text, wrote: true, judgment };
}

export async function runDecisionStudy(
  root: string,
  fixturesPath = "fixtures/decision-study"
): Promise<DecisionStudyResult> {
  const absolute = path.isAbsolute(fixturesPath)
    ? fixturesPath
    : path.join(root, fixturesPath);

  if (!(await exists(absolute))) {
    return emptyStudy();
  }

  const files = await walkFiles(absolute, { extensions: [".json"], includeHidden: true });
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  let naiveTruePositives = 0;
  let naiveFalsePositives = 0;
  let naiveFalseNegatives = 0;

  for (const file of files) {
    const raw = await fs.readFile(path.join(absolute, file), "utf8");
    const cases = JSON.parse(raw) as Array<{
      objective: string;
      changedFiles?: string[];
      decisionRequired: boolean;
    }>;

    for (const item of cases) {
      const predicted = judgeIntent(item.objective).adrRecommended;
      const naive = naiveDecisionHeuristic(item.changedFiles ?? []);

      if (predicted && item.decisionRequired) {
        truePositives += 1;
      } else if (predicted && !item.decisionRequired) {
        falsePositives += 1;
      } else if (!predicted && item.decisionRequired) {
        falseNegatives += 1;
      } else {
        trueNegatives += 1;
      }

      if (naive && item.decisionRequired) {
        naiveTruePositives += 1;
      } else if (naive && !item.decisionRequired) {
        naiveFalsePositives += 1;
      } else if (!naive && item.decisionRequired) {
        naiveFalseNegatives += 1;
      }
    }
  }

  const precision = ratio(truePositives, truePositives + falsePositives);
  const recall = ratio(truePositives, truePositives + falseNegatives);
  const f1 = f1Score(precision, recall);
  const naivePrecision = ratio(naiveTruePositives, naiveTruePositives + naiveFalsePositives);
  const naiveRecall = ratio(naiveTruePositives, naiveTruePositives + naiveFalseNegatives);
  const naiveF1 = f1Score(naivePrecision, naiveRecall);

  return {
    version: 1,
    fixtureCount: truePositives + falsePositives + falseNegatives + trueNegatives,
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    precision,
    recall,
    f1,
    naiveF1,
    passed: f1 >= naiveF1
  };
}

export function formatJudgment(judgment: IntentJudgment): string {
  return [
    "Kairn judgment",
    `classification: ${judgment.classification}`,
    `confidence: ${judgment.confidence}`,
    `ADR recommended: ${judgment.adrRecommended ? "yes" : "no"}`,
    `action: ${judgment.recommendedAction}`,
    "",
    "reasons:",
    ...judgment.reasons.map((reason) => `  - ${reason}`)
  ].join("\n") + "\n";
}

export function formatDecisionStudy(result: DecisionStudyResult): string {
  return [
    "Kairn decision study",
    `fixtures: ${result.fixtureCount}`,
    `precision: ${result.precision.toFixed(3)}`,
    `recall: ${result.recall.toFixed(3)}`,
    `f1: ${result.f1.toFixed(3)}`,
    `naive f1: ${result.naiveF1.toFixed(3)}`,
    `gate: ${result.passed ? "passed" : "failed"}`
  ].join("\n") + "\n";
}

async function nextAdrNumber(root: string): Promise<string> {
  const directory = path.join(root, PROJECT_DIR, "decisions");
  if (!(await exists(directory))) {
    return "0001";
  }

  const files = await walkFiles(directory, { extensions: [".md"], includeHidden: true });
  const highest = files.reduce((max, file) => {
    const match = path.basename(file).match(/^ADR-(\d{4})-/);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);

  return String(highest + 1).padStart(4, "0");
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || stableHash(title).slice(0, 8);
}

function naiveDecisionHeuristic(changedFiles: string[]): boolean {
  const normalized = changedFiles.map((file) => toPosix(file));
  const topLevel = new Set(normalized.map((file) => file.split("/")[0]));
  const touchesGovernance = normalized.some((file) =>
    /^(\.project\/decisions|package.json|package-lock.json|src\/policy|src\/audit)/.test(file)
  );
  return touchesGovernance || topLevel.size > 2;
}

function emptyStudy(): DecisionStudyResult {
  return {
    version: 1,
    fixtureCount: 0,
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    trueNegatives: 0,
    precision: 0,
    recall: 0,
    f1: 0,
    naiveF1: 0,
    passed: false
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function f1Score(precision: number, recall: number): number {
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}
