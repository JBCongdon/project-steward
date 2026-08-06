import fs from "node:fs/promises";
import path from "node:path";
import { GENERATED_MARKER, PROJECT_DIR, KAIRN_DIR } from "./constants.js";
import { runAudit } from "./audit.js";
import { ensureDir, exists, readJson, toPosix, writeJson } from "./fsx.js";
import { stableHash } from "./hash.js";
import type { SessionLedger } from "./types.js";

const CURRENT_SESSION = path.join(KAIRN_DIR, "sessions", "current.json");

export async function startSession(
  root: string,
  objective: string
): Promise<SessionLedger> {
  const now = new Date().toISOString();
  const ledger: SessionLedger = {
    version: 1,
    id: `ses-${stableHash(`${now}:${objective}`).slice(0, 12)}`,
    objective,
    startedAt: now,
    updatedAt: now,
    filesChanged: [],
    commandsRun: [],
    testsRun: [],
    assumptions: [],
    deferred: [],
    notes: []
  };

  await writeSession(root, ledger);
  return ledger;
}

export async function readCurrentSession(root: string): Promise<SessionLedger | undefined> {
  return readJson<SessionLedger>(path.join(root, CURRENT_SESSION));
}

export async function recordSessionEntry(
  root: string,
  entry: {
    file?: string;
    command?: string;
    test?: string;
    passed?: boolean;
    assumption?: string;
    deferred?: string;
    note?: string;
  }
): Promise<SessionLedger> {
  const ledger = await requireSession(root);

  if (entry.file) {
    pushUnique(ledger.filesChanged, toPosix(entry.file));
  }
  if (entry.command) {
    pushUnique(ledger.commandsRun, entry.command);
  }
  if (entry.test) {
    ledger.testsRun.push({ command: entry.test, passed: entry.passed });
  }
  if (entry.assumption) {
    pushUnique(ledger.assumptions, entry.assumption);
  }
  if (entry.deferred) {
    pushUnique(ledger.deferred, entry.deferred);
  }
  if (entry.note) {
    ledger.notes.push(entry.note);
  }

  ledger.updatedAt = new Date().toISOString();
  await writeSession(root, ledger);
  return ledger;
}

export async function closeSession(root: string): Promise<SessionLedger> {
  const ledger = await requireSession(root);
  ledger.closedAt = new Date().toISOString();
  ledger.updatedAt = ledger.closedAt;
  await writeSession(root, ledger);

  const archivePath = path.join(root, KAIRN_DIR, "sessions", `${ledger.id}.json`);
  await writeJson(archivePath, ledger);
  return ledger;
}

export async function generateHandoff(
  root: string,
  options: { write?: boolean } = {}
): Promise<{ text: string; ledger?: SessionLedger; wrote?: string }> {
  const ledger = await readCurrentSession(root);
  const audit = await runAudit(root);
  const newFindings = audit.findings.filter((finding) => finding.status === "new");
  const text = [
    GENERATED_MARKER,
    "",
    "# Handoff",
    "",
    ledger ? `Session: ${ledger.id}` : "Session: none",
    ledger ? `Objective: ${ledger.objective}` : "Objective: none recorded",
    `Commit: ${audit.baselineCommit}`,
    "",
    "## Files Changed",
    ...(ledger && ledger.filesChanged.length > 0
      ? ledger.filesChanged.map((file) => `- ${file}`)
      : ["- None recorded."]),
    "",
    "## Commands Run",
    ...(ledger && ledger.commandsRun.length > 0
      ? ledger.commandsRun.map((command) => `- ${command}`)
      : ["- None recorded."]),
    "",
    "## Tests Run",
    ...(ledger && ledger.testsRun.length > 0
      ? ledger.testsRun.map((test) => `- ${test.command}${test.passed === undefined ? "" : test.passed ? " (passed)" : " (failed)"}`)
      : ["- None recorded."]),
    "",
    "## Open Assumptions",
    ...(ledger && ledger.assumptions.length > 0
      ? ledger.assumptions.map((assumption) => `- ${assumption}`)
      : ["- None recorded."]),
    "",
    "## Deferred Work",
    ...(ledger && ledger.deferred.length > 0
      ? ledger.deferred.map((item) => `- ${item}`)
      : ["- None recorded."]),
    "",
    "## Current Audit",
    `- New findings: ${newFindings.length}`,
    `- Degraded coverage: ${audit.degraded.length}`,
    ""
  ].join("\n");

  if (!options.write) {
    return { text, ledger };
  }

  const target = path.join(root, PROJECT_DIR, "sessions", "handoff.md");
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, text, "utf8");
  return { text, ledger, wrote: target };
}

