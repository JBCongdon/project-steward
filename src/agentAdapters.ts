import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureDir, exists, toPosix } from "./fsx.js";

export interface AgentAdapter {
  path: string;
  description: string;
}

interface AdapterTarget {
  path: string;
  absolute: string;
  description: string;
  kind: "markdown" | "toml";
}

export interface AgentAdapterInstallResult {
  scope: "global" | "repository";
  root: string;
  created: string[];
  updated: string[];
  skipped: string[];
}

export interface AgentAdapterStatus {
  path: string;
  description: string;
  installed: boolean;
}

const MARKDOWN_START = "<!-- KAIRN:BEGIN -->";
const MARKDOWN_END = "<!-- KAIRN:END -->";
const CONFIG_START = "# KAIRN:BEGIN";
const CONFIG_END = "# KAIRN:END";

export const AGENT_ADAPTERS: AgentAdapter[] = [
  { path: "AGENTS.md", description: "Codex and agents.md-compatible clients" },
  { path: "CLAUDE.md", description: "Claude Code" },
  { path: "GEMINI.md", description: "Gemini CLI" },
  { path: ".github/copilot-instructions.md", description: "GitHub Copilot" },
  { path: ".cursor/rules/kairn.mdc", description: "Cursor" },
  { path: ".codex/config.toml", description: "Codex project MCP server config" }
];

export const GLOBAL_AGENT_ADAPTERS: AgentAdapter[] = [
  { path: "~/.codex/AGENTS.md", description: "Codex global instructions" },
  { path: "~/.codex/config.toml", description: "Codex global MCP server config" },
  { path: "~/.claude/CLAUDE.md", description: "Claude Code user instructions" },
  { path: "~/.gemini/GEMINI.md", description: "Gemini CLI global context" }
];

export async function installAgentAdapters(
  root: string
): Promise<AgentAdapterInstallResult> {
  return installTargets(repositoryTargets(root), "repository", root);
}

export async function installGlobalAgentAdapters(
  options: GlobalAgentAdapterOptions = {}
): Promise<AgentAdapterInstallResult> {
  return installTargets(globalTargets(options), "global", "user config");
}

export interface GlobalAgentAdapterOptions {
  codexHome?: string;
  claudeHome?: string;
  geminiHome?: string;
}

async function installTargets(
  targets: AdapterTarget[],
  scope: "global" | "repository",
  root: string
): Promise<AgentAdapterInstallResult> {
  const result: AgentAdapterInstallResult = {
    scope,
    root,
    created: [],
    updated: [],
    skipped: []
  };

  for (const target of targets) {
    const block = target.kind === "toml"
      ? codexConfigBlock(scope)
      : instructionBlock(target.path, scope);
    const start = target.kind === "toml" ? CONFIG_START : MARKDOWN_START;

    if (!(await exists(target.absolute))) {
      await ensureDir(path.dirname(target.absolute));
      await fs.writeFile(target.absolute, initialContents(target.path, block), "utf8");
      result.created.push(target.path);
      continue;
    }

    const contents = await fs.readFile(target.absolute, "utf8");
    if (
      contents.includes(start) ||
      (target.kind === "toml" && contents.includes("[mcp_servers.kairn]"))
    ) {
      result.skipped.push(target.path);
      continue;
    }

    const separator = contents.endsWith("\n") || contents.length === 0 ? "" : "\n";
    await fs.writeFile(target.absolute, `${contents}${separator}\n${block}`, "utf8");
    result.updated.push(target.path);
  }

  return result;
}

export async function agentAdapterStatus(root: string): Promise<AgentAdapterStatus[]> {
  return adapterStatus(repositoryTargets(root));
}

export async function globalAgentAdapterStatus(
  options: GlobalAgentAdapterOptions = {}
): Promise<AgentAdapterStatus[]> {
  return adapterStatus(globalTargets(options));
}

async function adapterStatus(
  targets: AdapterTarget[]
): Promise<AgentAdapterStatus[]> {
  return Promise.all(
    targets.map(async (target) => {
      const installed = await isAdapterInstalled(target.absolute, target.kind);
      return {
        path: target.path,
        description: target.description,
        installed
      };
    })
  );
}

function initialContents(relativePath: string, block: string): string {
  if (relativePath === ".cursor/rules/kairn.mdc") {
    return `---\nalwaysApply: true\n---\n\n${block}`;
  }

  return block;
}

async function isAdapterInstalled(
  absolute: string,
  kind: "markdown" | "toml"
): Promise<boolean> {
  if (!(await exists(absolute))) {
    return false;
  }

  const contents = await fs.readFile(absolute, "utf8");
  if (kind === "toml") {
    return contents.includes(CONFIG_START) || contents.includes("[mcp_servers.kairn]");
  }

  return contents.includes(MARKDOWN_START);
}

function repositoryTargets(root: string): AdapterTarget[] {
  return AGENT_ADAPTERS.map((adapter) => ({
    ...adapter,
    absolute: path.join(root, adapter.path),
    kind: adapter.path.endsWith("config.toml") ? "toml" : "markdown"
  }));
}

