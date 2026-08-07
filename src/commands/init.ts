import { createProjectLayout } from "../layout.js";
import { formatAgentAdapterInstall, installAgentAdapters } from "../agentAdapters.js";

export async function initCommand(root: string): Promise<string> {
  const created = await createProjectLayout(root);
  const adapters = await installAgentAdapters(root);

  if (created.length === 0 && adapters.created.length === 0 && adapters.updated.length === 0) {
    return "Kairn is already initialized.\n";
  }

  const lines = ["Kairn initialized."];

  if (created.length > 0) {
    lines.push("project records:");
    lines.push(...created.map((file) => `  - ${file}`));
  }

  if (adapters.created.length > 0 || adapters.updated.length > 0) {
    lines.push(formatAgentAdapterInstall(adapters).trimEnd());
  }

  return `${lines.join("\n")}\n`;
}
