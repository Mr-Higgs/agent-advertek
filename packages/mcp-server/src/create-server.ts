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
import {
  buildCreateOrderToolResult,
  createOrderToolInputSchema,
  createOrderToolResultSchema,
  type CreateOrderExecutor,
} from "./create-order-tool.js";

export interface AdvertekMcpServerDeps {
  readonly executeQuote: QuoteExecutor;
  readonly executeSkuQuote: SkuQuoteExecutor;
  /**
   * Used by get_catalog to annotate skuCatalog with a live (non-binding)
   * USDC estimate per SKU. Pass the same instance used to build
   * executeQuote / executeSkuQuote.
   */
  readonly spotRateClient: SpotRateClient;
  /**
   * Order intake: mints the order id, prices the job, persists it, and
   * returns the payment request. Injected because persistence and the
   * settlement config live in the host app, not in this package.
   */
  readonly executeCreateOrder: CreateOrderExecutor;
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
  registerAdvertekTools(server, deps);
  return server;
}

/**
 * Registers the Advertek tools on an existing MCP server instance. Shared by
 * the stdio server (via {@link createAdvertekMcpServer}) and the remote
 * Streamable HTTP endpoint in `apps/web` (via `mcp-handler`), so both
 * transports serve identical tools from one source of truth.
 */
export function registerAdvertekTools(
  server: McpServer,
  deps: AdvertekMcpServerDeps,
): void {
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

  server.registerTool(
    "create_order",
    {
      title: "Create an Advertek order and get its USDC payment request",
      description:
        "Place a real Advertek print order and receive the payment request that makes it payable. Pass the full order (customerOrderNumber, locationCode, shippingService, soldTo/shipTo addresses, and items — each with an internalItemId, a complete SKU spec exactly as get_quote accepts, and customsValueUsdCents as an integer string of US cents), the base58 Solana public key of the wallet that will pay, and optionally an https callbackUrl to receive signed order-status webhooks. Advertek mints the order id and prices the order itself: never invent, guess, or reuse an order id, and never pay an amount you calculated yourself. On success the response carries orderId, memo, settlementWallet, amountBaseUnits (USDC base units, 6 decimals, as a decimal string), and usdcMintAddress — to pay, send exactly amountBaseUnits of that USDC mint to settlementWallet in a single Solana transaction that also carries the returned memo string verbatim in a Memo-program instruction. The memo is how the rail matches your transfer to this order; a payment without it, with a different amount, or to a different address will not be credited. Call get_quote or get_sku_quote first if you need to know the price before committing. On validation or intake failure the response has ok=false with structured issues — fix them and call create_order again rather than paying anything.",
      inputSchema: createOrderToolInputSchema,
      outputSchema: createOrderToolResultSchema,
    },
    async (args) => {
      const result = await buildCreateOrderToolResult(deps.executeCreateOrder, args);
      return {
        ...structuredToolResponse(result),
        isError: !result.ok,
      };
    },
  );
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
export {
  buildCreateOrderToolResult,
  createOrderRequestSchema,
  createOrderToolInputSchema,
  createOrderToolResultSchema,
  type CreatedOrder,
  type CreateOrderExecutor,
  type CreateOrderRequest,
  type CreateOrderToolResult,
} from "./create-order-tool.js";
