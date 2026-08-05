import fs from "node:fs/promises";
import path from "node:path";
import { PROJECT_DIR, STEWARD_DIR } from "./constants.js";
import { ensureDir, exists, toPosix, walkFiles, writeJson } from "./fsx.js";
import { getGitInfo } from "./git.js";
import type { ProjectIndex } from "./types.js";

export async function rebuildIndex(root: string): Promise<ProjectIndex> {
  const git = getGitInfo(root);
  const markdownFiles = await walkFiles(root, {
    extensions: [".md"],
    includeHidden: true
  });

  const documents = markdownFiles.map((relative) => ({
    path: toPosix(relative),
    kind: classifyDocument(relative)
  }));

  const decisions = await collectRecords(root, ".project/decisions", "decision");
  const plans = [
    ...(await collectRecords(root, ".project/plans/active", "active")),
    ...(await collectRecords(root, ".project/plans/completed", "completed")),
    ...(await collectRecords(root, ".project/plans/abandoned", "abandoned"))
  ];

  const index: ProjectIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    root,
    baselineCommit: git.commit,
    documents,
    decisions: decisions.map((record) => ({
      path: record.path,
      status: record.status
    })),
    plans: plans.map((record) => ({
      path: record.path,
      status: record.status
    }))
  };

  const indexPath = path.join(root, STEWARD_DIR, "index", "project-index.json");
  await ensureDir(path.dirname(indexPath));
  await writeJson(indexPath, index);
  return index;
}

async function collectRecords(
  root: string,
  relativeDirectory: string,
  defaultStatus: string
): Promise<Array<{ path: string; status: string }>> {
  const absoluteDirectory = path.join(root, relativeDirectory);
  if (!(await exists(absoluteDirectory))) {
    return [];
  }

  const files = await walkFiles(absoluteDirectory, {
    extensions: [".md"],
    includeHidden: true
  });

  return Promise.all(
    files.map(async (relative) => {
      const absolute = path.join(absoluteDirectory, relative);
      const contents = await fs.readFile(absolute, "utf8");
      return {
        path: toPosix(path.join(relativeDirectory, relative)),
        status: readStatus(contents) ?? defaultStatus
      };
    })
  );
}

function classifyDocument(relative: string): string {
  const normalized = toPosix(relative);

  if (normalized.startsWith(`${PROJECT_DIR}/decisions/`)) {
    return "decision";
  }

  if (normalized.startsWith(`${PROJECT_DIR}/plans/`)) {
    return "plan";
  }

  if (normalized.startsWith(`${PROJECT_DIR}/knowledge/`)) {
    return "knowledge";
  }

  if (normalized.startsWith(PROJECT_DIR)) {
    return "project";
  }

  if (normalized.startsWith("docs/")) {
    return "docs";
  }

  return "markdown";
}

function readStatus(contents: string): string | undefined {
  const match = contents.match(/^Status:\s*(.+)$/im);
  return match?.[1]?.trim();
}
