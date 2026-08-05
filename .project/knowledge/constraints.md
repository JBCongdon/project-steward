<!-- This file was created by Project Steward. Human edits are welcome. -->

# Constraints

- Audit detectors must be read-only.
- Deterministic findings must use stable fingerprints.
- `check` must fail when coverage is degraded.
- `.steward/` must remain gitignored.
- JSON output is the primary machine contract.
- Model-assisted findings must not gate CI by default when introduced.
- Waivers must require a reason, owner, and expiry.
- SARIF export must not include baselined or waived findings by default.
- Decision coverage must count ADR files, not decision directory indexes.
- Audit output must report baseline age when a baseline exists.
- Plan lifecycle detectors must compare Status fields against plan directory state.
- Invalid policy configuration must emit findings rather than crashing audit.
- Expired waivers must be removed only by explicit command.
- Markdown link checking must validate heading anchors for Markdown targets.
- Waiver creation must reject unknown current-audit findings unless explicitly forced.
- Detector regressions should be covered by committed evaluation fixtures.
- Normal audit must exclude intentional evaluation fixtures.
- Shallow git clones must be reported as degraded coverage.
- Required `.project/` records must be tracked by git when git is available.
