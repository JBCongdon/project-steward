<!-- This file was created by Kairn. Human edits are welcome. -->

# Operations

- CI runs typecheck, tests, and build.
- CI runs the committed evaluation harness.
- CI runs the decision-study harness.
- Local dogfooding runs with `npm run test:local`.
- `kairn setup` installs global agent instructions and Codex MCP config once per machine so supported CLI-agent sessions discover Kairn across repositories.
- `kairn init` creates committed `.project/` memory for a repository; repository-local agent adapters are optional compatibility files installed with `kairn agents install`.
- Tag-triggered release verification runs typecheck, tests, build, benchmarks, eval, study, and `npm pack --dry-run`.
- The package is not published to npm yet; the GitHub `NPM_TOKEN` exists, but npm rejected `@jbcongdon/kairn@0.2.2` publishing with a registry 404. Verify npm username/scope ownership and token permissions.
- GitHub issues should be used for detector proposals, roadmap slices, and precision bugs.
- MCP support is exposed through `kairn mcp` as a local stdio server.
- Session continuity is recorded explicitly with `kairn session`; passive prompt capture is out of scope.
