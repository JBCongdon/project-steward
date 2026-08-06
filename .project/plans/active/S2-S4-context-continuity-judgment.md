<!-- This file was created by Kairn. Human edits are welcome. -->

# S2-S4 Context, Continuity, and Judgment

Status: Active

## Objective

Build usable S2 through S4 workflows: context packets and MCP access, session continuity, and conservative decision judgment.

## Tasks

- [x] Add deterministic context packet compilation
- [x] Add execution brief generation
- [x] Add retrieval feedback capture
- [x] Add read-only MCP server tools/resources
- [x] Add session ledger commands
- [x] Add handoff generation
- [x] Add reconcile dry-run
- [x] Add intent judgment classifier
- [x] Add Proposed ADR flow
- [x] Add decision-study harness and first fixture
- [x] Add packet benchmark with labeled must-include sets
- [ ] Run decision labeling study beyond toy fixtures
- [ ] Add second agent adapter documentation
- [ ] Expand packet benchmark beyond the first Kairn-local cases

## Required Evidence

- `npm run check`
- `npm test`
- `npm run build`
- `npm run benchmark:packets`
- `npm run eval`
- `kairn packet <objective>`
- `kairn brief <objective>`
- `kairn mcp` smoke test through an MCP client
- `kairn session start --objective <text>`
- `kairn reconcile --dry-run`
- `kairn judge <objective>`
- `kairn study`
