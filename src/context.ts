import fs from "node:fs/promises";
import path from "node:path";
import { KAIRN_DIR } from "./constants.js";
import { ensureDir, toPosix, walkFiles } from "./fsx.js";
import { getGitInfo } from "./git.js";
import { stableHash } from "./hash.js";
import { loadPolicy } from "./policy.js";
import { isAdrPath } from "./records.js";
import type {
  ContextPacket,
  ContextPacketItem,
  ExecutionBrief,
  RetrievalFeedback
} from "./types.js";

const DEFAULT_PACKET_BUDGET = 2400;
const MAX_EXCERPT_CHARS = 700;
const CONTEXT_EXTENSIONS = [
  ".md",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yaml",
  ".yml",
  ".go",
  ".rs",
  ".py",
  ".rb",
  ".java",
  ".cs",
  ".php",
  ".html",
  ".css"
];

export async function compileContextPacket(
  root: string,
  objective: string,
  options: { budgetTokens?: number } = {}
): Promise<ContextPacket> {
  const trimmedObjective = objective.trim();
  if (!trimmedObjective) {
    throw new Error("An objective is required.");
  }

  const budgetTokens = Math.max(200, options.budgetTokens ?? DEFAULT_PACKET_BUDGET);
  const policy = await loadPolicy(root);
  const git = getGitInfo(root);
  const queryTerms = tokenize(trimmedObjective);
  const files = await walkFiles(root, {
    extensions: CONTEXT_EXTENSIONS,
    includeHidden: true,
    exclude: policy.exclude_paths
  });

  const candidates = (
    await Promise.all(
      files.map(async (relativePath) =>
        scoreCandidate(root, toPosix(relativePath), queryTerms)
      )
    )
  )
    .filter((candidate): candidate is ContextPacketItem => candidate !== undefined)
    .sort(compareItems);

  const items: ContextPacketItem[] = [];
  const droppedByBudget: ContextPacketItem[] = [];
  let usedTokens = 0;

  for (const candidate of candidates) {
    if (candidate.score <= 0 && !isAlwaysRelevant(candidate.path)) {
      continue;
    }

    if (usedTokens + candidate.estimatedTokens > budgetTokens) {
      droppedByBudget.push(candidate);
      continue;
    }

    items.push(candidate);
    usedTokens += candidate.estimatedTokens;
  }

  const nearestMisses = candidates
    .filter((candidate) => !items.some((item) => item.path === candidate.path))
    .slice(0, 5);

  const stablePayload = {
    objective: trimmedObjective,
    root: path.basename(root),
    baselineCommit: git.commit,
    budgetTokens,
    items: items.map(({ path: itemPath, score }) => ({ path: itemPath, score }))
  };

  return {
    version: 1,
    id: `pkt-${stableHash(stablePayload).slice(0, 12)}`,
    objective: trimmedObjective,
    root,
    baselineCommit: git.commit,
    budgetTokens,
    usedTokens,
    items,
    droppedByBudget,
    exclusions: {
      considered: candidates.length,
      included: items.length,
      droppedByBudget: droppedByBudget.length,
      nearestMisses
    }
  };
}

export async function compileExecutionBrief(
  root: string,
  objective: string,
  options: { budgetTokens?: number } = {}
): Promise<ExecutionBrief> {
  const packet = await compileContextPacket(root, objective, options);
  const constraints = packet.items
    .filter((item) => item.path.includes("/constraints.md") || item.path.includes("/security.md"))
    .flatMap((item) => extractDirectiveLines(item.excerpt));

  return {
    version: 1,
    objective: packet.objective,
    packetId: packet.id,
    baselineCommit: packet.baselineCommit,
    context: packet.items.map((item) => ({ path: item.path, reason: item.reason })),
    requiredEvidence: requiredEvidenceFor(packet.objective),
    documentationObligations: documentationObligationsFor(packet),
    prohibitedActions: constraints.length > 0 ? constraints : ["Do not rewrite project records without an explicit completion or reconciliation step."],
    definitionOfDone: [
      "Implementation matches the stated objective.",
      "Relevant tests or checks have been run and recorded.",
      "Any changed architecture, policy, or decision has a documentation update or an explicit deferral.",
      "Audit or reconcile dry-run has no unexplained new governance drift."
    ]
  };
}

