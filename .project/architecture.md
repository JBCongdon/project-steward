<!-- This file was created by Project Steward. Human edits are welcome. -->

# Architecture

## Components

- `src/cli.ts`: command routing and process exit behavior
- `src/audit.ts`: detector orchestration, baseline handling, coverage summary, check budgets
- `src/baseline.ts`: accepted baseline and waiver persistence
- `src/detectors`: deterministic read-only detectors
- `src/sarif.ts`: SARIF export renderer
- `src/evalHarness.ts`: committed fixture evaluation harness
- `src/records.ts`: shared project-record classification helpers
- `src/indexer.ts`: rebuildable local index writer
- `src/layout.ts`: committed `.project/` layout creation and validation
- `src/policy.ts`: policy loading and defaults
- `src/context.ts`: context packet, execution brief, and retrieval feedback logic
- `src/mcpServer.ts`: read-only MCP stdio server
- `src/session.ts`: local session ledger, handoff, and reconcile dry-run
- `src/judgment.ts`: intent judgment, Proposed ADR drafting, and decision-study harness

## Flows

### Audit

Repository files are scanned by deterministic detectors. Findings are enriched with evidence, confidence, impact, reversibility, and approval metadata. Baseline and waiver records are applied after detection so raw detector behavior stays reproducible.

Audit reports baseline finding count and baseline age when `.project/audit-baseline.json` exists. Decision coverage counts ADR files only; `.project/decisions/index.md` is a project index, not a decision record.

`steward baseline status` inspects the accepted baseline. `steward baseline clear --force` removes it explicitly.

The current deterministic detector set covers required layout files, git tracking for required project records and local governance files, policy configuration, relative Markdown links and heading anchors, ADR quality, and plan lifecycle state.

`steward detectors` lists the detector catalog with policy enabled/disabled state.

### Evaluation

`steward eval` runs committed fixtures from `fixtures/evaluation` and compares exact expected findings against audit output. CI runs the harness after build.

Normal audit honors repository-specific exclusions from `.project/policy.yaml`. This repository excludes `fixtures/evaluation/**`; evaluation audits each fixture as its own root so intentional drift fixtures do not pollute the repository's own audit.

### Waiver

`steward waiver add` records a suppression in `.project/waivers.json`. Waivers require a reason, owner, and expiry date. By default, waiver creation verifies that the target exists in the current audit; `--force` records an offline waiver deliberately. Audit still emits the underlying finding, but marks it `waived` while the waiver is active. Audit and status output report active and expired waiver counts. `steward waiver renew` updates expiry, and `steward waiver prune` removes expired waivers explicitly.

### SARIF Export

`steward audit --sarif` and `steward check --sarif` render new, unwaived findings as SARIF 2.1.0. Baselined and waived findings remain available in JSON output but are omitted from SARIF to avoid flooding code-scanning tools with accepted legacy drift.

### Check

`steward check` runs audit, counts new unwaived findings by confidence band, applies policy drift budgets, and fails when coverage is degraded.

### Rebuild

`steward rebuild` writes `.steward/index/project-index.json`. The index is a cache, not authority.

### Context and MCP

`steward packet` compiles deterministic task-scoped context with reasons, budget accounting, aggregate exclusions, and nearest misses. `steward brief` derives execution obligations from the packet.

`steward feedback` appends retrieval feedback under `.steward/feedback/`.

`steward mcp` exposes read-only status, audit, context packet, execution brief, and finding explanation tools over stdio.

### Continuity and Judgment

`steward session` records active local work under `.steward/sessions/`. `steward handoff --write` updates `.project/sessions/handoff.md` only when explicitly requested. `steward reconcile --dry-run` reports candidate follow-up without writing files.

`steward judge` classifies objectives as routine, plan-required, or decision-required. `steward adr propose` creates Proposed ADR drafts with unresolved decisions marked `PENDING`.

## Trust Boundaries

- Project Steward reads source and documentation from the local repository.
- `.project/` is treated as committed and potentially public.
- `.steward/` may contain derived local state and must not be committed.
- Session ledgers are explicit CLI records, not passive prompt capture.
- Redaction is required before any future automatic session capture or write path records agent session content.
