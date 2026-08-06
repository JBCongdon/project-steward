<!-- This file was created by Project Steward. Human edits are welcome. -->

# Operations

- CI runs typecheck, tests, and build.
- CI runs the committed evaluation harness.
- CI should run `steward study` once the decision-study corpus is large enough to gate releases.
- GitHub releases are cut manually from tags.
- The package is not published to npm yet.
- GitHub issues should be used for detector proposals, roadmap slices, and precision bugs.
- MCP support is exposed through `steward mcp` as a local stdio server.
- Session continuity is recorded explicitly with `steward session`; passive prompt capture is out of scope.
