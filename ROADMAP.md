# Roadmap

The roadmap follows the evidence-gated sequence from the PRD.

## S0 Foundation

- `init`, `doctor`, `rebuild`
- `.project/` storage layout
- `.kairn/` rebuildable local cache
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

- MCP server: shipped as `kairn mcp` with read-only tools/resources
- Context packet compilation: shipped as `kairn packet`
- Execution brief: shipped as `kairn brief`
- Retrieval feedback capture: shipped as `kairn feedback`

Gate: packet recall target met on labeled benchmark.

## S3 Continuity

- Session ledger: shipped as `kairn session`
- Handoff: shipped as `kairn handoff`
- Reconcile dry-run: shipped as `kairn reconcile --dry-run`
- Second agent adapter documentation: planned

Gate: cross-agent handoff succeeds on a repository the demo author did not write.

## S4 Judgment

- Intent classifier: shipped as `kairn judge`
- Plan threshold: shipped as `plan-required` judgment
- Proposed ADR flow: shipped as `kairn adr propose`
- Decision detection study: harness shipped as `kairn study`; corpus expansion planned

Gate: decision-detection labeling study complete.

## Later

S5 write path, S6 repair, S7 governance, S8 intelligence, and S9 scale remain intentionally unshipped until the earlier trust gates hold.
