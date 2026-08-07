# Architecture

Kairn starts as a local CLI with a rebuildable repository index.

```text
repository files + git
        |
        v
   kairn rebuild
        |
        v
 .kairn/index/project-index.json
        |
        v
 audit / check / status / explain / packet / brief
```

The index is a cache, not authority. The committed `.project/` directory and the repository itself remain the source of truth.

## Boundaries

- `src/commands`: CLI command handlers
- `src/detectors`: read-only finding producers
- `src/indexer.ts`: rebuildable project index
- `src/audit.ts`: detector orchestration, baseline handling, policy budgets
- `src/baseline.ts`: audit baseline and waiver persistence
- `src/records.ts`: shared record classification helpers such as ADR filename recognition
- `src/sarif.ts`: SARIF rendering for new unwaived findings
- `src/evalHarness.ts`: committed fixture evaluation harness
- `src/layout.ts`: `.project/` layout creation and validation
- `src/context.ts`: context packet, execution brief, and retrieval feedback logic
- `src/mcpServer.ts`: read-only MCP server surface
- `src/session.ts`: local session ledger, handoff, and reconcile dry-run
- `src/judgment.ts`: intent classifier, Proposed ADR drafting, and decision-study harness

## Current Detectors

- `project-layout`: required committed `.project/` files
- `project-git-state`: required `.project` records and local governance files tracked by git
- `agent-adapters`: optional repository agent instruction files and Codex MCP config
- `policy-config`: policy YAML and supported field validation
- `markdown-links`: relative Markdown file targets and heading anchors
- `adr-quality`: ADR status and required sections
- `plan-state`: plan Status field vs. directory lifecycle state

`kairn detectors` renders this catalog with policy enabled/disabled state.

## Context

`kairn packet` scores repository files against an objective, includes every selected item with a reason, and reports aggregate exclusions plus nearest misses. `kairn brief` turns that packet into required evidence, documentation obligations, prohibited actions, and a definition of done. Retrieval feedback is appended under `.kairn/feedback/`.

## MCP

`kairn mcp` starts a local stdio MCP server exposing read-only tools for status, audit, context packets, execution briefs, and finding explanations. The server also exposes a rebuilt project index resource.

## Continuity and Judgment

Session ledgers live in `.kairn/sessions/` until `kairn handoff --write` updates `.project/sessions/handoff.md`. `kairn reconcile --dry-run` reports candidate documentation and decision follow-up without changing files.

`kairn judge` classifies objectives as routine, plan-required, or decision-required. `kairn adr propose` drafts `Status: Proposed` ADRs with unresolved decisions marked `PENDING`.

## Future Interfaces

The PRD calls for a graph repository abstraction from the first durable implementation. This initial version uses a JSON index only as a stepping stone; it should not leak into future query APIs.
