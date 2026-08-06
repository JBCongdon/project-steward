import {
  addWaiver,
  pruneExpiredWaivers,
  readWaivers,
  renewWaiver,
  waiverIsActive
} from "../baseline.js";
import { findFindingById } from "../audit.js";
import type { Waiver } from "../types.js";

export interface CommandResult {
  ok: boolean;
  text: string;
  data: unknown;
}

export async function waiverCommand(
  root: string,
  positionals: string[],
  values: Map<string, string>,
  flags: Set<string> = new Set()
): Promise<CommandResult> {
  const [action, id] = positionals;

  if (action === "list") {
    const waivers = await readWaivers(root);
    return {
      ok: true,
      text: formatWaivers(waivers),
      data: waivers
    };
  }

  if (action === "add") {
    const validation = validateAdd(id, values);
    if (!validation.ok) {
      return failure(validation.error);
    }

    if (!flags.has("force")) {
      const finding = await findFindingById(root, id);
      if (!finding) {
        return {
          ok: false,
          text: `Finding not found in current audit: ${id}\nUse --force to record a waiver anyway.\n`,
          data: { error: "finding not found", target: id }
        };
      }
    }

    const waiver = await addWaiver(root, validation.waiver);
    return {
      ok: true,
      text: `Waiver added for ${waiver.id ?? waiver.fingerprint} until ${waiver.expires}.\n`,
      data: waiver
    };
  }

  if (action === "renew") {
    if (!id) {
      return failure("Missing finding id or fingerprint.");
    }

    const expires = values.get("expires");
    if (!expires) {
      return failure("Missing --expires.");
    }

    if (!validDate(expires)) {
      return failure("--expires must be YYYY-MM-DD.");
    }

    const waiver = await renewWaiver(root, id, expires);

    if (!waiver) {
      return {
        ok: false,
        text: `Waiver not found: ${id}\n`,
        data: { error: "waiver not found", target: id }
      };
    }

    return {
      ok: true,
      text: `Waiver renewed for ${waiver.id ?? waiver.fingerprint} until ${waiver.expires}.\n`,
      data: waiver
    };
  }

  if (action === "prune") {
    const result = await pruneExpiredWaivers(root);

    return {
      ok: true,
      text: `Pruned ${result.pruned.length} expired waiver(s); kept ${result.kept.length} active waiver(s).\n`,
      data: result
    };
  }

  return {
    ok: false,
    text: usage(),
    data: { error: "unknown waiver command" }
  };
}

function validateAdd(
  id: string | undefined,
  values: Map<string, string>
):
  | { ok: true; waiver: Waiver }
  | { ok: false; error: string } {
  if (!id) {
    return { ok: false, error: "Missing finding id or fingerprint." };
  }

  const reason = values.get("reason");
  const owner = values.get("owner");
  const expires = values.get("expires");

  if (!reason) {
    return { ok: false, error: "Missing --reason." };
  }

  if (!owner) {
    return { ok: false, error: "Missing --owner." };
  }

  if (!expires) {
    return { ok: false, error: "Missing --expires." };
  }

  if (!validDate(expires)) {
    return { ok: false, error: "--expires must be YYYY-MM-DD." };
  }

  return {
    ok: true,
    waiver: {
      ...(id.startsWith("KRN-") ? { id } : { fingerprint: id }),
      reason,
      owner,
      expires
    }
  };
}

function failure(error: string): CommandResult {
  return {
    ok: false,
    text: `${error}\n\n${usage()}`,
    data: { error }
  };
}

function formatWaivers(waivers: Waiver[]): string {
  if (waivers.length === 0) {
    return "No waivers recorded.\n";
  }

  const lines = ["Kairn waivers"];

  for (const waiver of waivers) {
    lines.push("");
    lines.push(`target: ${waiver.id ?? waiver.fingerprint}`);
    lines.push(`status: ${waiverIsActive(waiver) ? "active" : "expired"}`);
    lines.push(`owner: ${waiver.owner}`);
    lines.push(`expires: ${waiver.expires}`);
    lines.push(`reason: ${waiver.reason}`);
  }

  return `${lines.join("\n")}\n`;
}

function usage(): string {
  return `Usage:
  kairn waiver list [--json]
  kairn waiver add <finding-id> --reason <text> --owner <name> --expires <YYYY-MM-DD> [--force]
  kairn waiver renew <finding-id> --expires <YYYY-MM-DD>
  kairn waiver prune [--json]
`;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
