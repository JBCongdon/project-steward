import {
  agentAdapterStatus,
  formatAgentAdapterInstall,
  globalAgentAdapterStatus,
  installAgentAdapters,
  installGlobalAgentAdapters
} from "../agentAdapters.js";

export async function agentsCommand(
  root: string,
  positionals: string[],
  flags = new Set<string>()
): Promise<{ ok: boolean; text: string; data: unknown }> {
  const [subcommand = "status"] = positionals;
  const global = flags.has("global");

  if (subcommand === "install") {
    const result = global
      ? await installGlobalAgentAdapters()
      : await installAgentAdapters(root);
    return {
      ok: true,
      text: formatAgentAdapterInstall(result),
      data: result
    };
  }

  if (subcommand === "status") {
    const status = global
      ? await globalAgentAdapterStatus()
      : await agentAdapterStatus(root);
    const label = global
      ? "Kairn global agent integration"
      : "Kairn repository agent adapters";
    return {
      ok: true,
      text: [
        label,
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
    text: "Usage: kairn agents install|status [--global] [--json]\n",
    data: { error: "unknown-agents-command" }
  };
}
