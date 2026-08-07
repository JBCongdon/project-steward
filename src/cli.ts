#!/usr/bin/env node
import path from "node:path";
import { runAudit, checkDriftBudget } from "./audit.js";
import { agentsCommand } from "./commands/agents.js";
import { baselineCommand } from "./commands/baseline.js";
import { benchmarkCommand } from "./commands/benchmark.js";
import { packetCommand, briefCommand, feedbackCommand } from "./commands/context.js";
import { detectorsCommand } from "./commands/detectors.js";
import { doctorCommand } from "./commands/doctor.js";
import { evalCommand } from "./commands/eval.js";
import { explainFindingCommand } from "./commands/explain.js";
import { initCommand } from "./commands/init.js";
import { adrCommand, judgeCommand, studyCommand } from "./commands/judgment.js";
import { handoffCommand, reconcileCommand, sessionCommand } from "./commands/session.js";
import { statusCommand } from "./commands/status.js";
import { waiverCommand } from "./commands/waiver.js";
import { VERSION } from "./constants.js";
import { rebuildIndex } from "./indexer.js";
import { startMcpServer } from "./mcpServer.js";
import { formatAudit, formatIndex, printJson } from "./output.js";
import { formatSarif } from "./sarif.js";

interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Set<string>;
  values: Map<string, string>;
  root: string;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.flags.has("version") || parsed.command === "version") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  if (!parsed.command || parsed.flags.has("help") || parsed.flags.has("h")) {
    process.stdout.write(helpText());
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

    case "baseline": {
      const result = await baselineCommand(parsed.root, parsed.positionals, parsed.flags);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "agents": {
      const result = await agentsCommand(parsed.root, parsed.positionals);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "benchmark": {
      const result = await benchmarkCommand(parsed.root, parsed.positionals, parsed.values);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "detectors": {
      const result = await detectorsCommand(parsed.root);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      return;
    }

    case "eval": {
      const result = await evalCommand(parsed.root, parsed.values.get("fixtures"));
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "mcp": {
      await startMcpServer(parsed.root);
      return;
    }

    case "packet": {
      const result = await packetCommand(parsed.root, parsed.positionals, parsed.values);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "brief": {
      const result = await briefCommand(parsed.root, parsed.positionals, parsed.values);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "feedback": {
      const result = await feedbackCommand(parsed.root, parsed.values);
      if (parsed.flags.has("json")) {
        printJson(result.data);
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

      if (parsed.flags.has("sarif")) {
        printJson(formatSarif(report));
      } else if (parsed.flags.has("json")) {
        printJson(report);
      } else {
        process.stdout.write(formatAudit(report));
      }
      return;
    }

    case "check": {
      const result = await checkDriftBudget(parsed.root);
      if (parsed.flags.has("sarif")) {
        printJson(formatSarif(result.report));
      } else if (parsed.flags.has("json")) {
        printJson(result);
      } else {
        process.stdout.write(`Kairn check ${result.passed ? "passed" : "failed"}\n`);
        process.stdout.write(`${result.summary}\n`);
      }
      process.exitCode = result.passed ? 0 : 1;
      return;
    }

    case "status": {
      process.stdout.write(await statusCommand(parsed.root));
      return;
    }

    case "session": {
      const result = await sessionCommand(parsed.root, parsed.positionals, parsed.values);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "handoff": {
      const result = await handoffCommand(parsed.root, parsed.flags);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "reconcile": {
      const result = await reconcileCommand(parsed.root, parsed.flags);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "judge": {
      const result = await judgeCommand(parsed.positionals, parsed.values);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "adr": {
      const result = await adrCommand(
        parsed.root,
        parsed.positionals,
        parsed.values,
        parsed.flags
      );
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "study": {
      const result = await studyCommand(parsed.root, parsed.values);
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    case "explain": {
      const [kind, id] = parsed.positionals;
      if (kind !== "finding") {
        process.stdout.write("Usage: kairn explain finding <id>\n");
        process.exitCode = 1;
        return;
      }

      const result = await explainFindingCommand(parsed.root, id);
      process.stdout.write(result.text);
      process.exitCode = result.found ? 0 : 1;
      return;
    }

    case "waiver": {
      const result = await waiverCommand(
        parsed.root,
        parsed.positionals,
        parsed.values,
        parsed.flags
      );
      if (parsed.flags.has("json")) {
        printJson(result.data);
      } else {
        process.stdout.write(result.text);
      }
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    default:
      process.stderr.write(`Unknown command: ${parsed.command}\n\n${helpText()}`);
      process.exitCode = 1;
  }
}

function parseArgs(args: string[]): ParsedArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const positionals: string[] = [];
  let root = process.cwd();
  const valueFlags = new Set([
    "assumption",
    "budget",
    "command",
    "deferred",
    "expires",
    "file",
    "fixtures",
    "note",
    "objective",
    "owner",
    "packet",
    "packet-id",
    "passed",
    "reason",
    "supplied",
    "test",
    "title",
    "touched",
    "target-recall"
  ]);

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
      const [rawName, inlineValue] = arg.slice(2).split("=", 2);
      const name = rawName;
      const next = args[index + 1];

      if (inlineValue !== undefined) {
        values.set(name, inlineValue);
        flags.add(name);
        continue;
      }

      if (valueFlags.has(name) && next && !next.startsWith("-")) {
        values.set(name, next);
        flags.add(name);
        index += 1;
        continue;
      }

      flags.add(name);
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
    values,
    root
  };
}

function helpText(): string {
  return `Kairn ${VERSION}

Usage:
  kairn init [--root <path>]
  kairn doctor [--json]
  kairn agents install|status [--json]
  kairn baseline status [--json]
  kairn baseline clear --force [--json]
  kairn benchmark packets [--fixtures <path>] [--target-recall <0-1>] [--json]
  kairn detectors [--json]
  kairn eval [--json] [--fixtures <path>]
  kairn mcp
  kairn rebuild [--json]
  kairn packet <objective> [--budget <tokens>] [--json]
  kairn brief <objective> [--budget <tokens>] [--json]
  kairn feedback --packet-id <id> --supplied <paths> --touched <paths> [--json]
  kairn audit [--json|--sarif] [--accept-baseline]
  kairn check [--json|--sarif]
  kairn status
  kairn session start --objective <text>
  kairn session record [--file <path>] [--command <cmd>] [--test <cmd>] [--passed true|false]
  kairn session status
  kairn session close
  kairn handoff [--write] [--json]
  kairn reconcile --dry-run [--json]
  kairn judge <objective> [--json]
  kairn adr propose --title <title> --objective <text> [--write] [--json]
  kairn study [--fixtures <path>] [--json]
  kairn explain finding <id>
  kairn waiver list [--json]
  kairn waiver add <finding-id> --reason <text> --owner <name> --expires <YYYY-MM-DD> [--force]
  kairn waiver renew <finding-id> --expires <YYYY-MM-DD>
  kairn waiver prune [--json]

Kairn is a vendor-neutral project intelligence layer for AI-assisted engineering.
`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
