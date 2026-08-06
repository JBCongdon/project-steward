# Judgment

Kairn includes a conservative judgment layer for work that may need a plan or ADR before implementation.

```sh
kairn judge "Change authentication policy for object downloads"
```

Classifications:

- `routine`: proceed and record evidence.
- `plan-required`: update an active plan before implementation.
- `decision-required`: draft a Proposed ADR before implementation.

Draft an ADR without writing it:

```sh
kairn adr propose --title "Authentication Policy for Downloads" --objective "Change authentication policy for object downloads"
```

Write the proposed record:

```sh
kairn adr propose --title "Authentication Policy for Downloads" --objective "Change authentication policy for object downloads" --write
```

Generated ADRs start as `Status: Proposed` and keep the actual decision as `PENDING` until evidence and human review support acceptance.

## Decision Study

Run the labeled decision-study harness:

```sh
kairn study
```

The first fixture is intentionally small. The S4 gate still requires a larger hand-labeled study before decision detection is treated as a moat rather than a heuristic.
