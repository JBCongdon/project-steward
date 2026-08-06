# Context and MCP

Kairn can compile task-scoped context instead of dumping the whole repository into an agent session.

```sh
kairn packet "Add authorization checks to object downloads"
kairn brief "Add authorization checks to object downloads"
```

`packet` returns relevant files with explicit reasons, aggregate exclusions, nearest misses, and budget drops. `brief` turns the packet into an execution brief with required evidence, documentation obligations, prohibited actions, and a definition of done.

Use `--budget <tokens>` to cap the packet. Use `--json` for agent integrations.

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
