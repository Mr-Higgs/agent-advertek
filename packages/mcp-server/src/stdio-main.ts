#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { randomUUID } from "node:crypto";
import { createRealtimeQuote, createSkuQuote } from "@advertek/quote-api";
import { createAdvertekMcpServer } from "./create-server.js";
import type { CreateOrderExecutor } from "./create-order-tool.js";

/**
 * Stdio entrypoint for Cursor / MCP Inspector.
 *
 * Deliberately mock-wired: this entry exists for local tool inspection, so
 * it uses a fixed CAD->USDC rate, a fixed CAD price, and an order intake
 * that persists nothing. The production wiring — real pricing clients when
 * configured, Postgres persistence, and the settlement config — lives in
 * `apps/web/lib/quotes.ts`, which serves the same tools over
 * `/api/mcp`.
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

  // Inspection mock: mints an id and echoes a payment request without
  // persisting anything or reading a settlement config. The real intake
  // (pricing + Postgres + settlement wallet) is wired in `apps/web`.
  const executeCreateOrder: CreateOrderExecutor = async (request) => {
    const quotes = await Promise.all(
      request.order.items.map((item) => executeQuote(item.spec)),
    );
    const amountBaseUnits = quotes.reduce(
      (total, quote) => total + quote.priceUsdc.amountBaseUnits,
      0n,
    );
    const orderId = `ord_${randomUUID()}`;
    return {
      orderId,
      memo: `advertek:order:${orderId}:${randomUUID()}`,
      settlementWallet: "MockSett1ementWa11etAddress11111111111111111",
      amountBaseUnits,
      usdcMintAddress: "MockUSDCMint111111111111111111111111111111",
      usdcDecimals: 6,
    };
  };

  const server = createAdvertekMcpServer({
    executeQuote,
    executeSkuQuote,
    spotRateClient,
    executeCreateOrder,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
