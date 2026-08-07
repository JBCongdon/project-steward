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
  - local dogfood smoke test
  - install-once global agent setup with optional repository-local adapters

## Known Broken

- Deeper git-correlation detectors beyond stale active plans and dirty `.project` records are not implemented yet.
- Evaluation corpus is still small and needs more language/framework fixtures.
- Package is not published to npm yet; the GitHub secret exists, but npm rejected `@jbcongdon/kairn@0.2.2` publishing with a registry 404, so npm scope/token permissions still need correction.
- The local index is JSON-only and not yet a graph repository abstraction.
- Packet recall benchmark has only the first Kairn-local labeled cases.
- Decision-study corpus is a tiny fixture, not the full S4 labeling study.
- Global agent setup covers first common CLI surfaces; deeper adapter verification across vendor versions remains.
