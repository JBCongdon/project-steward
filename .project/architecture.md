<!-- This file was created by Project Steward. Human edits are welcome. -->

# Architecture

## Components

- `src/cli.ts`: command routing and process exit behavior
- `src/audit.ts`: detector orchestration, baseline handling, coverage summary, check budgets
- `src/detectors`: deterministic read-only detectors
- `src/indexer.ts`: rebuildable local index writer
- `src/layout.ts`: committed `.project/` layout creation and validation
- `src/policy.ts`: policy loading and defaults

## Flows

### Audit

Repository files are scanned by deterministic detectors. Findings are enriched with evidence, confidence, impact, reversibility, and approval metadata. Baseline and waiver records are applied after detection so raw detector behavior stays reproducible.

### Check

`steward check` runs audit, counts new unwaived findings by confidence band, applies policy drift budgets, and fails when coverage is degraded.

### Rebuild

`steward rebuild` writes `.steward/index/project-index.json`. The index is a cache, not authority.

## Trust Boundaries

- Project Steward reads source and documentation from the local repository.
- `.project/` is treated as committed and potentially public.
- `.steward/` may contain derived local state and must not be committed.
- Prompt/session capture is not implemented yet; redaction is required before any write path records agent session content.
