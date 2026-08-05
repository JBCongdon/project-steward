import { addWaiver, readWaivers } from "../baseline.js";
import type { Waiver } from "../types.js";

export interface CommandResult {
  ok: boolean;
  text: string;
  data: unknown;
}

export async function waiverCommand(
  root: string,
  positionals: string[],
  values: Map<string, string>
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
      return {
        ok: false,
        text: `${validation.error}\n\n${usage()}`,
        data: { error: validation.error }
      };
    }

    const waiver = await addWaiver(root, validation.waiver);
    return {
      ok: true,
      text: `Waiver added for ${waiver.id ?? waiver.fingerprint} until ${waiver.expires}.\n`,
      data: waiver
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires))) {
    return { ok: false, error: "--expires must be YYYY-MM-DD." };
  }

  return {
    ok: true,
    waiver: {
      ...(id.startsWith("STW-") ? { id } : { fingerprint: id }),
      reason,
      owner,
      expires
    }
  };
}

function formatWaivers(waivers: Waiver[]): string {
  if (waivers.length === 0) {
    return "No waivers recorded.\n";
  }

  const lines = ["Project Steward waivers"];

  for (const waiver of waivers) {
    lines.push("");
    lines.push(`target: ${waiver.id ?? waiver.fingerprint}`);
    lines.push(`owner: ${waiver.owner}`);
    lines.push(`expires: ${waiver.expires}`);
    lines.push(`reason: ${waiver.reason}`);
  }

  return `${lines.join("\n")}\n`;
}

function usage(): string {
  return `Usage:
  steward waiver list [--json]
  steward waiver add <finding-id> --reason <text> --owner <name> --expires <YYYY-MM-DD>
`;
}
