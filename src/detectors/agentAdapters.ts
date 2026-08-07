import { agentAdapterStatus } from "../agentAdapters.js";
import { createFinding } from "../finding.js";
import type { Detector, Finding } from "../types.js";

export const agentAdaptersDetector: Detector = {
  id: "agent-adapters",
  description: "Checks optional repository agent instruction adapters.",
  async run({ root }) {
    const status = await agentAdapterStatus(root);
    const findings: Finding[] = [];

    for (const adapter of status) {
      if (adapter.installed) {
        continue;
      }

      findings.push(
        createFinding({
          detectorId: "agent-adapters",
          title: "Agent adapter is missing",
          message: `${adapter.path} is missing the Kairn agent adapter.`,
          location: { path: adapter.path },
          confidence: "high",
          deterministic: true,
          source: "parsed",
          evidence: [
            {
              kind: "scan",
              path: adapter.path,
              detail: `${adapter.description} adapter was not found.`
            }
          ],
          impact:
            "Repository-scoped agents that do not read global Kairn setup may skip project memory, context packets, reconcile, and audit.",
          recommendedAction:
            "Run kairn agents install and commit the adapter files, or disable the agent-adapters detector if global setup is sufficient.",
          reversibility: "trivial",
          requiredApproval: "none",
          explanation:
            "The agent-adapters detector is an opt-in compatibility check for teams that intentionally commit repository-local agent instruction files."
        })
      );
    }

    return findings;
  }
};
