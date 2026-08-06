import {
  createRealtimeQuote,
  createSkuQuote,
  type AdvertekPricingClient,
  type SpotRateClient,
} from "@advertek/quote-api";
import type { QuoteExecutor, SkuQuoteExecutor } from "@advertek/mcp-server";

export interface QuoteExecutors {
  readonly executeQuote: QuoteExecutor;
  readonly executeSkuQuote: SkuQuoteExecutor;
  readonly spotRateClient: SpotRateClient;
}

/**
 * Shared quote wiring for the REST (`/api/quotes`) and MCP (`/api/mcp`)
 * entrypoints so both serve identical prices.
 *
 * @blocker STEP_11 — uses the same inspection mocks as
 * `packages/mcp-server/src/stdio-main.ts`: get_quote prices are fabricated
 * (mock AdvertekPricingClient) and the CAD->USDC rate is a fixed stub (mock
 * SpotRateClient). get_sku_quote's CAD prices are real (checked-in POD price
 * list). Replace both clients with real integrations before Step 11.
 */
export function createQuoteExecutors(): QuoteExecutors {
  const spotRateClient: SpotRateClient = {
    getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> => Promise.resolve(730_000n),
  };
  const pricingClient: AdvertekPricingClient = {
    quoteCadCents: (): Promise<bigint> => Promise.resolve(12_500n),
  };

  return {
    spotRateClient,
    executeQuote: createRealtimeQuote({ pricingClient, spotRateClient }),
    executeSkuQuote: createSkuQuote({ spotRateClient }),
  };
}
