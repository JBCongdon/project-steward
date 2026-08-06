# Continuity

Session continuity is local-first. Kairn records active work under `.kairn/sessions/` and only writes committed handoff text when asked.

```sh
kairn session start --objective "Ship context packets"
kairn session record --file src/context.ts --command "npm test" --test "npm test" --passed true
kairn session status
kairn reconcile --dry-run
kairn handoff --write
```

`reconcile --dry-run` reports candidate changed files, documentation updates, whether a decision may be required, and current audit findings. It does not edit files.

`handoff --write` updates `.project/sessions/handoff.md` from the current session ledger and audit state.
