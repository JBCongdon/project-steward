import fs from "node:fs/promises";
import path from "node:path";
import { runAudit } from "./audit.js";
import { exists } from "./fsx.js";

export interface ExpectedFinding {
  detectorId: string;
  message: string;
}

export interface FixtureManifest {
  name: string;
  expectedFindings: ExpectedFinding[];
}

export interface FixtureEvalResult {
  name: string;
  fixturePath: string;
  passed: boolean;
  expected: number;
  actual: number;
  missing: ExpectedFinding[];
  unexpected: ExpectedFinding[];
}

export interface EvalResult {
  passed: boolean;
  fixtures: FixtureEvalResult[];
}

export async function runEvaluation(
  root: string,
  fixturesPath = path.join(root, "fixtures", "evaluation")
): Promise<EvalResult> {
  if (!(await exists(fixturesPath))) {
    return {
      passed: false,
      fixtures: [
        {
          name: "fixtures",
          fixturePath: fixturesPath,
          passed: false,
          expected: 0,
          actual: 0,
          missing: [],
          unexpected: [
            {
              detectorId: "eval",
              message: `Fixture directory does not exist: ${fixturesPath}`
            }
          ]
        }
      ]
    };
  }

  const entries = await fs.readdir(fixturesPath, { withFileTypes: true });
  const fixtureDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(fixturesPath, entry.name))
    .sort();

  const fixtures = await Promise.all(fixtureDirectories.map(evaluateFixture));

  return {
    passed: fixtures.every((fixture) => fixture.passed),
    fixtures
  };
}

async function evaluateFixture(fixturePath: string): Promise<FixtureEvalResult> {
  const manifestPath = path.join(fixturePath, "steward-fixture.json");
  const raw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as FixtureManifest;
  const report = await runAudit(fixturePath);
  const actual = report.findings
    .filter((finding) => finding.status === "new")
    .map((finding) => ({
      detectorId: finding.detectorId,
      message: finding.message
    }));

  const missing = manifest.expectedFindings.filter(
    (expected) => !actual.some((finding) => sameFinding(finding, expected))
  );
  const unexpected = actual.filter(
    (finding) =>
      !manifest.expectedFindings.some((expected) => sameFinding(finding, expected))
  );

  return {
    name: manifest.name,
    fixturePath,
    passed: missing.length === 0 && unexpected.length === 0,
    expected: manifest.expectedFindings.length,
    actual: actual.length,
    missing,
    unexpected
  };
}

function sameFinding(left: ExpectedFinding, right: ExpectedFinding): boolean {
  return left.detectorId === right.detectorId && left.message === right.message;
}