export async function recordRetrievalFeedback(
  root: string,
  input: {
    packetId: string;
    objective?: string;
    supplied: string[];
    touched: string[];
  }
): Promise<RetrievalFeedback> {
  const supplied = normalizePaths(input.supplied);
  const touched = normalizePaths(input.touched);
  const suppliedSet = new Set(supplied);
  const touchedSet = new Set(touched);
  const feedback: RetrievalFeedback = {
    version: 1,
    recordedAt: new Date().toISOString(),
    packetId: input.packetId,
    objective: input.objective,
    supplied,
    touched,
    ignoredSupplied: supplied.filter((item) => !touchedSet.has(item)),
    touchedWithoutContext: touched.filter((item) => !suppliedSet.has(item))
  };

  const target = path.join(root, KAIRN_DIR, "feedback", "retrieval-feedback.jsonl");
  await ensureDir(path.dirname(target));
  await fs.appendFile(target, `${JSON.stringify(feedback)}\n`, "utf8");
  return feedback;
}

export function formatContextPacket(packet: ContextPacket): string {
  const lines = [
    "Kairn context packet",
    `id: ${packet.id}`,
    `commit: ${packet.baselineCommit}`,
    `budget: ${packet.usedTokens}/${packet.budgetTokens} estimated tokens`,
    `objective: ${packet.objective}`,
    "",
    "included:"
  ];

  for (const item of packet.items) {
    lines.push(`  - ${item.path} (${item.kind}, score ${item.score})`);
    lines.push(`    why: ${item.reason}`);
  }

  lines.push("");
  lines.push(
    `excluded: ${packet.exclusions.considered - packet.exclusions.included} considered item(s), ${packet.exclusions.droppedByBudget} dropped by budget`
  );

  if (packet.exclusions.nearestMisses.length > 0) {
    lines.push("nearest misses:");
    for (const item of packet.exclusions.nearestMisses) {
      lines.push(`  - ${item.path} (${item.kind}, score ${item.score})`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function formatExecutionBrief(brief: ExecutionBrief): string {
  const lines = [
    "Kairn execution brief",
    `packet: ${brief.packetId}`,
    `commit: ${brief.baselineCommit}`,
    `objective: ${brief.objective}`,
    "",
    "context:"
  ];

  for (const item of brief.context) {
    lines.push(`  - ${item.path}: ${item.reason}`);
  }

  lines.push("", "required evidence:");
  for (const item of brief.requiredEvidence) {
    lines.push(`  - ${item}`);
  }

  lines.push("", "documentation obligations:");
  for (const item of brief.documentationObligations) {
    lines.push(`  - ${item}`);
  }

  lines.push("", "prohibited actions:");
  for (const item of brief.prohibitedActions) {
    lines.push(`  - ${item}`);
  }

  lines.push("", "definition of done:");
  for (const item of brief.definitionOfDone) {
    lines.push(`  - ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function compareItems(left: ContextPacketItem, right: ContextPacketItem): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.path.localeCompare(right.path);
}

async function scoreCandidate(
  root: string,
  relativePath: string,
  queryTerms: string[]
): Promise<ContextPacketItem | undefined> {
  const absolute = path.join(root, relativePath);
  let contents: string;
  try {
    contents = await fs.readFile(absolute, "utf8");
  } catch {
    return undefined;
  }

  if (contents.includes("\u0000")) {
    return undefined;
  }

  const searchable = `${relativePath}\n${contents}`.toLowerCase();
  const matchedTerms = queryTerms.filter((term) => searchable.includes(term));
  const pathTerms = queryTerms.filter((term) => relativePath.toLowerCase().includes(term));
  const headingMatches = headingTerms(contents).filter((term) => queryTerms.includes(term));
  const kind = classifyContextPath(relativePath);
  const base = relevanceBase(relativePath, kind);
  const score = base + matchedTerms.length * 4 + pathTerms.length * 5 + headingMatches.length * 3;
  const excerpt = excerptFor(contents, matchedTerms);
  const reason = reasonFor(relativePath, kind, matchedTerms, pathTerms, base);

  return {
    path: relativePath,
    kind,
    score,
    estimatedTokens: estimateTokens(`${relativePath}\n${reason}\n${excerpt}`),
    reason,
    excerpt
  };
}

function classifyContextPath(relativePath: string): string {
  if (relativePath.startsWith(".project/decisions/")) {
    return isAdrPath(relativePath) ? "decision" : "project-record";
  }
  if (relativePath.startsWith(".project/plans/")) {
    return "plan";
  }
  if (relativePath.startsWith(".project/knowledge/")) {
    return "knowledge";
  }
  if (relativePath.startsWith(".project/")) {
    return "project-record";
  }
  if (relativePath.startsWith("docs/")) {
    return "documentation";
  }
  if (/\.(ts|tsx|js|jsx|mjs|cjs|go|rs|py|rb|java|cs|php)$/.test(relativePath)) {
    return "source";
  }
  return "repository-file";
}

function relevanceBase(relativePath: string, kind: string): number {
  if (relativePath === ".project/project.md" || relativePath === ".project/status.md") {
    return 8;
  }
  if (relativePath === ".project/architecture.md") {
    return 7;
  }
  if (kind === "decision" || kind === "plan" || kind === "knowledge") {
    return 4;
  }
  if (relativePath === "README.md" || relativePath === "ROADMAP.md") {
    return 3;
  }
  return 0;
}

function isAlwaysRelevant(relativePath: string): boolean {
  return [
    ".project/project.md",
    ".project/status.md",
    ".project/architecture.md",
    ".project/knowledge/constraints.md",
    ".project/knowledge/security.md"
  ].includes(relativePath);
}

function reasonFor(
  relativePath: string,
  kind: string,
  matchedTerms: string[],
  pathTerms: string[],
  base: number
): string {
  const reasons: string[] = [];
  if (base > 0) {
    reasons.push(`${kind} is part of the governed project context`);
  }
  if (pathTerms.length > 0) {
    reasons.push(`path matches ${pathTerms.slice(0, 5).join(", ")}`);
  }
  if (matchedTerms.length > 0) {
    reasons.push(`content matches ${matchedTerms.slice(0, 5).join(", ")}`);
  }
  return reasons.length > 0 ? reasons.join("; ") : "nearest lexical match to the objective";
}

function excerptFor(contents: string, matchedTerms: string[]): string {
  const lines = contents.split(/\r?\n/);
  const headings = lines.filter((line) => /^#{1,4}\s+/.test(line)).slice(0, 5);
  const matches = lines
    .filter((line) => matchedTerms.some((term) => line.toLowerCase().includes(term)))
    .slice(0, 6);
  const excerpt = [...headings, ...matches]
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return (excerpt || contents.trim()).slice(0, MAX_EXCERPT_CHARS);
}

function tokenize(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9_-]{2,}/g)
        ?.filter((term) => !STOP_WORDS.has(term)) ?? []
    )
  ).sort();
}

function headingTerms(contents: string): string[] {
  return tokenize(
    contents
      .split(/\r?\n/)
      .filter((line) => /^#{1,4}\s+/.test(line))
      .join(" ")
  );
}

function estimateTokens(input: string): number {
  return Math.max(1, Math.ceil(input.length / 4));
}

function extractDirectiveLines(excerpt: string): string[] {
  return excerpt
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => /\b(must not|never|prohibited|do not|requires approval)\b/i.test(line));
}

function requiredEvidenceFor(objective: string): string[] {
  const lower = objective.toLowerCase();
  const evidence = ["Focused test or check covering the changed behavior."];
  if (/\b(api|route|endpoint|schema)\b/.test(lower)) {
    evidence.push("API contract or request/response coverage.");
  }
  if (/\b(auth|authentication|authorization|security|token|permission|entitlement)\b/.test(lower)) {
    evidence.push("Denied-path and permitted-path coverage.");
  }
  if (/\b(cli|command|flag)\b/.test(lower)) {
    evidence.push("CLI output and exit-code coverage.");
  }
  if (/\b(migration|database|storage|index)\b/.test(lower)) {
    evidence.push("Migration, rebuild, or rollback check.");
  }
  return evidence;
}

function documentationObligationsFor(packet: ContextPacket): string[] {
  const obligations = ["Update user-facing docs when commands, flags, or workflows change."];
  if (packet.items.some((item) => item.kind === "decision")) {
    obligations.push("Update or supersede governing ADRs if the implementation changes an accepted decision.");
  }
  if (packet.items.some((item) => item.path === ".project/architecture.md")) {
    obligations.push("Update architecture notes if component boundaries or data flow change.");
  }
  return obligations;
}

function normalizePaths(paths: string[]): string[] {
  return Array.from(
    new Set(
      paths
        .flatMap((value) => value.split(","))
        .map((value) => toPosix(value.trim()))
        .filter(Boolean)
    )
  ).sort();
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "that",
  "this",
  "then",
  "than",
  "when",
  "what",
  "where",
  "which",
  "while",
  "about",
  "onto",
  "over",
  "under",
  "through",
  "until",
  "work",
  "working",
  "build",
  "add",
  "make"
]);
