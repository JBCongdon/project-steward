import { execFileSync } from "node:child_process";

export interface GitInfo {
  isGitRepository: boolean;
  root?: string;
  commit: string;
  degraded?: string;
}

export function getGitInfo(root: string): GitInfo {
  try {
    const gitRoot = execGit(root, ["rev-parse", "--show-toplevel"]);
    const commit = execGit(root, ["rev-parse", "HEAD"]);
    return {
      isGitRepository: true,
      root: gitRoot,
      commit
    };
  } catch {
    return {
      isGitRepository: false,
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
