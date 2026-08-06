<!-- This file was created by Kairn. Human edits are welcome. -->

# ADR-0001: Use TypeScript for the initial CLI

Status: Accepted

## Context

Kairn needs an open-source foundation that can provide immediate local value, support JSON-first command output, and later expose an MCP server.

## Decision

Use TypeScript on Node.js for the initial CLI.

## Drivers

- Low contribution friction for agent-tooling contributors
- Strong MCP ecosystem fit
- Fast iteration for read-only detectors and command contracts
- Good enough local filesystem and git integration for S0/S1

## Consequences

- Native single-binary distribution is deferred.
- Language-specific static analysis should be implemented behind detector interfaces so it can use the best tool per ecosystem.
- Node.js version support is constrained to modern maintained runtimes.

## Rollback

If TypeScript becomes a bottleneck, keep the command JSON contracts stable and replace internals with a Go or Rust implementation.
