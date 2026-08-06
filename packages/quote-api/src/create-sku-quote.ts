import { getPodPriceListEntry, type PodCategory } from "@advertek/catalog";
import { z } from "zod";
import type { CadMoney, UsdcMoney } from "./create-realtime-quote.js";
import {
  convertCadCentsToUsdcBaseUnits,
  type SpotRateClient,
} from "./spot-rate-client.js";

/**
 * Beta shortcut for Advertek's print-on-demand catalog: an agent that
 * already knows a raw POD SKU code (see `@advertek/catalog`'s
 * `POD_PRICE_LIST` / the `get_catalog` tool's `skuCatalog`) can request a
 * quote directly by SKU + quantity, instead of building a full `SkuSpec`.
 * Unlike `createRealtimeQuote`, this needs no `AdvertekPricingClient` stub
 * — the CAD price comes straight from the real, checked-in price list — so
 * the only remaining stub on this path is the CAD->USDC `SpotRateClient`.
 *
 * Quotes at MSRP (the sheet's suggested customer-facing price), not
 * wholesale cost — wholesale is Advertek's cost basis to us, not what an
 * agent should be charged. Revisit this if a different markup model is
 * intended.
 */

export const skuQuoteInputSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});
export type SkuQuoteInput = z.infer<typeof skuQuoteInputSchema>;

export interface SkuQuote {
  readonly sku: string;
  readonly name: string;
  readonly category: PodCategory;
  readonly quantity: number;
  /** MSRP for a single unit. */
  readonly unitPriceCad: CadMoney;
  /** `unitPriceCad` multiplied by `quantity`. */
  readonly priceCad: CadMoney;
  readonly priceUsdc: UsdcMoney;
  readonly quotedAt: Date;
}

export class UnknownSkuError extends Error {
  override readonly name = "UnknownSkuError";
}

export interface CreateSkuQuoteDeps {
  /** @blocker STEP_11 — replace mock with real SpotRateClient */
  readonly spotRateClient: SpotRateClient;
  readonly now?: () => Date;
}

export function createSkuQuote(
  deps: CreateSkuQuoteDeps,
): (input: unknown) => Promise<SkuQuote> {
  const now = deps.now ?? ((): Date => new Date());

  return async (input: unknown): Promise<SkuQuote> => {
    const parsed = skuQuoteInputSchema.parse(input);
    const entry = getPodPriceListEntry(parsed.sku);
    if (!entry) {
      throw new UnknownSkuError(`Unknown SKU: ${parsed.sku}`);
    }

    const priceCadCents = entry.msrpCadCents * BigInt(parsed.quantity);
    const usdcBaseUnitsPerCadDollar = await deps.spotRateClient.getUsdcBaseUnitsPerCadDollar();
    const priceUsdcBaseUnits = convertCadCentsToUsdcBaseUnits(
      priceCadCents,
      usdcBaseUnitsPerCadDollar,
    );

    return {
      sku: entry.sku,
      name: entry.name,
      category: entry.category,
      quantity: parsed.quantity,
      unitPriceCad: { currency: "CAD", amountCents: entry.msrpCadCents },
      priceCad: { currency: "CAD", amountCents: priceCadCents },
      priceUsdc: { currency: "USDC", amountBaseUnits: priceUsdcBaseUnits },
      quotedAt: now(),
    };
  };
}
