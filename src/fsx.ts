import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORES = new Set([
  ".git",
  ".kairn",
  "node_modules",
  "dist",
  "coverage"
]);

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeIfMissing(
  filePath: string,
  contents: string
): Promise<boolean> {
  if (await exists(filePath)) {
    return false;
  }

  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, "utf8");
  return true;
}

export async function readJson<T>(filePath: string): Promise<T | undefined> {
  if (!(await exists(filePath))) {
    return undefined;
  }

  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function walkFiles(
  root: string,
  options: { extensions?: string[]; includeHidden?: boolean; exclude?: string[] } = {}
): Promise<string[]> {
  const extensions = options.extensions;
  const files: string[] = [];

  async function visit(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!options.includeHidden && entry.name.startsWith(".")) {
        if (entry.name !== ".project") {
          continue;
        }
      }

      if (entry.isDirectory() && DEFAULT_IGNORES.has(entry.name)) {
        continue;
      }

      const absolute = path.join(dir, entry.name);
      const relative = toPosix(path.relative(root, absolute));

      if (shouldExclude(relative, options.exclude ?? [])) {
        continue;
      }

      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (extensions && !extensions.includes(path.extname(entry.name))) {
        continue;
      }

      files.push(path.relative(root, absolute));
    }
  }

  await visit(root);
  return files.sort();
}

export function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function shouldExclude(relativePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) {
      const base = pattern.slice(0, -3);
      return relativePath === base || relativePath.startsWith(`${base}/`);
    }

    return relativePath === pattern;
  });
}
