import { formatPacketBenchmark, runPacketBenchmark } from "../packetBenchmark.js";

export async function benchmarkCommand(
  root: string,
  positionals: string[],
  values: Map<string, string>
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const [kind] = positionals;

  if (kind !== "packets") {
    return {
      ok: false,
      text: "Usage: kairn benchmark packets [--fixtures <path>] [--target-recall <0-1>] [--json]\n",
      data: { error: "unknown-benchmark" }
    };
  }

  const result = await runPacketBenchmark(root, {
    fixturesPath: values.get("fixtures"),
    targetRecall: numberValue(values.get("target-recall"))
  });

  return {
    ok: result.passed,
    text: formatPacketBenchmark(result),
    data: result
  };
}

function numberValue(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
