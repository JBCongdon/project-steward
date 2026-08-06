import {
  formatDecisionStudy,
  formatJudgment,
  judgeIntent,
  proposeAdr,
  runDecisionStudy
} from "../judgment.js";

export async function judgeCommand(
  positionals: string[],
  values: Map<string, string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const objective = values.get("objective") ?? positionals.join(" ").trim();
  if (!objective) {
    return {
      ok: false,
      text: "Usage: kairn judge <objective> [--json]\n",
      data: { error: "objective-required" }
    };
  }

  const judgment = judgeIntent(objective);
  return { ok: true, text: formatJudgment(judgment), data: judgment };
}

export async function adrCommand(
  root: string,
  positionals: string[],
  values: Map<string, string>,
  flags: Set<string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const [action] = positionals;
  if (action !== "propose") {
    return {
      ok: false,
      text: "Usage: kairn adr propose --title <title> --objective <text> [--write] [--json]\n",
      data: { error: "unknown-adr-action" }
    };
  }

  const title = values.get("title");
  const objective = values.get("objective") ?? positionals.slice(1).join(" ").trim();
  if (!title || !objective) {
    return {
      ok: false,
      text: "Usage: kairn adr propose --title <title> --objective <text> [--write] [--json]\n",
      data: { error: "title-and-objective-required" }
    };
  }

  const result = await proposeAdr(root, {
    title,
    objective,
    write: flags.has("write")
  });

  return {
    ok: true,
    text: result.wrote
      ? `Proposed ADR written to ${result.path}\n`
      : `${result.text}\n`,
    data: result
  };
}

export async function studyCommand(
  root: string,
  values: Map<string, string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const result = await runDecisionStudy(root, values.get("fixtures"));
  return {
    ok: result.passed,
    text: formatDecisionStudy(result),
    data: result
  };
}
