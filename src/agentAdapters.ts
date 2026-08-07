import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, exists, toPosix } from "./fsx.js";

export interface AgentAdapter {
  path: string;
  description: string;
}

export interface AgentAdapterInstallResult {
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

export async function installAgentAdapters(
  root: string
): Promise<AgentAdapterInstallResult> {
  const result: AgentAdapterInstallResult = {
    created: [],
    updated: [],
    skipped: []
  };

  for (const adapter of AGENT_ADAPTERS) {
    const absolute = path.join(root, adapter.path);
    const block = adapter.path === ".codex/config.toml"
      ? codexConfigBlock()
      : instructionBlock(adapter.path);
    const start = adapter.path === ".codex/config.toml" ? CONFIG_START : MARKDOWN_START;

    if (!(await exists(absolute))) {
      await ensureDir(path.dirname(absolute));
      await fs.writeFile(absolute, initialContents(adapter.path, block), "utf8");
      result.created.push(adapter.path);
      continue;
    }

    const contents = await fs.readFile(absolute, "utf8");
    if (
      contents.includes(start) ||
      (adapter.path === ".codex/config.toml" && contents.includes("[mcp_servers.kairn]"))
    ) {
      result.skipped.push(adapter.path);
      continue;
    }

    const separator = contents.endsWith("\n") || contents.length === 0 ? "" : "\n";
    await fs.writeFile(absolute, `${contents}${separator}\n${block}`, "utf8");
    result.updated.push(adapter.path);
  }

  return result;
}

export async function agentAdapterStatus(root: string): Promise<AgentAdapterStatus[]> {
  return Promise.all(
    AGENT_ADAPTERS.map(async (adapter) => {
      const absolute = path.join(root, adapter.path);
      const installed = await isAdapterInstalled(absolute, adapter.path);
      return {
        ...adapter,
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
  relativePath: string
): Promise<boolean> {
  if (!(await exists(absolute))) {
    return false;
  }

  const contents = await fs.readFile(absolute, "utf8");
  if (relativePath === ".codex/config.toml") {
    return contents.includes(CONFIG_START) || contents.includes("[mcp_servers.kairn]");
  }

  return contents.includes(MARKDOWN_START);
}

function instructionBlock(relativePath: string): string {
  const heading = relativePath === ".cursor/rules/kairn.mdc"
    ? "# Kairn Agent Instructions"
    : "## Kairn Agent Instructions";

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

function codexConfigBlock(): string {
  return `${CONFIG_START}
[mcp_servers.kairn]
command = "kairn"
args = ["mcp", "--root", "."]
startup_timeout_sec = 10
tool_timeout_sec = 60
${CONFIG_END}
`;
}

export function formatAgentAdapterInstall(result: AgentAdapterInstallResult): string {
  const lines = ["Kairn agent adapters"];

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
