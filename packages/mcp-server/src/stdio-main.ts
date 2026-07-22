#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRealtimeQuote } from "@advertek/quote-api";
import { createAdvertekMcpServer } from "./create-server.js";

/**
 * Stdio entrypoint for Cursor / MCP Inspector.
 *
 * @blocker STEP_11 — Uses temporary inspection mocks for pricing and
 * spot-rate clients. Replace with real integrations before Step 11.
 */
async function main(): Promise<void> {
  const executeQuote = createRealtimeQuote({
    pricingClient: {
      quoteCadCents: (): Promise<bigint> => Promise.resolve(12_500n),
    },
    spotRateClient: {
      getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> =>
        Promise.resolve(730_000n),
    },
  });

  const server = createAdvertekMcpServer({ executeQuote });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
