import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildCatalogToolResult,
  catalogToolResultSchema,
} from "./catalog-tool.js";
import {
  buildQuoteToolResult,
  quoteToolInputSchema,
  quoteToolResultSchema,
  type QuoteExecutor,
} from "./quote-tool.js";

export interface AdvertekMcpServerDeps {
  /**
   * @blocker STEP_11 — Quote executor must eventually use real
   * AdvertekPricingClient and SpotRateClient integrations.
   */
  readonly executeQuote: QuoteExecutor;
}

function structuredToolResponse<T extends Record<string, unknown>>(result: T) {
  return {
    structuredContent: result,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

export function createAdvertekMcpServer(
  deps: AdvertekMcpServerDeps,
): McpServer {
  const server = new McpServer({
    name: "advertek-agent-rail",
    version: "0.0.0",
  });

  server.registerTool(
    "get_catalog",
    {
      title: "Get Advertek catalog",
      description:
        "Return Advertek's available print product lines and the exact SKU specification fields required to request a quote. Advertek is a commercial printer. Call this first when you do not already know which productLine values are valid, what units dimensions use, or which finish/turnaround enums are accepted. The response is structured JSON (not prose): provider metadata, currency encoding notes, specRequirements, and productLines with ids you must pass to get_quote.",
      inputSchema: {},
      outputSchema: catalogToolResultSchema,
    },
    () => structuredToolResponse(buildCatalogToolResult()),
  );

  server.registerTool(
    "get_quote",
    {
      title: "Get Advertek print quote",
      description:
        "Validate a complete Advertek SKU specification and return a real-time production quote. Advertek prices jobs in CAD and settles in USDC. Pass the full SKU spec object (productLine, dimensions in mm, stock, finish[], quantity, turnaround). If you are unsure of allowed enums or required fields, call get_catalog first. On success, returns structured quote data with CAD cents and USDC base units as decimal strings. On validation or pricing failure, returns structured error details with ok=false — do not invent prices.",
      inputSchema: quoteToolInputSchema,
      outputSchema: quoteToolResultSchema,
    },
    async (args) => {
      const result = await buildQuoteToolResult(deps.executeQuote, args);
      return {
        ...structuredToolResponse(result),
        isError: !result.ok,
      };
    },
  );

  return server;
}

export {
  buildCatalogToolResult,
  catalogToolResultSchema,
  type CatalogToolResult,
} from "./catalog-tool.js";
export {
  buildQuoteToolResult,
  quoteToolInputSchema,
  quoteToolResultSchema,
  type QuoteExecutor,
  type QuoteToolResult,
} from "./quote-tool.js";
