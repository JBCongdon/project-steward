import { createProjectLayout } from "../layout.js";

export async function initCommand(root: string): Promise<string> {
  const created = await createProjectLayout(root);

  if (created.length === 0) {
    return "Project Steward is already initialized.\n";
  }

  return `Project Steward initialized.\ncreated:\n${created
    .map((file) => `  - ${file}`)
    .join("\n")}\n`;
}
