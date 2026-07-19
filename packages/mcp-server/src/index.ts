import type { Quote, QuoteRequest, Sku } from "@advertek/types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface AgentToolHandlers {
  listCatalog(): Promise<readonly Sku[]>;
  createQuote(request: QuoteRequest): Promise<Quote>;
}

export function createMcpServer(handlers: AgentToolHandlers): McpServer {
  const server = new McpServer({
    name: "advertek-agent-rail",
    version: "0.0.0",
  });

  server.registerTool(
    "list_catalog",
    {
      description: "List print products available from Advertek",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await handlers.listCatalog()),
        },
      ],
    }),
  );

  server.registerTool(
    "create_quote",
    {
      description: "Create a real-time print production quote",
      inputSchema: {
        skuId: z.string().min(1),
        quantity: z.number().int().positive(),
        specification: z.record(z.unknown()),
      },
    },
    async (request) => {
      const quote = await handlers.createQuote(request);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ...quote,
              total: {
                ...quote.total,
                amountBaseUnits: quote.total.amountBaseUnits.toString(),
              },
              expiresAt: quote.expiresAt.toISOString(),
            }),
          },
        ],
      };
    },
  );

  return server;
}
