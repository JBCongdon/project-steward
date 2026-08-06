import fs from "node:fs/promises";
import path from "node:path";
import { compileContextPacket } from "./context.js";
import { exists, toPosix, walkFiles } from "./fsx.js";
import type { PacketBenchmarkCaseResult, PacketBenchmarkResult } from "./types.js";

interface PacketBenchmarkCase {
  name: string;
  objective: string;
  mustInclude: string[];
  budgetTokens?: number;
}

const DEFAULT_FIXTURES = "fixtures/packet-benchmark";
const DEFAULT_TARGET_RECALL = 1;

export async function runPacketBenchmark(
  root: string,
  options: { fixturesPath?: string; targetRecall?: number } = {}
): Promise<PacketBenchmarkResult> {
  const fixturesPath = path.isAbsolute(options.fixturesPath ?? "")
    ? options.fixturesPath!
    : path.join(root, options.fixturesPath ?? DEFAULT_FIXTURES);
  const targetRecall = options.targetRecall ?? DEFAULT_TARGET_RECALL;

  if (!(await exists(fixturesPath))) {
    return {
      version: 1,
      caseCount: 0,
      totalRequired: 0,
      totalIncludedRequired: 0,
      recall: 0,
      averagePacketItems: 0,
      targetRecall,
      passed: false,
      cases: []
    };
  }

  const fixtureFiles = await walkFiles(fixturesPath, {
    extensions: [".json"],
    includeHidden: true
  });
  const cases = (
    await Promise.all(
      fixtureFiles.map(async (fixture) => {
        const raw = await fs.readFile(path.join(fixturesPath, fixture), "utf8");
        return JSON.parse(raw) as PacketBenchmarkCase[];
      })
    )
  ).flat();

  const results = await Promise.all(
    cases.map((fixture) => runCase(root, fixture))
  );
  const totalRequired = results.reduce(
    (sum, result) => sum + result.required.length,
    0
  );
  const totalIncludedRequired = results.reduce(
    (sum, result) => sum + result.included.length,
    0
  );
  const averagePacketItems =
    results.length === 0
      ? 0
      : results.reduce((sum, result) => sum + result.itemCount, 0) / results.length;
  const recall = ratio(totalIncludedRequired, totalRequired);

  return {
    version: 1,
    caseCount: results.length,
    totalRequired,
    totalIncludedRequired,
    recall,
    averagePacketItems,
    targetRecall,
    passed: results.length > 0 && recall >= targetRecall,
    cases: results
  };
}

export function formatPacketBenchmark(result: PacketBenchmarkResult): string {
  const lines = [
    "Kairn packet benchmark",
    `cases: ${result.caseCount}`,
    `recall: ${result.recall.toFixed(3)} (${result.totalIncludedRequired}/${result.totalRequired})`,
    `average packet items: ${result.averagePacketItems.toFixed(1)}`,
    `target recall: ${result.targetRecall.toFixed(3)}`,
    `gate: ${result.passed ? "passed" : "failed"}`
  ];

  for (const item of result.cases) {
    lines.push("");
    lines.push(`${item.passed ? "PASS" : "FAIL"} ${item.name}`);
    lines.push(`  packet: ${item.packetId}`);
    lines.push(`  recall: ${item.recall.toFixed(3)} (${item.included.length}/${item.required.length})`);
    if (item.missing.length > 0) {
      lines.push(`  missing: ${item.missing.join(", ")}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function runCase(
  root: string,
  fixture: PacketBenchmarkCase
): Promise<PacketBenchmarkCaseResult & { passed: boolean }> {
  const packet = await compileContextPacket(root, fixture.objective, {
    budgetTokens: fixture.budgetTokens
  });
  const packetPaths = new Set(packet.items.map((item) => item.path));
  const required = normalizePaths(fixture.mustInclude);
  const included = required.filter((item) => packetPaths.has(item));
  const missing = required.filter((item) => !packetPaths.has(item));
  const recall = ratio(included.length, required.length);

  return {
    name: fixture.name,
    objective: fixture.objective,
    packetId: packet.id,
    required,
    included,
    missing,
    itemCount: packet.items.length,
    recall,
    passed: missing.length === 0
  };
}

function normalizePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.map((item) => toPosix(item.trim())).filter(Boolean))).sort();
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}
