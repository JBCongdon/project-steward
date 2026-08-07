# Context and MCP

Kairn can compile task-scoped context instead of dumping the whole repository into an agent session.

```sh
kairn packet "Add authorization checks to object downloads"
kairn brief "Add authorization checks to object downloads"
```

`packet` returns relevant files with explicit reasons, aggregate exclusions, nearest misses, and budget drops. `brief` turns the packet into an execution brief with required evidence, documentation obligations, prohibited actions, and a definition of done.

Use `--budget <tokens>` to cap the packet. Use `--json` for agent integrations.

## Packet Benchmark

Run labeled packet recall checks with:

```sh
kairn benchmark packets
```

Fixtures live under `fixtures/packet-benchmark`. Each case names an objective and the paths a useful packet must include.

## Retrieval Feedback

After a task, record which supplied paths were used and which touched files were missing from the packet:

```sh
kairn feedback --packet-id pkt-123 --supplied ".project/project.md,src/audit.ts" --touched "src/audit.ts,src/cli.ts"
```

Feedback is appended under `.kairn/feedback/` and is not committed by default.

## MCP

Run a local stdio MCP server:

```sh
kairn mcp
```

The server exposes read-only tools for status, audit, finding explanation, context packets, and execution briefs. It also exposes a rebuilt project index resource.

## Agent Adapters

`kairn setup` installs global instruction adapters so supported CLI agents can discover Kairn across repositories:

- `~/.codex/AGENTS.md`
- `~/.codex/config.toml`
- `~/.claude/CLAUDE.md`
- `~/.gemini/GEMINI.md`

Run this to install or refresh global setup:

```sh
kairn agents install --global
```

Repository-local adapters are optional and remain available for projects that intentionally want committed agent instructions:

```sh
kairn agents install
```

The instruction adapters tell agents to use Kairn MCP tools when available, fall back to the Kairn CLI, run `kairn brief` before broad edits, read `.project/` when durable memory exists, run `kairn judge` for decision-worthy work, and run `kairn reconcile --dry-run` plus `kairn audit` or `kairn check` before claiming completion.

The global Codex config registers the local stdio MCP server:

```toml
[mcp_servers.kairn]
command = "kairn"
args = ["mcp"]
```
