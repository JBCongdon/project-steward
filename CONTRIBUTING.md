# Contributing

Thanks for helping build Project Steward.

This project is early. The highest-value contributions are small, deterministic, and well-tested:

- New read-only detectors with clear precision boundaries
- Better explanations for existing findings
- Fixture repos for the evaluation harness
- Documentation that clarifies behavior without promising unbuilt capability

## Local setup

```sh
npm install
npm run build
npm test
```

## Engineering principles

- Prefer deterministic detectors for CI-gated behavior.
- Label model-assisted behavior clearly when it arrives.
- Never silently skip unavailable inputs.
- Do not generate or rewrite human-authored project records unless the user explicitly asks.
- JSON is the primary contract; text output is a rendering.

## Pull requests

Please include:

- A short description of the user-visible behavior
- Tests or fixtures for detector changes
- Any precision caveats or degraded-mode behavior
