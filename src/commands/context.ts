import {
  compileContextPacket,
  compileExecutionBrief,
  formatContextPacket,
  formatExecutionBrief,
  recordRetrievalFeedback
} from "../context.js";

export async function packetCommand(
  root: string,
  positionals: string[],
  values: Map<string, string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const objective = objectiveFrom(positionals, values);
  if (!objective) {
    return {
      ok: false,
      text: "Usage: kairn packet <objective> [--budget <tokens>] [--json]\n",
      data: { error: "objective-required" }
    };
  }

  const packet = await compileContextPacket(root, objective, {
    budgetTokens: numberValue(values.get("budget"))
  });

  return {
    ok: true,
    text: formatContextPacket(packet),
    data: packet
  };
}

export async function briefCommand(
  root: string,
  positionals: string[],
  values: Map<string, string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const objective = objectiveFrom(positionals, values);
  if (!objective) {
    return {
      ok: false,
      text: "Usage: kairn brief <objective> [--budget <tokens>] [--json]\n",
      data: { error: "objective-required" }
    };
  }

  const brief = await compileExecutionBrief(root, objective, {
    budgetTokens: numberValue(values.get("budget"))
  });

  return {
    ok: true,
    text: formatExecutionBrief(brief),
    data: brief
  };
}

export async function feedbackCommand(
  root: string,
  values: Map<string, string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const packetId = values.get("packet-id") ?? values.get("packet");
  if (!packetId) {
    return {
      ok: false,
      text: "Usage: kairn feedback --packet-id <id> --supplied <paths> --touched <paths> [--objective <text>] [--json]\n",
      data: { error: "packet-id-required" }
    };
  }

  const feedback = await recordRetrievalFeedback(root, {
    packetId,
    objective: values.get("objective"),
    supplied: splitPaths(values.get("supplied")),
    touched: splitPaths(values.get("touched"))
  });

  return {
    ok: true,
    text: [
      "Retrieval feedback recorded",
      `packet: ${feedback.packetId}`,
      `supplied: ${feedback.supplied.length}`,
      `touched: ${feedback.touched.length}`,
      `ignored supplied: ${feedback.ignoredSupplied.length}`,
      `touched without context: ${feedback.touchedWithoutContext.length}`
    ].join("\n") + "\n",
    data: feedback
  };
}

function objectiveFrom(positionals: string[], values: Map<string, string>): string | undefined {
  const objective = values.get("objective") ?? positionals.join(" ").trim();
  return objective || undefined;
}

function numberValue(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitPaths(value: string | undefined): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}
