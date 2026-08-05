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
