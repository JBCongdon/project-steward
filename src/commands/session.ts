import {
  closeSession,
  formatSession,
  generateHandoff,
  readCurrentSession,
  reconcileDryRun,
  recordSessionEntry,
  startSession
} from "../session.js";

export async function sessionCommand(
  root: string,
  positionals: string[],
  values: Map<string, string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const [action] = positionals;

  if (action === "start") {
    const objective = values.get("objective") ?? positionals.slice(1).join(" ").trim();
    if (!objective) {
      return {
        ok: false,
        text: "Usage: kairn session start --objective <text>\n",
        data: { error: "objective-required" }
      };
    }

    const ledger = await startSession(root, objective);
    return { ok: true, text: formatSession(ledger), data: ledger };
  }

  if (action === "record") {
    const ledger = await recordSessionEntry(root, {
      file: values.get("file"),
      command: values.get("command"),
      test: values.get("test"),
      passed: passedValue(values.get("passed")),
      assumption: values.get("assumption"),
      deferred: values.get("deferred"),
      note: values.get("note")
    });
    return { ok: true, text: formatSession(ledger), data: ledger };
  }

  if (action === "status" || !action) {
    const ledger = await readCurrentSession(root);
    return { ok: true, text: formatSession(ledger), data: ledger ?? null };
  }

  if (action === "close") {
    const ledger = await closeSession(root);
    return { ok: true, text: formatSession(ledger), data: ledger };
  }

  return {
    ok: false,
    text: "Usage: kairn session start|record|status|close\n",
    data: { error: "unknown-session-action" }
  };
}

export async function handoffCommand(
  root: string,
  flags: Set<string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const result = await generateHandoff(root, { write: flags.has("write") });
  return {
    ok: true,
    text: result.wrote ? `Handoff written to .project/sessions/handoff.md\n` : result.text,
    data: result
  };
}

export async function reconcileCommand(
  root: string,
  flags: Set<string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  if (!flags.has("dry-run")) {
    return {
      ok: false,
      text: "Usage: kairn reconcile --dry-run [--json]\n",
      data: { error: "dry-run-required" }
    };
  }

  return reconcileDryRun(root);
}

function passedValue(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return ["1", "true", "yes", "passed", "pass"].includes(value.toLowerCase());
}
