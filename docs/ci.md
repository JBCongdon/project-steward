# CI Usage

Use `steward check` in CI after initializing Project Steward in the repository.

```yaml
name: Project Steward

on:
  pull_request:

jobs:
  steward:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install -g github:JBCongdon/project-steward
      - run: steward check
```

Use `fetch-depth: 0` so future git-correlation detectors have history. When git history is unavailable, Project Steward reports degraded coverage instead of claiming a fully trustworthy clean result.

To produce SARIF:

```sh
steward check --sarif > steward.sarif
```

SARIF output includes only new, unwaived findings. Baselined and waived findings remain visible in JSON audit output.
