# Agent Adapters

Kairn is meant to be picked up by local CLI agents from the repository, not remembered by a human in every chat.

`kairn init` writes common instruction surfaces:

- `AGENTS.md` for Codex and agents.md-compatible clients
- `CLAUDE.md` for Claude Code
- `GEMINI.md` for Gemini CLI
- `.github/copilot-instructions.md` for GitHub Copilot
- `.cursor/rules/kairn.mdc` for Cursor
- `.codex/config.toml` for the Kairn MCP server in Codex

Run this in an existing repository to install or refresh the adapters:

```sh
kairn agents install
```

Check adapter status with:

```sh
kairn agents status
```

Adapters are conservative. If a file already exists, Kairn appends a marked block instead of replacing human-authored instructions.

The installed instructions tell agents to:

- read `.project/` at task start
- prefer `kairn_*` MCP tools when available
- fall back to `kairn status` and `kairn brief "<objective>"`
- run `kairn judge "<objective>"` for architecture, policy, dependency, storage, protocol, security, or cross-module changes
- run `kairn reconcile --dry-run` and `kairn audit` or `kairn check` before claiming completion
- update handoff state for long-running or interrupted work
