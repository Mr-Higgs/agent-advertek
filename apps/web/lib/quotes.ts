import {
  convertCadCentsToUsdcBaseUnits,
  createHttpAdvertekPricingClient,
  createHttpSpotRateClient,
  createRealtimeQuote,
  createSkuQuote,
  tryLoadAdvertekPricingConfig,
  tryLoadSpotRateConfig,
  type AdvertekPricingClient,
  type RealtimeQuote,
  type SpotRateClient,
} from "@advertek/quote-api";
import { getPodPriceListEntry, mapProductLineToPrintProcess } from "@advertek/catalog";
import { skuSpecSchema, type SkuSpec } from "@advertek/types";
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

export interface WithPodSkuPricingDeps {
  readonly inner: QuoteExecutor;
  readonly spotRateClient: SpotRateClient;
  readonly now?: () => Date;
}

/**
 * Prices print-on-demand specs from the checked-in POD price list (MSRP —
 * the same figures `get_sku_quote` charges) so order intake, which re-prices
 * every item through this executor, agrees with the SKU quote the customer
 * saw. Everything else — non-POD product lines, unknown materials, invalid
 * specs — delegates to the wrapped executor unchanged.
 */
export function withPodSkuPricing(deps: WithPodSkuPricingDeps): QuoteExecutor {
  const now = deps.now ?? ((): Date => new Date());
  return async (input: SkuSpec): Promise<RealtimeQuote> => {
    const parsed = skuSpecSchema.safeParse(input);
    if (!parsed.success || parsed.data.productLine !== "printOnDemand") {
      return deps.inner(input);
    }
    const entry = getPodPriceListEntry(parsed.data.stock.material);
    if (entry === undefined) {
      return deps.inner(input);
    }
    const priceCadCents = entry.msrpCadCents * BigInt(parsed.data.quantity);
    const usdcBaseUnitsPerCadDollar = await deps.spotRateClient.getUsdcBaseUnitsPerCadDollar();
    return {
      spec: parsed.data,
      printProcess: mapProductLineToPrintProcess("printOnDemand"),
      priceCad: { currency: "CAD", amountCents: priceCadCents },
      priceUsdc: {
        currency: "USDC",
        amountBaseUnits: convertCadCentsToUsdcBaseUnits(priceCadCents, usdcBaseUnitsPerCadDollar),
      },
      quotedAt: now(),
    };
  };
}

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

  const executeQuote = withPodSkuPricing({
    inner: createRealtimeQuote({ pricingClient, spotRateClient }),
    spotRateClient,
  });

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