export async function reconcileDryRun(root: string): Promise<{
  ok: boolean;
  text: string;
  data: {
    session?: SessionLedger;
    candidates: string[];
    documentationUpdates: string[];
    decisionRequired: boolean;
    auditNewFindings: number;
  };
}> {
  const ledger = await readCurrentSession(root);
  const audit = await runAudit(root);
  const candidates = ledger?.filesChanged ?? [];
  const documentationUpdates = documentationCandidates(candidates);
  const decisionRequired = candidates.some((file) =>
    /\b(package.json|src\/audit|src\/policy|src\/mcp|src\/session|src\/judgment|architecture|policy)\b/.test(file)
  );
  const auditNewFindings = audit.findings.filter((finding) => finding.status === "new").length;

  const lines = [
    "Kairn reconcile dry-run",
    ledger ? `session: ${ledger.id}` : "session: none",
    `candidate changed files: ${candidates.length}`,
    `documentation updates: ${documentationUpdates.length}`,
    `decision required: ${decisionRequired ? "yes" : "no"}`,
    `new audit findings: ${auditNewFindings}`,
    "",
    "No files were changed."
  ];

  return {
    ok: audit.degraded.length === 0,
    text: `${lines.join("\n")}\n`,
    data: {
      session: ledger,
      candidates,
      documentationUpdates,
      decisionRequired,
      auditNewFindings
    }
  };
}

export function formatSession(ledger: SessionLedger | undefined): string {
  if (!ledger) {
    return "No active session ledger.\n";
  }

  return [
    "Kairn session",
    `id: ${ledger.id}`,
    `objective: ${ledger.objective}`,
    `started: ${ledger.startedAt}`,
    `updated: ${ledger.updatedAt}`,
    `files changed: ${ledger.filesChanged.length}`,
    `commands run: ${ledger.commandsRun.length}`,
    `tests run: ${ledger.testsRun.length}`,
    `assumptions: ${ledger.assumptions.length}`,
    `deferred: ${ledger.deferred.length}`,
    `closed: ${ledger.closedAt ?? "no"}`
  ].join("\n") + "\n";
}

async function requireSession(root: string): Promise<SessionLedger> {
  const ledger = await readCurrentSession(root);
  if (!ledger) {
    throw new Error("No active session. Run kairn session start --objective <text> first.");
  }
  return ledger;
}

async function writeSession(root: string, ledger: SessionLedger): Promise<void> {
  await writeJson(path.join(root, CURRENT_SESSION), ledger);
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
    target.sort();
  }
}

function documentationCandidates(files: string[]): string[] {
  const candidates = new Set<string>();
  for (const file of files) {
    if (file.startsWith("src/")) {
      candidates.add("docs/architecture.md");
    }
    if (file.includes("cli") || file.startsWith("src/commands/")) {
      candidates.add("README.md");
      candidates.add("docs/quickstart.md");
    }
    if (file.includes("policy")) {
      candidates.add("docs/policy.md");
    }
    if (file.includes("mcp") || file.includes("context")) {
      candidates.add("docs/context.md");
    }
  }

  return Array.from(candidates).sort();
}
