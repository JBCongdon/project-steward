<!-- KAIRN:BEGIN -->
## Kairn Agent Instructions

This repository uses Kairn for durable project memory. Do not ignore it.

At the start of substantial work:

- Read .project/status.md, .project/sessions/handoff.md, and the relevant active plan under .project/plans/active/.
- Prefer MCP tools named kairn_* when they are available.
- Otherwise run kairn status and kairn brief "<objective>" before broad edits.

During work:

- Treat .project/ as shared project memory that should be committed when it changes.
- Run kairn judge "<objective>" before changes to architecture, policy, dependencies, storage, protocols, security posture, or cross-module behavior.
- Use kairn adr propose --title "<title>" --objective "<objective>" --write when Kairn says a decision record is required.
- Record meaningful session evidence with kairn session record.

Before claiming done:

- Run the relevant tests or checks.
- Run kairn reconcile --dry-run.
- Run kairn audit or kairn check.
- Update .project/sessions/handoff.md with kairn handoff --write for long-running or interrupted work.

If the kairn command is unavailable, say that clearly and continue with the .project/ files manually.
<!-- KAIRN:END -->
