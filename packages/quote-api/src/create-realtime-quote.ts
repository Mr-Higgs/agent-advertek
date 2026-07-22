import { mapProductLineToPrintProcess } from "@advertek/catalog";
import { skuSpecSchema, type PrintProcess, type SkuSpec } from "@advertek/types";
import type { AdvertekPricingClient } from "./advertek-pricing-client.js";
import {
  convertCadCentsToUsdcBaseUnits,
  type SpotRateClient,
} from "./spot-rate-client.js";

export interface CadMoney {
  readonly currency: "CAD";
  readonly amountCents: bigint;
}

export interface UsdcMoney {
  readonly currency: "USDC";
  readonly amountBaseUnits: bigint;
}

export interface RealtimeQuote {
  readonly spec: SkuSpec;
  readonly printProcess: PrintProcess;
  readonly priceCad: CadMoney;
  readonly priceUsdc: UsdcMoney;
  readonly quotedAt: Date;
}

/**
 * @blocker STEP_11 — Both injected clients are stubs until real
 * Advertek pricing and spot-rate integrations land.
 */
export interface CreateRealtimeQuoteDeps {
  /** @blocker STEP_11 — replace mock with real AdvertekPricingClient */
  readonly pricingClient: AdvertekPricingClient;
  /** @blocker STEP_11 — replace mock with real SpotRateClient */
  readonly spotRateClient: SpotRateClient;
  readonly now?: () => Date;
}

export function createRealtimeQuote(
  deps: CreateRealtimeQuoteDeps,
): (input: unknown) => Promise<RealtimeQuote> {
  const now = deps.now ?? (() => new Date());

  return async (input: unknown): Promise<RealtimeQuote> => {
    const spec = skuSpecSchema.parse(input);
    const printProcess = mapProductLineToPrintProcess(spec.productLine);

    const [priceCadCents, usdcBaseUnitsPerCadDollar] = await Promise.all([
      deps.pricingClient.quoteCadCents({ spec, printProcess }),
      deps.spotRateClient.getUsdcBaseUnitsPerCadDollar(),
    ]);

    if (priceCadCents < 0n) {
      throw new RangeError("Pricing client returned a negative CAD amount");
    }

    const priceUsdcBaseUnits = convertCadCentsToUsdcBaseUnits(
      priceCadCents,
      usdcBaseUnitsPerCadDollar,
    );

    return {
      spec,
      printProcess,
      priceCad: {
        currency: "CAD",
        amountCents: priceCadCents,
      },
      priceUsdc: {
        currency: "USDC",
        amountBaseUnits: priceUsdcBaseUnits,
      },
      quotedAt: now(),
    };
  };
}
