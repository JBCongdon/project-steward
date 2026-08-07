import {
  agentAdapterStatus,
  formatAgentAdapterInstall,
  installAgentAdapters
} from "../agentAdapters.js";

export async function agentsCommand(
  root: string,
  positionals: string[]
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const [subcommand = "status"] = positionals;

  if (subcommand === "install") {
    const result = await installAgentAdapters(root);
    return {
      ok: true,
      text: formatAgentAdapterInstall(result),
      data: result
    };
  }

  if (subcommand === "status") {
    const status = await agentAdapterStatus(root);
    return {
      ok: true,
      text: [
        "Kairn agent adapters",
        ...status.map(
          (adapter) =>
            `${adapter.installed ? "ok" : "missing"} ${adapter.path} (${adapter.description})`
        )
      ].join("\n") + "\n",
      data: status
    };
  }

  return {
    ok: false,
    text: "Usage: kairn agents install|status [--json]\n",
    data: { error: "unknown-agents-command" }
  };
}
