# Evaluation Harness

Project Steward ships committed evaluation fixtures under `fixtures/evaluation`.

Run:

```sh
npm run build
npm run eval
```

or:

```sh
steward eval
steward eval --json
steward eval --fixtures fixtures/evaluation
```

Each fixture contains a `steward-fixture.json` manifest with the exact expected findings. The harness runs audit behavior against the fixture and fails if findings are missing or unexpected.

This repository excludes `fixtures/evaluation/**` in `.project/policy.yaml`. `steward eval` audits each fixture directory as its own root, so intentionally broken fixture content does not make the main project audit fail.

This is intentionally simple. The goal is to make detector regressions visible before the project grows a larger golden corpus.

Current fixtures:

- `basic-drift`: intentionally broken project records with expected findings
- `clean-project`: valid records with zero expected findings
