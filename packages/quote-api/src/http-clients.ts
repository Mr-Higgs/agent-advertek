import { z } from "zod";
import type { AdvertekPricingClient } from "./advertek-pricing-client.js";
import type { AdvertekPricingConfig, SpotRateConfig } from "./config.js";
import { decimalStringToMinorUnits } from "./decimal.js";
import type { SpotRateClient } from "./spot-rate-client.js";

/**
 * Production implementations of the two pricing seams. Both take an injected
 * `fetch`-like client (no unit test touches the network) and validate every
 * upstream response with Zod before a single number reaches quote logic.
 */

export type QuoteApiFetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; json(): Promise<unknown> }>;

export class PricingUpstreamError extends Error {
  override readonly name = "PricingUpstreamError";
  readonly httpStatus: number;
  readonly body: unknown;

  constructor(message: string, httpStatus: number, body: unknown) {
    super(message);
    this.httpStatus = httpStatus;
    this.body = body;
  }
}

/** Integer minor units on the wire: a decimal string is the canonical form. */
const integerMinorUnitsSchema = z
  .union([
    z.string().regex(/^\d+$/, "must be an integer number of cents"),
    z.number().int().safe().nonnegative(),
  ])
  .transform((value) => BigInt(value));

/**
 * Expected response contract from Advertek's pricing system. CAD is quoted
 * in integer cents — a fractional or float price is rejected here rather
 * than silently rounded.
 */
const pricingResponseSchema = z.object({
  priceCadCents: integerMinorUnitsSchema,
});

export interface HttpClientOptions {
  readonly fetchImpl?: QuoteApiFetchLike;
}

/** Path appended to the configured pricing base URL. */
const PRICING_QUOTE_PATH = "/pricing/quotes";

export function createHttpAdvertekPricingClient(
  config: AdvertekPricingConfig,
  options: HttpClientOptions = {},
): AdvertekPricingClient {
  const fetchImpl: QuoteApiFetchLike = options.fetchImpl ?? fetch;

  return {
    async quoteCadCents({ spec, printProcess }) {
      const response = await fetchImpl(`${config.baseUrl}${PRICING_QUOTE_PATH}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spec, printProcess }),
      });

      const json: unknown = await response.json();
      if (response.status >= 400) {
        throw new PricingUpstreamError(
          `Advertek pricing request failed: HTTP ${String(response.status)}`,
          response.status,
          json,
        );
      }
      return pricingResponseSchema.parse(json).priceCadCents;
    },
  };
}

/** USDC base units per whole USDC. */
const USDC_DECIMALS = 6;

/**
 * Expected response contract from the FX provider: `rate` is how many USD
 * (1:1 with USDC) one CAD dollar buys, as a decimal string.
 */
const spotRateResponseSchema = z.object({
  rate: z.union([z.string().min(1), z.number().positive()]).transform(String),
});

export interface SpotRateClientOptions extends HttpClientOptions {
  /** How long a fetched rate may be reused. Defaults to 60s; 0 disables. */
  readonly cacheTtlMs?: number;
  readonly now?: () => number;
}

const DEFAULT_CACHE_TTL_MS = 60_000;

export function createHttpSpotRateClient(
  config: SpotRateConfig,
  options: SpotRateClientOptions = {},
): SpotRateClient {
  const fetchImpl: QuoteApiFetchLike = options.fetchImpl ?? fetch;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const now = options.now ?? (() => Date.now());

  let cached: { readonly rate: bigint; readonly fetchedAt: number } | undefined;

  return {
    async getUsdcBaseUnitsPerCadDollar() {
      if (cached && now() - cached.fetchedAt < cacheTtlMs) {
        return cached.rate;
      }

      const response = await fetchImpl(config.baseUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(config.apiKey !== undefined
            ? { Authorization: `Bearer ${config.apiKey}` }
            : {}),
        },
      });

      const json: unknown = await response.json();
      if (response.status >= 400) {
        throw new PricingUpstreamError(
          `Spot-rate request failed: HTTP ${String(response.status)}`,
          response.status,
          json,
        );
      }

      const { rate } = spotRateResponseSchema.parse(json);
      const baseUnits = decimalStringToMinorUnits(rate, USDC_DECIMALS);
      if (baseUnits <= 0n) {
        throw new PricingUpstreamError(
          `Spot-rate provider returned a non-positive rate: ${rate}`,
          response.status,
          json,
        );
      }

      cached = { rate: baseUnits, fetchedAt: now() };
      return baseUnits;
    },
  };
}
