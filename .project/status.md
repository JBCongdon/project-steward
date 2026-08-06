<!-- This file was created by Kairn. Human edits are welcome. -->

# Status

## Active Objectives

- Ship usable S2-S4 workflows:
  - context packet compilation
  - execution briefs
  - retrieval feedback capture
  - read-only MCP server
  - local session ledger
  - handoff generation
  - reconcile dry-run
  - intent judgment classifier
  - Proposed ADR flow
  - decision-study harness
  - packet recall benchmark
  - initial git-correlation detectors
  - tag-triggered release verification

## Known Broken

- Deeper git-correlation detectors beyond stale active plans and dirty `.project` records are not implemented yet.
- Evaluation corpus is still small and needs more language/framework fixtures.
- Package is not published to npm yet; release automation skips publish until `NPM_TOKEN` is configured.
- The local index is JSON-only and not yet a graph repository abstraction.
- Packet recall benchmark has only the first Kairn-local labeled cases.
- Decision-study corpus is a tiny fixture, not the full S4 labeling study.
- Second agent adapter documentation is not written yet.
