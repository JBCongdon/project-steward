# Roadmap

The roadmap follows the evidence-gated sequence from the PRD.

## S0 Foundation

- `init`, `doctor`, `rebuild`
- `.project/` storage layout
- `.steward/` rebuildable local cache
- Policy engine skeleton
- Graph/index repository interface

Gate: the local index is fully rebuildable from repository files.

## S1 Read-Only Value

- Deterministic audit detectors
- `check` for CI-style policy enforcement
- Baseline ratcheting
- Waivers with reason and expiry
- Explain-the-finding
- Governance coverage summary
- Degraded-mode reporting
- Initial golden corpus fixtures

Gate: high-confidence deterministic findings are reproducible and avoid false positives on the corpus.

## S2 Context

- MCP server
- Context packet compilation
- Execution brief
- Retrieval feedback capture

Gate: packet recall target met on labeled benchmark.

## Later

S3 continuity, S4 judgment, S5 write path, S6 repair, S7 governance, S8 intelligence, and S9 scale remain intentionally unshipped until the earlier trust gates hold.
