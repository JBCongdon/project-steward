<!-- This file was created by Kairn. Human edits are welcome. -->

# Project

## Purpose

Kairn is a vendor-neutral project intelligence layer for AI-assisted engineering.

It maintains durable, evidence-backed records of project intent, decisions, plans, evidence, and drift so coding agents and human maintainers can work from the same project memory.

## Users

- Solo and small-team developers using multiple coding agents
- Tech leads who need evidence-backed completion and drift checks
- Platform and DevEx teams standardizing AI-assisted engineering workflows
- Security and compliance engineers who need trust-boundary and classification awareness

## Boundaries

- Local-first CLI and repository records are in scope first.
- MCP integration is planned after read-only audit value is proven.
- Autonomous code cleanup is out of scope until the read-only trust gates are met.
- `.project/` is committed and human-editable.
- `.kairn/` is a rebuildable local cache and must remain gitignored.

## Principles

- The repository is the source of truth.
- Every finding carries evidence, confidence, and a deterministic fingerprint where possible.
- Degraded runs must report degraded coverage instead of claiming cleanliness.
- Legacy repositories must support baseline ratcheting.
- Generated knowledge must not overwrite human-authored prose without explicit approval.
