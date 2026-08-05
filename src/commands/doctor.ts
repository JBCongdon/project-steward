import { getGitInfo } from "../git.js";
import { requiredProjectFileStatus } from "../layout.js";

export async function doctorCommand(root: string): Promise<{
  ok: boolean;
  text: string;
}> {
  const git = getGitInfo(root);
  const project = await requiredProjectFileStatus(root);
  const ok = git.isGitRepository && project.missing.length === 0;
  const lines: string[] = [];

  lines.push("Project Steward doctor");
  lines.push(`git: ${git.isGitRepository ? `ok (${git.commit})` : "missing"}`);
  if (git.isShallow) {
    lines.push("git history: shallow clone");
  }
  lines.push(
    `.project layout: ${project.present.length}/${project.present.length + project.missing.length} required files present`
  );

  if (project.missing.length > 0) {
    lines.push("missing:");
    for (const missing of project.missing) {
      lines.push(`  - .project/${missing}`);
    }
  }

  return {
    ok,
    text: `${lines.join("\n")}\n`
  };
}
