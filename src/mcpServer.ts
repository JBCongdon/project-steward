import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { runAudit } from "./audit.js";
import { compileContextPacket, compileExecutionBrief } from "./context.js";
import { explainFindingCommand } from "./commands/explain.js";
import { statusCommand } from "./commands/status.js";
import { VERSION } from "./constants.js";
import { rebuildIndex } from "./indexer.js";

export async function startMcpServer(root: string): Promise<void> {
  const server = createMcpServer(root);
  await server.connect(new StdioServerTransport());
}

export function createMcpServer(root: string): McpServer {
  const server = new McpServer({
    name: "kairn",
    version: VERSION
  });

  server.registerTool(
    "kairn_status",
    {
      title: "Kairn Status",
      description: "Return repository governance status.",
      inputSchema: {}
    },
    async () => textResult(await statusCommand(root))
  );

  server.registerTool(
    "kairn_audit",
    {
      title: "Kairn Audit",
      description: "Run the deterministic read-only audit and return JSON.",
      inputSchema: {}
    },
    async () => textResult(JSON.stringify(await runAudit(root), null, 2))
  );

  server.registerTool(
    "kairn_context_packet",
    {
      title: "Compile Context Packet",
      description: "Compile a task-scoped context packet with inclusion reasons and exclusions.",
      inputSchema: {
        objective: z.string().min(1),
        budgetTokens: z.number().int().positive().optional()
      }
    },
    async ({ objective, budgetTokens }) =>
      textResult(
        JSON.stringify(
          await compileContextPacket(root, objective, { budgetTokens }),
          null,
          2
        )
      )
  );

  server.registerTool(
    "kairn_execution_brief",
    {
      title: "Compile Execution Brief",
      description: "Compile objective, context, required evidence, obligations, and definition of done.",
      inputSchema: {
        objective: z.string().min(1),
        budgetTokens: z.number().int().positive().optional()
      }
    },
    async ({ objective, budgetTokens }) =>
      textResult(
        JSON.stringify(
          await compileExecutionBrief(root, objective, { budgetTokens }),
          null,
          2
        )
      )
  );

  server.registerTool(
    "kairn_explain_finding",
    {
      title: "Explain Finding",
      description: "Explain a Kairn finding by id or fingerprint.",
      inputSchema: {
        id: z.string().min(1)
      }
    },
    async ({ id }) => textResult((await explainFindingCommand(root, id)).text)
  );

  server.registerResource(
    "project-index",
    "kairn://project-index",
    {
      title: "Kairn Index",
      description: "Rebuilt repository index.",
      mimeType: "application/json"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(await rebuildIndex(root), null, 2)
        }
      ]
    })
  );

  return server;
}

function textResult(text: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text }]
  };
}
