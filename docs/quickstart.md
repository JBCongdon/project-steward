# Quickstart

Project Steward is currently installed from source.

```sh
git clone https://github.com/JBCongdon/project-steward.git
cd project-steward
npm install
npm run build
npm link
```

In a repository you want to inspect:

```sh
steward init
steward audit
steward check
```

For a legacy repository with existing findings:

```sh
steward audit
steward audit --accept-baseline
steward check
```

After accepting a baseline, `steward check` gates new unwaived findings while keeping the accepted backlog visible in audit output.

Useful commands:

```sh
steward detectors
steward audit --json
steward audit --sarif > steward.sarif
steward explain finding <id>
steward waiver add <id> --reason "temporary exception" --owner "you" --expires 2026-12-31
```

Tune policy in `.project/policy.yaml`, including detector enablement, drift budgets, and `exclude_paths`.

Project Steward treats `.project/` as committed project memory. Review those files before committing them.

`steward audit` reports required `.project/` records that exist locally but are not tracked by git.
