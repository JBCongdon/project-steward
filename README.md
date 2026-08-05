# Project Steward

Project Steward is a vendor-neutral project intelligence layer for AI-assisted engineering.

It preserves project intent, decisions, plans, evidence, and drift signals so coding agents can work from the same durable understanding of a repository instead of starting from scratch every session.

GitHub: https://github.com/JBCongdon/project-steward

> Status: early open-source foundation. The current implementation covers the first read-only slice: project initialization, deterministic audit findings, baseline ratcheting, CI-style checks, and finding explanations.

## Why this exists

AI coding agents are fast, but project memory is fragile. Decisions get trapped in chat sessions, documentation drifts away from code, and "done" often means only that an agent stopped working.

Project Steward is designed around a stricter loop:

1. Plan the work.
2. Preserve the decisions.
3. Detect the drift.
4. Restore the project.

## Install from source

```sh
npm install
npm run build
npm link
```

Then run:

```sh
steward --help
```

## Current commands

```sh
steward init
steward doctor
steward rebuild
steward audit
steward audit --accept-baseline
steward check
steward status
steward explain finding <id>
```

All command output supports `--json` where useful.

## Core ideas

- The repository is the source of truth.
- Every finding carries evidence, confidence, and a deterministic fingerprint.
- A degraded run must never report a fully trustworthy "clean" result.
- Legacy repos need baseline ratcheting: gate new drift first, burn down old drift deliberately.
- Generated project knowledge must remain inspectable, human-editable, and reversible.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Product definition

The full product requirements document is preserved in [docs/project-steward-prd-full.md](docs/project-steward-prd-full.md).

## Contributing

Project Steward is intended to be built in public. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then look at the S0/S1 issues in the roadmap.
