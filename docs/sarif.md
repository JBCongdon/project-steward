# SARIF Export

Kairn emits SARIF 2.1.0 for CI and code-scanning integrations.

```sh
kairn audit --sarif > kairn.sarif
kairn check --sarif > kairn.sarif
```

The SARIF export includes only findings with `status: new`. Baselined and waived findings remain available through JSON audit output, but are omitted from SARIF to prevent first-run finding avalanches in code-scanning systems.

Each result includes:

- `ruleId`: the Kairn detector id
- `partialFingerprints.kairnFingerprint`: the deterministic finding fingerprint
- `properties.kairnId`: the human-facing finding id
- `properties.confidence`: high, medium, or low
- `properties.evidence`: the evidence records behind the finding

Run-level invocation properties include degraded coverage, coverage counts, baseline summary, and waiver counts.

The current exporter is intentionally minimal. It should grow only around concrete consumer requirements.
