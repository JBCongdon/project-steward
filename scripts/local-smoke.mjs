#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
);
const cli = path.join(repoRoot, "dist", "cli.js");

if (!fs.existsSync(cli)) {
  fail("dist/cli.js does not exist. Run npm run build first.");
}

const tempRoots = [];

try {
  smokeCurrentRepo();
  smokeInitializedRepo();
  console.log("\nlocal smoke: passed");
} finally {
  for (const tempRoot of tempRoots) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function smokeCurrentRepo() {
  section("current repository");

  expectOutput("version", ["version"], `${packageJson.version}\n`);
  run("doctor", ["doctor"]);
  const detectors = runJson("detectors", ["detectors", "--json"]);
  assert(detectors.length >= 7, "expected detector catalog to include core detectors");

  const audit = runJson("audit", ["audit", "--json"]);
  assert(Array.isArray(audit.findings), "audit JSON should include findings array");
  console.log(`  audit findings: ${audit.findings.length}`);

  const packet = runJson("packet", [
    "packet",
    "Expand local Kairn dogfood testing",
    "--budget",
    "1200",
    "--json"
  ]);
  assert(packet.items.length > 0, "packet should include context items");

  const brief = runJson("brief", [
    "brief",
    "Expand local Kairn dogfood testing",
    "--budget",
    "1200",
    "--json"
  ]);
  assert(brief.packetId, "brief should include a packet id");

  if (isGitClean(repoRoot)) {
    run("check", ["check"]);
  } else {
    const check = run("check", ["check"], { allowFailure: true });
    console.log(`  check: observed exit ${check.status} in dirty worktree`);
  }
}

function smokeInitializedRepo() {
  section("throwaway initialized repository");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kairn-local-smoke-"));
  const agentHome = fs.mkdtempSync(path.join(os.tmpdir(), "kairn-local-smoke-agents-"));
  tempRoots.push(root);
  tempRoots.push(agentHome);
  const agentEnv = {
    CODEX_HOME: path.join(agentHome, "codex"),
    CLAUDE_HOME: path.join(agentHome, "claude"),
    GEMINI_HOME: path.join(agentHome, "gemini")
  };

  run("global setup", ["setup"], { env: agentEnv });
  assertGlobalAdapters(agentEnv);
  const globalStatus = runJson("global agent status", [
    "agents",
    "status",
    "--global",
    "--json"
  ], { env: agentEnv });
  assert(
    globalStatus.every((adapter) => adapter.installed),
    "global agent status should report installed adapters"
  );

  fs.writeFileSync(path.join(root, "README.md"), "# Local Smoke\n", "utf8");
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "Kairn Smoke"]);
  git(root, ["config", "user.email", "kairn-smoke@example.com"]);
  git(root, ["config", "commit.gpgsign", "false"]);
  git(root, ["add", "README.md"]);
  git(root, ["commit", "-m", "initial repository"]);

  run("init", ["init", "--root", root]);
  assertNoAgentAdapters(root);
  run("repository adapters install", ["agents", "install", "--root", root]);
  assertAgentAdapters(root);

  const untrackedAudit = runJson("audit detects untracked project records", [
    "audit",
    "--root",
    root,
    "--json"
  ]);
  assert(
    untrackedAudit.findings.some((finding) =>
      finding.message.includes(".project/project.md exists but is not tracked by git.")
    ),
    "fresh init before commit should report untracked .project records"
  );

  git(root, ["add", "."]);
  git(root, ["commit", "-m", "initialize kairn project"]);
  const cleanAudit = runJson("audit after committing project records", [
    "audit",
    "--root",
    root,
    "--json"
  ]);
  assert(cleanAudit.findings.length === 0, "committed initialized repo should audit clean");
  run("check after committing project records", ["check", "--root", root]);

  fs.appendFileSync(
    path.join(root, "README.md"),
    "\nSee [missing docs](docs/missing.md).\n",
    "utf8"
  );
  const driftCheck = run("check detects broken link", ["check", "--root", root], {
    allowFailure: true
  });
  assert(driftCheck.status !== 0, "broken link should fail check");

  run("accept baseline", ["audit", "--root", root, "--accept-baseline"]);
  git(root, ["add", "README.md", ".project/audit-baseline.json"]);
  git(root, ["commit", "-m", "accept existing drift baseline"]);
  run("check passes against committed baseline", ["check", "--root", root]);

  fs.appendFileSync(
    path.join(root, ".project", "project.md"),
    "\n## Local-only note\n\nThis should be committed or removed.\n",
    "utf8"
  );
  const dirtyAudit = runJson("audit detects dirty project record", [
    "audit",
    "--root",
    root,
    "--json"
  ]);
  assert(
    dirtyAudit.findings.some((finding) =>
      finding.message.includes(".project/project.md has uncommitted changes.")
    ),
    "dirty .project/project.md should be reported"
  );

  run("session start", [
    "session",
    "--root",
    root,
    "start",
    "--objective",
    "Run local Kairn smoke test"
  ]);
  run("session record", [
    "session",
    "--root",
    root,
    "record",
    "--file",
    "README.md",
    "--command",
    "npm test",
    "--test",
    "npm test",
    "--passed",
    "true"
  ]);
  run("reconcile dry-run", ["reconcile", "--root", root, "--dry-run"]);
  run("handoff", ["handoff", "--root", root]);

  const judgment = runJson("judge", [
    "judge",
    "Change authorization policy boundaries",
    "--json"
  ]);
  assert(judgment.classification, "judge should return a classification");
}

function assertAgentAdapters(root) {
  const adapterPaths = [
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".github/copilot-instructions.md",
    ".cursor/rules/kairn.mdc",
    ".codex/config.toml"
  ];

  for (const adapterPath of adapterPaths) {
    assert(
      fs.existsSync(path.join(root, adapterPath)),
      `expected kairn init to install ${adapterPath}`
    );
  }
}

function assertNoAgentAdapters(root) {
  for (const adapterPath of ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".codex/config.toml"]) {
    assert(
      !fs.existsSync(path.join(root, adapterPath)),
      `expected kairn init not to install ${adapterPath}`
    );
  }
}

function assertGlobalAdapters(env) {
  const adapterPaths = [
    path.join(env.CODEX_HOME, "AGENTS.md"),
    path.join(env.CODEX_HOME, "config.toml"),
    path.join(env.CLAUDE_HOME, "CLAUDE.md"),
    path.join(env.GEMINI_HOME, "GEMINI.md")
  ];

  for (const adapterPath of adapterPaths) {
    assert(fs.existsSync(adapterPath), `expected kairn setup to install ${adapterPath}`);
  }
}

function runJson(label, args, options = {}) {
  return JSON.parse(run(label, args, options).stdout);
}

function expectOutput(label, args, expected) {
  const result = run(label, args);
  assert(result.stdout === expected, `${label} expected ${JSON.stringify(expected)}`);
}

function run(label, args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8"
  });

  if (result.status !== 0 && !options.allowFailure) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
    fail(`${label} failed with exit code ${result.status}\n${details}`);
  }

  console.log(`  ok ${label}`);
  return result;
}

function git(cwd, args) {
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function isGitClean(cwd) {
  return execFileSync("git", ["status", "--porcelain"], {
    cwd,
    encoding: "utf8"
  }).trim().length === 0;
}

function section(label) {
  console.log(`\n${label}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function fail(message) {
  console.error(`local smoke: ${message}`);
  process.exit(1);
}
