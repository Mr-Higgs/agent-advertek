#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRealtimeQuote, createSkuQuote } from "@advertek/quote-api";
import { createAdvertekMcpServer } from "./create-server.js";

/**
 * Stdio entrypoint for Cursor / MCP Inspector.
 *
 * @blocker STEP_11 — Uses a temporary inspection mock for the CAD->USDC
 * spot-rate client (shared by both get_quote and get_sku_quote). get_quote
 * also still mocks AdvertekPricingClient. get_sku_quote's CAD pricing is
 * real (from the checked-in POD price list), so it only inherits the
 * spot-rate stub. Replace both with real integrations before Step 11.
 */
async function main(): Promise<void> {
  const spotRateClient = {
    getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> =>
      Promise.resolve(730_000n),
  };

  const executeQuote = createRealtimeQuote({
    pricingClient: {
      quoteCadCents: (): Promise<bigint> => Promise.resolve(12_500n),
    },
    spotRateClient,
  });

  const executeSkuQuote = createSkuQuote({ spotRateClient });

  const server = createAdvertekMcpServer({
    executeQuote,
    executeSkuQuote,
    spotRateClient,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
