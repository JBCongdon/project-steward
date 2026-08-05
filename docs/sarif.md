# SARIF Export

Project Steward emits SARIF 2.1.0 for CI and code-scanning integrations.

```sh
steward audit --sarif > steward.sarif
steward check --sarif > steward.sarif
```

The SARIF export includes only findings with `status: new`. Baselined and waived findings remain available through JSON audit output, but are omitted from SARIF to prevent first-run finding avalanches in code-scanning systems.

Each result includes:

- `ruleId`: the Project Steward detector id
- `partialFingerprints.stewardFingerprint`: the deterministic finding fingerprint
- `properties.stewardId`: the human-facing finding id
- `properties.confidence`: high, medium, or low
- `properties.evidence`: the evidence records behind the finding

Run-level invocation properties include degraded coverage, coverage counts, and waiver counts.

The current exporter is intentionally minimal. It should grow only around concrete consumer requirements.
