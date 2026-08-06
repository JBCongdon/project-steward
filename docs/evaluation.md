# Evaluation Harness

Kairn ships committed evaluation fixtures under `fixtures/evaluation`.

Run:

```sh
npm run build
npm run eval
```

or:

```sh
kairn benchmark packets
kairn eval
kairn eval --json
kairn eval --fixtures fixtures/evaluation
```

Each fixture contains a `kairn-fixture.json` manifest with the exact expected findings. The harness runs audit behavior against the fixture and fails if findings are missing or unexpected.

This repository excludes `fixtures/evaluation/**` in `.project/policy.yaml`. `kairn eval` audits each fixture directory as its own root, so intentionally broken fixture content does not make the main project audit fail.

This is intentionally simple. The goal is to make detector regressions visible before the project grows a larger golden corpus.

Current fixtures:

- `basic-drift`: intentionally broken project records with expected findings
- `clean-project`: valid records with zero expected findings

## Packet Benchmark

S2 packet recall fixtures live under `fixtures/packet-benchmark`.

Run:

```sh
npm run benchmark:packets
kairn benchmark packets --json
```

Each case declares an objective and a labeled `mustInclude` path set. The benchmark compiles a normal context packet and reports recall, average packet size, and missing required paths.

## Decision Study

S4 judgment fixtures live under `fixtures/decision-study`.

Run:

```sh
kairn study
kairn study --json
```

The current fixture proves the harness and naive-baseline comparison. It is not the full labeling study required by the S4 gate.
