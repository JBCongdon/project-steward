#!/usr/bin/env node
import path from "node:path";
import { runAudit, checkDriftBudget } from "./audit.js";
import { doctorCommand } from "./commands/doctor.js";
import { explainFindingCommand } from "./commands/explain.js";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { VERSION } from "./constants.js";
import { rebuildIndex } from "./indexer.js";
import { formatAudit, formatIndex, printJson } from "./output.js";

interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Set<string>;
  root: string;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed.command || parsed.flags.has("help") || parsed.flags.has("h")) {
    process.stdout.write(helpText());
    return;
  }

  if (parsed.flags.has("version") || parsed.command === "version") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  switch (parsed.command) {
    case "init": {
      process.stdout.write(await initCommand(parsed.root));
      return;
    }

    case "doctor": {
      const result = await doctorCommand(parsed.root);
      if (parsed.flags.has("json")) {
        printJson(result);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "rebuild":
    case "index": {
      const index = await rebuildIndex(parsed.root);
      if (parsed.flags.has("json")) {
        printJson(index);
      } else {
        process.stdout.write(`${formatIndex(index)}\n`);
      }
      return;
    }

    case "audit": {
      const report = await runAudit(parsed.root, {
        acceptBaseline: parsed.flags.has("accept-baseline")
      });

      if (parsed.flags.has("json")) {
        printJson(report);
      } else {
        process.stdout.write(formatAudit(report));
      }
      return;
    }

    case "check": {
      const result = await checkDriftBudget(parsed.root);
      if (parsed.flags.has("json")) {
        printJson(result);
      } else {
        process.stdout.write(`Project Steward check ${result.passed ? "passed" : "failed"}\n`);
        process.stdout.write(`${result.summary}\n`);
      }
      process.exitCode = result.passed ? 0 : 1;
      return;
    }

    case "status": {
      process.stdout.write(await statusCommand(parsed.root));
      return;
    }

    case "explain": {
      const [kind, id] = parsed.positionals;
      if (kind !== "finding") {
        process.stdout.write("Usage: steward explain finding <id>\n");
        process.exitCode = 1;
        return;
      }

      const result = await explainFindingCommand(parsed.root, id);
      process.stdout.write(result.text);
      process.exitCode = result.found ? 0 : 1;
      return;
    }

    default:
      process.stderr.write(`Unknown command: ${parsed.command}\n\n${helpText()}`);
      process.exitCode = 1;
  }
}

function parseArgs(args: string[]): ParsedArgs {
  const flags = new Set<string>();
  const positionals: string[] = [];
  let root = process.cwd();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--root") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("--root requires a path");
      }
      root = path.resolve(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      flags.add(arg.slice(2));
      continue;
    }

    if (arg.startsWith("-")) {
      for (const flag of arg.slice(1)) {
        flags.add(flag);
      }
      continue;
    }

    positionals.push(arg);
  }

  return {
    command: positionals.shift(),
    positionals,
    flags,
    root
  };
}

function helpText(): string {
  return `Project Steward ${VERSION}

Usage:
  steward init [--root <path>]
  steward doctor [--json]
  steward rebuild [--json]
  steward audit [--json] [--accept-baseline]
  steward check [--json]
  steward status
  steward explain finding <id>

Project Steward is a vendor-neutral project intelligence layer for AI-assisted engineering.
`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
