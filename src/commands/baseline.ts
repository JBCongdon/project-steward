import { clearBaseline, readBaseline, summarizeBaseline } from "../baseline.js";

export async function baselineCommand(
  root: string,
  positionals: string[],
  flags: Set<string> = new Set()
): Promise<{
  ok: boolean;
  text: string;
  data: unknown;
}> {
  const [action = "status"] = positionals;

  if (action === "status") {
    const summary = summarizeBaseline(await readBaseline(root));
    return {
      ok: true,
      text: summary
        ? `Baseline: ${summary.findingCount} finding(s), ${summary.ageDays} day(s) old at ${summary.baselineCommit}\n`
        : "No baseline recorded.\n",
      data: summary ?? null
    };
  }

  if (action === "clear") {
    if (!flags.has("force")) {
      return {
        ok: false,
        text: "Refusing to clear baseline without --force.\n",
        data: { error: "missing --force" }
      };
    }

    const cleared = await clearBaseline(root);
    return {
      ok: true,
      text: cleared ? "Baseline cleared.\n" : "No baseline recorded.\n",
      data: { cleared }
    };
  }

  return {
    ok: false,
    text: usage(),
    data: { error: "unknown baseline command" }
  };
}

function usage(): string {
  return `Usage:
  steward baseline status [--json]
  steward baseline clear --force [--json]
`;
}
