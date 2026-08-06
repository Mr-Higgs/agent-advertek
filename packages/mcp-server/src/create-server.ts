import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpotRateClient } from "@advertek/quote-api";
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
import {
  buildSkuQuoteToolResult,
  skuQuoteToolInputSchema,
  skuQuoteToolResultSchema,
  type SkuQuoteExecutor,
} from "./sku-quote-tool.js";

export interface AdvertekMcpServerDeps {
  /**
   * @blocker STEP_11 — Quote executor must eventually use real
   * AdvertekPricingClient and SpotRateClient integrations.
   */
  readonly executeQuote: QuoteExecutor;
  /**
   * @blocker STEP_11 — CAD prices here are real (from the checked-in POD
   * price list), but the CAD->USDC SpotRateClient it's built on is still a
   * stub. See `@advertek/quote-api`'s `createSkuQuote`.
   */
  readonly executeSkuQuote: SkuQuoteExecutor;
  /**
   * Used by get_catalog to annotate skuCatalog with a live (non-binding)
   * USDC estimate per SKU. Pass the same instance used to build
   * executeQuote / executeSkuQuote.
   */
  readonly spotRateClient: SpotRateClient;
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
        "Return Advertek's available print product lines and the exact SKU specification fields required to request a quote, plus every fixed-price print-on-demand SKU available today with its cost. Advertek is a commercial printer. Call this first when you do not already know which productLine values are valid, what units dimensions use, which finish/turnaround enums are accepted, or which POD SKUs and prices are currently available. The response is structured JSON (not prose): provider metadata, currency encoding notes, specRequirements, productLines with ids you must pass to get_quote, and a skuCatalog of fixed-price print-on-demand products (mugs, t-shirts, canvas, etc.) — each with its MSRP in CAD cents and a live (non-binding) USDC estimate — that you can quote exactly and order with get_sku_quote.",
      inputSchema: {},
      outputSchema: catalogToolResultSchema,
    },
    async () =>
      structuredToolResponse(
        await buildCatalogToolResult({ spotRateClient: deps.spotRateClient }),
      ),
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

  server.registerTool(
    "get_sku_quote",
    {
      title: "Get Advertek print-on-demand SKU quote (beta)",
      description:
        "Beta shortcut for Advertek's print-on-demand catalog: pass a raw SKU code and quantity — no full SKU specification needed. Call get_catalog first and use one of the codes in its skuCatalog (e.g. \"MUG-11-WHT\"). Returns real MSRP pricing in CAD cents plus the USDC-equivalent settlement amount. On an unknown SKU or invalid input, returns structured error details with ok=false — do not invent prices or SKU codes.",
      inputSchema: skuQuoteToolInputSchema,
      outputSchema: skuQuoteToolResultSchema,
    },
    async (args) => {
      const result = await buildSkuQuoteToolResult(deps.executeSkuQuote, args);
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
  type BuildCatalogToolResultDeps,
  type CatalogToolResult,
} from "./catalog-tool.js";
export {
  buildQuoteToolResult,
  quoteToolInputSchema,
  quoteToolResultSchema,
  type QuoteExecutor,
  type QuoteToolResult,
} from "./quote-tool.js";
export {
  buildSkuQuoteToolResult,
  skuQuoteToolInputSchema,
  skuQuoteToolResultSchema,
  type SkuQuoteExecutor,
  type SkuQuoteToolResult,
} from "./sku-quote-tool.js";
