<!-- This file was created by Project Steward. Human edits are welcome. -->

# Architecture

## Components

- `src/cli.ts`: command routing and process exit behavior
- `src/audit.ts`: detector orchestration, baseline handling, coverage summary, check budgets
- `src/baseline.ts`: accepted baseline and waiver persistence
- `src/detectors`: deterministic read-only detectors
- `src/sarif.ts`: SARIF export renderer
- `src/records.ts`: shared project-record classification helpers
- `src/indexer.ts`: rebuildable local index writer
- `src/layout.ts`: committed `.project/` layout creation and validation
- `src/policy.ts`: policy loading and defaults

## Flows

### Audit

Repository files are scanned by deterministic detectors. Findings are enriched with evidence, confidence, impact, reversibility, and approval metadata. Baseline and waiver records are applied after detection so raw detector behavior stays reproducible.

Audit reports baseline finding count and baseline age when `.project/audit-baseline.json` exists. Decision coverage counts ADR files only; `.project/decisions/index.md` is a project index, not a decision record.

### Waiver

`steward waiver add` records a suppression in `.project/waivers.json`. Waivers require a reason, owner, and expiry date. Audit still emits the underlying finding, but marks it `waived` while the waiver is active. Audit and status output report active and expired waiver counts.

### SARIF Export

`steward audit --sarif` and `steward check --sarif` render new, unwaived findings as SARIF 2.1.0. Baselined and waived findings remain available in JSON output but are omitted from SARIF to avoid flooding code-scanning tools with accepted legacy drift.

### Check

`steward check` runs audit, counts new unwaived findings by confidence band, applies policy drift budgets, and fails when coverage is degraded.

### Rebuild

`steward rebuild` writes `.steward/index/project-index.json`. The index is a cache, not authority.

## Trust Boundaries

- Project Steward reads source and documentation from the local repository.
- `.project/` is treated as committed and potentially public.
- `.steward/` may contain derived local state and must not be committed.
- Prompt/session capture is not implemented yet; redaction is required before any write path records agent session content.
