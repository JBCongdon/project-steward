import path from "node:path";
import fs from "node:fs/promises";
import { GENERATED_MARKER, PROJECT_DIR, REQUIRED_PROJECT_FILES } from "./constants.js";
import { defaultPolicyYaml } from "./policy.js";
import { ensureDir, exists, writeIfMissing } from "./fsx.js";

export async function createProjectLayout(root: string): Promise<string[]> {
  const created: string[] = [];

  const directories = [
    ".project/decisions",
    ".project/plans/active",
    ".project/plans/completed",
    ".project/plans/abandoned",
    ".project/knowledge",
    ".project/sessions/ledger",
    ".project/receipts"
  ];

  for (const directory of directories) {
    await ensureDir(path.join(root, directory));
  }

  const templates: Record<string, string> = {
    "project.md": `${GENERATED_MARKER}

# Project

## Purpose

Describe what this repository is for.

## Users

- TBD

## Boundaries

- TBD

## Principles

- The repository is the source of truth.
`,
    "architecture.md": `${GENERATED_MARKER}

# Architecture

## Components

- TBD

## Flows

- TBD

## Trust Boundaries

- TBD
`,
    "glossary.md": `${GENERATED_MARKER}

# Glossary

| Term | Meaning |
|---|---|
| TBD | TBD |
`,
    "status.md": `${GENERATED_MARKER}

# Status

## Active Objectives

- None recorded.

## Known Broken

- None recorded.
`,
    "policy.yaml": defaultPolicyYaml(),
    "decisions/index.md": `${GENERATED_MARKER}

# Decision Records

No ADRs recorded yet.
`,
    "knowledge/constraints.md": `${GENERATED_MARKER}

# Constraints

No constraints recorded yet.
`,
    "knowledge/assumptions.md": `${GENERATED_MARKER}

# Assumptions

No assumptions recorded yet.
`,
    "knowledge/operations.md": `${GENERATED_MARKER}

# Operations

No operational notes recorded yet.
`,
    "knowledge/security.md": `${GENERATED_MARKER}

# Security

No security notes recorded yet.
`,
    "sessions/handoff.md": `${GENERATED_MARKER}

# Handoff

No active handoff.
`
  };

  for (const [relative, contents] of Object.entries(templates)) {
    const wrote = await writeIfMissing(path.join(root, PROJECT_DIR, relative), contents);
    if (wrote) {
      created.push(path.join(PROJECT_DIR, relative));
    }
  }

  await ensureGitignore(root);
  return created;
}

export async function requiredProjectFileStatus(root: string): Promise<{
  present: string[];
  missing: string[];
}> {
  const present: string[] = [];
  const missing: string[] = [];

  for (const relative of REQUIRED_PROJECT_FILES) {
    const target = path.join(root, PROJECT_DIR, relative);
    if (await exists(target)) {
      present.push(relative);
    } else {
      missing.push(relative);
    }
  }

  return { present, missing };
}

async function ensureGitignore(root: string): Promise<void> {
  const gitignore = path.join(root, ".gitignore");
  const line = ".steward/";

  if (!(await exists(gitignore))) {
    await writeIfMissing(gitignore, `${line}\n`);
    return;
  }

  const contents = await fs.readFile(gitignore, "utf8");
  const entries = contents.split(/\r?\n/).map((entry) => entry.trim());

  if (entries.includes(line)) {
    return;
  }

  const separator = contents.endsWith("\n") || contents.length === 0 ? "" : "\n";
  await fs.writeFile(gitignore, `${contents}${separator}${line}\n`, "utf8");
}
