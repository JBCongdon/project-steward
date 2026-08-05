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
- [ ] Publish public GitHub repository

## Required Evidence

- `npm run check`
- `npm test`
- `npm run build`
- `steward audit`
