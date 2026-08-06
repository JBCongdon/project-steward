# CI Usage

Use `kairn check` in CI after initializing Kairn in the repository.

```yaml
name: Kairn

on:
  pull_request:

jobs:
  kairn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install -g github:JBCongdon/kairn
      - run: kairn check
```

Use `fetch-depth: 0` so git-correlation detectors have history. When git history is unavailable, Kairn reports degraded coverage instead of claiming a fully trustworthy clean result.

Shallow clones are treated as degraded for the same reason.

To produce SARIF:

```sh
kairn check --sarif > kairn.sarif
```

SARIF output includes only new, unwaived findings. Baselined and waived findings remain visible in JSON audit output.

For this repository's own CI, run the detector and judgment harnesses after build:

```sh
npm test
npm run benchmark:packets
npm run eval
npm run study
```

The test suite includes SARIF 2.1.0 schema validation for generated SARIF output. The packet benchmark gates labeled context-packet recall.
