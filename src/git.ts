import { execFileSync } from "node:child_process";

export interface GitInfo {
  isGitRepository: boolean;
  isShallow: boolean;
  root?: string;
  commit: string;
  degraded?: string;
}

export function getGitInfo(root: string): GitInfo {
  try {
    const gitRoot = execGit(root, ["rev-parse", "--show-toplevel"]);
    const commit = execGit(root, ["rev-parse", "HEAD"]);
    const isShallow = execGit(root, ["rev-parse", "--is-shallow-repository"]) === "true";
    return {
      isGitRepository: true,
      isShallow,
      root: gitRoot,
      commit,
      degraded: isShallow
        ? "Shallow clone detected; git-correlation detectors are disabled."
        : undefined
    };
  } catch {
    return {
      isGitRepository: false,
      isShallow: false,
      commit: "no-git",
      degraded: "No git history available; git-correlation detectors are disabled."
    };
  }
}

function execGit(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}
