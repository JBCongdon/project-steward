# Architecture

Project Steward starts as a local CLI with a rebuildable repository index.

```text
repository files + git
        |
        v
   steward rebuild
        |
        v
 .steward/index/project-index.json
        |
        v
 audit / check / status / explain
```

The index is a cache, not authority. The committed `.project/` directory and the repository itself remain the source of truth.

## Boundaries

- `src/commands`: CLI command handlers
- `src/detectors`: read-only finding producers
- `src/indexer.ts`: rebuildable project index
- `src/audit.ts`: detector orchestration, baseline handling, policy budgets
- `src/baseline.ts`: audit baseline and waiver persistence
- `src/sarif.ts`: SARIF rendering for new unwaived findings
- `src/layout.ts`: `.project/` layout creation and validation

## Future Interfaces

The PRD calls for a graph repository abstraction from the first durable implementation. This initial version uses a JSON index only as a stepping stone; it should not leak into future query APIs.
