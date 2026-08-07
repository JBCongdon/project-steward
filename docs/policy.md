# Policy

Kairn reads `.project/policy.yaml`.

Current fields:

```yaml
exclude_paths:
  - fixtures/evaluation/**
detectors:
  project-layout: true
  project-git-state: true
  agent-adapters: true
  policy-config: true
  markdown-links: true
  adr-quality: true
  plan-state: true
drift_budget:
  high_confidence_findings_max: 0
  medium_confidence_findings_max: 15
plans:
  stale_after_days: 30
```

`exclude_paths` supports exact paths and directory-prefix patterns ending in `/**`.

The `policy-config` detector reports invalid policy values so configuration mistakes do not silently change audit behavior.
