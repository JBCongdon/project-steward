# Quickstart

Kairn is currently installed from source.

```sh
git clone https://github.com/JBCongdon/kairn.git
cd kairn
npm install
npm run build
npm link
```

In a repository you want to inspect:

```sh
kairn init
kairn audit
kairn check
```

For a legacy repository with existing findings:

```sh
kairn audit
kairn audit --accept-baseline
kairn baseline status
kairn check
```

After accepting a baseline, `kairn check` gates new unwaived findings while keeping the accepted backlog visible in audit output.

Useful commands:

```sh
kairn detectors
kairn baseline status
kairn audit --json
kairn audit --sarif > kairn.sarif
kairn explain finding <id>
kairn waiver add <id> --reason "temporary exception" --owner "you" --expires 2026-12-31
```

For agent work, start with a scoped context packet and brief:

```sh
kairn packet "Add authorization checks to downloads"
kairn brief "Add authorization checks to downloads"
```

Track a work session and prepare handoff:

```sh
kairn session start --objective "Add authorization checks to downloads"
kairn session record --file src/auth.ts --command "npm test" --test "npm test" --passed true
kairn reconcile --dry-run
kairn handoff --write
```

For changes that may alter architecture, policy, dependencies, storage, protocols, or security posture:

```sh
kairn judge "Change authentication policy for downloads"
kairn adr propose --title "Authentication Policy for Downloads" --objective "Change authentication policy for downloads"
```

Tune policy in `.project/policy.yaml`, including detector enablement, drift budgets, and `exclude_paths`.

Kairn treats `.project/` as committed project memory. Review those files before committing them.

`kairn audit` reports required `.project/` records, baselines, and waivers that exist locally but are not tracked by git.
