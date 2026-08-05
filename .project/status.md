<!-- This file was created by Project Steward. Human edits are welcome. -->

# Status

## Active Objectives

- Ship the S0/S1 open-source foundation:
  - repository layout
  - TypeScript CLI
  - deterministic audit findings
  - baseline ratcheting
  - CI-ready `check`
  - finding explanations
  - tests and contribution docs
  - public GitHub repository
  - waiver CLI
  - ADR quality detector
  - SARIF export for new findings

## Known Broken

- Git-correlation detectors are not implemented yet.
- Waiver expiry reporting is minimal.
- SARIF export is minimal and not yet schema-validated in tests.
- MCP context packet compilation is planned but not implemented.
- The local index is JSON-only and not yet a graph repository abstraction.
