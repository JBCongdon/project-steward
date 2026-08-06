<!-- This file was created by Kairn. Human edits are welcome. -->

# Operations

- CI runs typecheck, tests, and build.
- CI runs the committed evaluation harness.
- CI runs the decision-study harness.
- Tag-triggered release verification runs typecheck, tests, build, benchmarks, eval, study, and `npm pack --dry-run`.
- The package is not published to npm yet; release publishing needs the `NPM_TOKEN` repository secret or local `npm login`.
- GitHub issues should be used for detector proposals, roadmap slices, and precision bugs.
- MCP support is exposed through `kairn mcp` as a local stdio server.
- Session continuity is recorded explicitly with `kairn session`; passive prompt capture is out of scope.
