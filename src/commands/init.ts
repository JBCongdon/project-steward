import { createProjectLayout } from "../layout.js";

export async function initCommand(root: string): Promise<string> {
  const created = await createProjectLayout(root);

  if (created.length === 0) {
    return "Kairn is already initialized.\n";
  }

  const lines = ["Kairn initialized."];

  if (created.length > 0) {
    lines.push("project records:");
    lines.push(...created.map((file) => `  - ${file}`));
  }

  return `${lines.join("\n")}\n`;
}
