import { runEvaluation } from "../evalHarness.js";

export async function evalCommand(
  root: string,
  fixturesPath?: string
): Promise<{
  ok: boolean;
  text: string;
  data: unknown;
}> {
  const result = await runEvaluation(root, fixturesPath);
  const lines = [`Kairn evaluation ${result.passed ? "passed" : "failed"}`];

  for (const fixture of result.fixtures) {
    lines.push("");
    lines.push(
      `${fixture.passed ? "PASS" : "FAIL"} ${fixture.name}: expected ${fixture.expected}, actual ${fixture.actual}`
    );

    for (const missing of fixture.missing) {
      lines.push(`  missing: [${missing.detectorId}] ${missing.message}`);
    }

    for (const unexpected of fixture.unexpected) {
      lines.push(`  unexpected: [${unexpected.detectorId}] ${unexpected.message}`);
    }
  }

  return {
    ok: result.passed,
    text: `${lines.join("\n")}\n`,
    data: result
  };
}