function globalTargets(options: GlobalAgentAdapterOptions): AdapterTarget[] {
  const codexHome = options.codexHome ?? defaultCodexHome();
  const claudeHome = options.claudeHome ?? defaultClaudeHome();
  const geminiHome = options.geminiHome ?? defaultGeminiHome();

  return [
    {
      path: displayHomePath(codexHome, "AGENTS.md", ".codex"),
      absolute: path.join(codexHome, "AGENTS.md"),
      description: "Codex global instructions",
      kind: "markdown"
    },
    {
      path: displayHomePath(codexHome, "config.toml", ".codex"),
      absolute: path.join(codexHome, "config.toml"),
      description: "Codex global MCP server config",
      kind: "toml"
    },
    {
      path: displayHomePath(claudeHome, "CLAUDE.md", ".claude"),
      absolute: path.join(claudeHome, "CLAUDE.md"),
      description: "Claude Code user instructions",
      kind: "markdown"
    },
    {
      path: displayHomePath(geminiHome, "GEMINI.md", ".gemini"),
      absolute: path.join(geminiHome, "GEMINI.md"),
      description: "Gemini CLI global context",
      kind: "markdown"
    }
  ];
}

function instructionBlock(relativePath: string, scope: "global" | "repository"): string {
  const heading = relativePath === ".cursor/rules/kairn.mdc"
    ? "# Kairn Agent Instructions"
    : "## Kairn Agent Instructions";

  if (scope === "global") {
    return `${MARKDOWN_START}
${heading}

Kairn is installed on this machine as a global project intelligence layer.

At the start of substantial work in any repository:

- Prefer MCP tools named kairn_* when they are available.
- Otherwise run kairn status and kairn brief "<objective>" from the repository root before broad edits.
- If .project/ exists, read .project/status.md, .project/sessions/handoff.md, and the relevant active plan under .project/plans/active/.
- If .project/ is missing, use Kairn read-only and suggest kairn init only when the project wants committed durable memory.

During work:

- Treat .project/ as shared project memory when it exists.
- Run kairn judge "<objective>" before changes to architecture, policy, dependencies, storage, protocols, security posture, or cross-module behavior.
- Use kairn adr propose --title "<title>" --objective "<objective>" --write when Kairn says a decision record is required.
- Record meaningful session evidence with kairn session record when a session is active.

Before claiming done:

- Run the relevant tests or checks.
- Run kairn reconcile --dry-run.
- Run kairn audit or kairn check.
- Update .project/sessions/handoff.md with kairn handoff --write for long-running or interrupted work when .project/ exists.

If the kairn command is unavailable, say that clearly and continue from repository-local files manually.
${MARKDOWN_END}
`;
  }

  return `${MARKDOWN_START}
${heading}

This repository uses Kairn for durable project memory. Do not ignore it.

At the start of substantial work:

- Read .project/status.md, .project/sessions/handoff.md, and the relevant active plan under .project/plans/active/.
- Prefer MCP tools named kairn_* when they are available.
- Otherwise run kairn status and kairn brief "<objective>" before broad edits.

During work:

- Treat .project/ as shared project memory that should be committed when it changes.
- Run kairn judge "<objective>" before changes to architecture, policy, dependencies, storage, protocols, security posture, or cross-module behavior.
- Use kairn adr propose --title "<title>" --objective "<objective>" --write when Kairn says a decision record is required.
- Record meaningful session evidence with kairn session record.

Before claiming done:

- Run the relevant tests or checks.
- Run kairn reconcile --dry-run.
- Run kairn audit or kairn check.
- Update .project/sessions/handoff.md with kairn handoff --write for long-running or interrupted work.

If the kairn command is unavailable, say that clearly and continue with the .project/ files manually.
${MARKDOWN_END}
`;
}

function codexConfigBlock(scope: "global" | "repository"): string {
  const args = scope === "global" ? `["mcp"]` : `["mcp", "--root", "."]`;
  return `${CONFIG_START}
[mcp_servers.kairn]
command = "kairn"
args = ${args}
startup_timeout_sec = 10
tool_timeout_sec = 60
${CONFIG_END}
`;
}

export function defaultCodexHome(): string {
  return process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
}

export function defaultClaudeHome(): string {
  return process.env.CLAUDE_HOME ?? path.join(os.homedir(), ".claude");
}

export function defaultGeminiHome(): string {
  return process.env.GEMINI_HOME ?? path.join(os.homedir(), ".gemini");
}

function displayHomePath(configHome: string, file: string, defaultDir: string): string {
  const expected = path.join(os.homedir(), defaultDir);
  if (path.resolve(configHome) === expected) {
    return `~/${defaultDir}/${file}`;
  }

  return toPosix(path.join(configHome, file));
}

export function formatAgentAdapterInstall(result: AgentAdapterInstallResult): string {
  const label = result.scope === "global"
    ? "Kairn global agent integration"
    : "Kairn repository agent adapters";
  const lines = [label, `root: ${result.root}`];

  if (result.created.length > 0) {
    lines.push("created:");
    for (const file of result.created) {
      lines.push(`  - ${toPosix(file)}`);
    }
  }

  if (result.updated.length > 0) {
    lines.push("updated:");
    for (const file of result.updated) {
      lines.push(`  - ${toPosix(file)}`);
    }
  }

  if (result.created.length === 0 && result.updated.length === 0) {
    lines.push("already installed");
  }

  return `${lines.join("\n")}\n`;
}
