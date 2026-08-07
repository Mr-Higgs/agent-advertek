import {
  createHttpAdvertekPricingClient,
  createHttpSpotRateClient,
  createRealtimeQuote,
  createSkuQuote,
  tryLoadAdvertekPricingConfig,
  tryLoadSpotRateConfig,
  type AdvertekPricingClient,
  type SpotRateClient,
} from "@advertek/quote-api";
import { loadSettlementPublicConfig } from "@advertek/payments";
import type {
  CreateOrderExecutor,
  QuoteExecutor,
  SkuQuoteExecutor,
} from "@advertek/mcp-server";
import { getDb } from "@/lib/db";
import { createOrderIntake } from "@/lib/orders";

export interface QuoteExecutors {
  readonly executeQuote: QuoteExecutor;
  readonly executeSkuQuote: SkuQuoteExecutor;
  readonly executeCreateOrder: CreateOrderExecutor;
  readonly spotRateClient: SpotRateClient;
  /**
   * `true` while either upstream is still a mock — the landing page uses this
   * to label figures as non-binding demo values.
   */
  readonly isDemoPricing: boolean;
}

/** Fixed CAD->USDC stub used only when no spot-rate endpoint is configured. */
const MOCK_USDC_BASE_UNITS_PER_CAD_DOLLAR = 730_000n;
/** Fixed CAD price stub used only when no pricing endpoint is configured. */
const MOCK_PRICE_CAD_CENTS = 12_500n;

/**
 * Shared quote + order-intake wiring for the REST (`/api/quotes`,
 * `/api/orders`) and MCP (`/api/mcp`) entrypoints so both serve identical
 * prices.
 *
 * Real pricing is config-gated: when `ADVERTEK_PRICING_API_URL` /
 * `SPOT_RATE_API_URL` are provisioned (see `@advertek/quote-api`'s
 * `config.ts`) the production HTTP clients are used; otherwise each falls
 * back independently to the inspection mock so a keyless demo deployment
 * still renders. A half-configured integration (endpoint without credential)
 * throws rather than silently falling back.
 */
export function createQuoteExecutors(): QuoteExecutors {
  const spotRateConfig = tryLoadSpotRateConfig();
  const pricingConfig = tryLoadAdvertekPricingConfig();

  const spotRateClient: SpotRateClient =
    spotRateConfig === undefined
      ? {
          getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> =>
            Promise.resolve(MOCK_USDC_BASE_UNITS_PER_CAD_DOLLAR),
        }
      : createHttpSpotRateClient(spotRateConfig);

  const pricingClient: AdvertekPricingClient =
    pricingConfig === undefined
      ? { quoteCadCents: (): Promise<bigint> => Promise.resolve(MOCK_PRICE_CAD_CENTS) }
      : createHttpAdvertekPricingClient(pricingConfig);

  const executeQuote = createRealtimeQuote({ pricingClient, spotRateClient });

  return {
    spotRateClient,
    executeQuote,
    executeSkuQuote: createSkuQuote({ spotRateClient }),
    executeCreateOrder: createOrderIntake({
      executeQuote,
      getExecutor: getDb,
      getSettlementConfig: () => loadSettlementPublicConfig(),
    }),
    isDemoPricing: spotRateConfig === undefined || pricingConfig === undefined,
  };
}
