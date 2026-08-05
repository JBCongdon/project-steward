<!-- This file was created by Project Steward. Human edits are welcome. -->

# S0/S1 Open-Source Foundation

Status: Active

## Objective

Turn the Project Steward PRD into a public open-source repository with a runnable read-only foundation.

## Tasks

- [x] Create repository metadata and OSS docs
- [x] Implement CLI command routing
- [x] Implement `.project/` initialization
- [x] Implement deterministic audit detector framework
- [x] Implement baseline ratcheting
- [x] Implement CI-style `check`
- [x] Add tests for determinism and baseline behavior
- [x] Publish public GitHub repository
- [x] Add waiver CLI
- [x] Add ADR quality detector
- [x] Add SARIF export for new findings
- [x] Report active and expired waiver counts
- [x] Report audit baseline age
- [x] Count only ADR files as decision records
- [x] Add plan lifecycle detector
- [x] Add GitHub issue and PR templates
- [x] Add waiver renew/prune commands
- [x] Add policy configuration detector
- [x] Validate Markdown heading anchors
- [x] Validate waiver targets by default
- [x] Add detector catalog command
- [x] Add committed evaluation harness and first fixture
- [x] Add quickstart and CI usage docs
- [x] Add shallow git clone degraded-mode detection

## Required Evidence

- `npm run check`
- `npm test`
- `npm run build`
- `npm run eval`
- `steward audit`
- `gh repo create project-steward --public --source=. --remote=origin --push`
- `steward audit --sarif`
- `steward check --sarif`
