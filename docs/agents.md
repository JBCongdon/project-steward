# Agent Setup

Kairn is meant to be installed once so local CLI agents pick it up automatically across prompts and projects.

Run:

```sh
kairn setup
```

This installs global Kairn instructions for:

- Codex: `~/.codex/AGENTS.md`
- Claude Code: `~/.claude/CLAUDE.md`
- Gemini CLI: `~/.gemini/GEMINI.md`

It also registers the Kairn MCP server in global Codex config:

```toml
[mcp_servers.kairn]
command = "kairn"
args = ["mcp"]
startup_timeout_sec = 10
tool_timeout_sec = 60
```

Check global setup with:

```sh
kairn agents status --global
```

The global instructions tell agents to:

- prefer `kairn_*` MCP tools when available
- fall back to `kairn status` and `kairn brief "<objective>"`
- use Kairn read-only in repositories without `.project/`
- read `.project/` when durable project memory exists
- run `kairn judge "<objective>"` for architecture, policy, dependency, storage, protocol, security, or cross-module changes
- run `kairn reconcile --dry-run` and `kairn audit` or `kairn check` before claiming completion
- update handoff state for long-running or interrupted work when `.project/` exists

## Repository Adapters

Repository-local adapters are optional. Use them when a project wants committed instructions for teammates, hosted agents, or tools that do not read global config:

```sh
kairn agents install
kairn agents status
```

Repository adapters can create or update:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/kairn.mdc`
- `.codex/config.toml`

Adapters are conservative. If a file already exists, Kairn appends a marked block instead of replacing human-authored instructions.

The `agent-adapters` audit detector is disabled by default. Enable it in `.project/policy.yaml` only for projects that require committed repository-local adapters.
