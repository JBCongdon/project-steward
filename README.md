# Kairn

Kairn is a vendor-neutral project intelligence layer for AI-assisted engineering.

It preserves project intent, decisions, plans, evidence, and drift signals so coding agents can work from the same durable understanding of a repository instead of starting from scratch every session.

GitHub: https://github.com/JBCongdon/kairn

> Status: usable early open-source foundation. The current implementation covers read-only audit, baseline ratcheting, context packets, MCP access, session handoff, reconcile dry-run, and conservative decision judgment.

Current deterministic detectors:

- required `.project/` layout
- git tracking for required `.project/` records
- policy configuration
- relative Markdown links and heading anchors
- ADR quality
- plan lifecycle state

## Why this exists

AI coding agents are fast, but project memory is fragile. Decisions get trapped in chat sessions, documentation drifts away from code, and "done" often means only that an agent stopped working.

Kairn is designed around a stricter loop:

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
kairn --help
```

See [docs/quickstart.md](docs/quickstart.md) for first-run usage on another repository.

## Current commands

```sh
kairn init
kairn doctor
kairn baseline status
kairn detectors
kairn eval
kairn study
kairn mcp
kairn rebuild
kairn packet "Add authorization checks to downloads"
kairn brief "Add authorization checks to downloads"
kairn feedback --packet-id <id> --supplied <paths> --touched <paths>
kairn audit
kairn audit --sarif > kairn.sarif
kairn audit --accept-baseline
kairn baseline clear --force
kairn check
kairn check --sarif > kairn.sarif
kairn status
kairn session start --objective "Ship context packets"
kairn session record --file src/context.ts --command "npm test"
kairn handoff --write
kairn reconcile --dry-run
kairn judge "Change authentication policy"
kairn adr propose --title "Authentication Policy" --objective "Change authentication policy"
kairn explain finding <id>
kairn waiver list
kairn waiver add <finding-id> --reason "why" --owner "name" --expires 2026-12-31
kairn waiver renew <finding-id> --expires 2027-01-31
kairn waiver prune
```

All command output supports `--json` where useful.

Use `kairn detectors` to inspect available detectors and whether policy currently enables them.

Use `kairn eval` to run the committed detector evaluation fixtures.

Tune detector behavior in `.project/policy.yaml`. See [docs/policy.md](docs/policy.md).

SARIF export emits new, unwaived findings only. Baselined and waived findings remain visible in `kairn audit --json`, but are left out of SARIF so first adoption does not flood code-scanning tools with accepted legacy drift.

## Core ideas

- The repository is the source of truth.
- Every finding carries evidence, confidence, and a deterministic fingerprint.
- A degraded run must never report a fully trustworthy "clean" result.
- Legacy repos need baseline ratcheting: gate new drift first, burn down old drift deliberately, and report baseline age.
- Waivers require a reason, owner, and expiry, and audit reports active vs. expired counts.
- Waiver creation checks that the finding exists in the current audit unless `--force` is used.
- Expired waivers can be pruned explicitly with `kairn waiver prune`.
- Generated project knowledge must remain inspectable, human-editable, and reversible.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Evaluation

Detector behavior is checked against committed fixtures:

```sh
npm run build
npm run eval
```

See [docs/evaluation.md](docs/evaluation.md).

## Context and Continuity

Use [docs/context.md](docs/context.md) for context packets, execution briefs, retrieval feedback, and MCP setup.

Use [docs/continuity.md](docs/continuity.md) for session ledgers, handoffs, and reconcile dry-runs.

Use [docs/judgment.md](docs/judgment.md) for intent judgment, proposed ADRs, and the S4 decision-study harness.

## Interoperability

Kairn can emit SARIF 2.1.0 for tools such as GitHub code scanning:

```sh
kairn audit --sarif > kairn.sarif
```

See [docs/ci.md](docs/ci.md) for CI usage.

## Product definition

The full product requirements document is preserved in [docs/kairn-prd-full.md](docs/kairn-prd-full.md).

## Contributing

Kairn is intended to be built in public. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then look at the active plan in `.project/plans/active`.
