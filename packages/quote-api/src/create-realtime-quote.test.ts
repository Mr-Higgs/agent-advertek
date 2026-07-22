import { describe, expect, it, vi } from "vitest";
import type { SkuSpec } from "@advertek/types";
import type { AdvertekPricingClient } from "./advertek-pricing-client.js";
import { createRealtimeQuote } from "./create-realtime-quote.js";
import {
  convertCadCentsToUsdcBaseUnits,
  type SpotRateClient,
} from "./spot-rate-client.js";

const validSpec: SkuSpec = {
  productLine: "digital",
  dimensions: { width: 148, height: 210 },
  stock: { material: "uncoated", weight: 80 },
  finish: ["none"],
  quantity: 250,
  turnaround: "expedited",
};

describe("convertCadCentsToUsdcBaseUnits", () => {
  it("converts using integer arithmetic only", () => {
    // 1 CAD = 0.73 USDC => 730_000 base units per CAD dollar
    expect(convertCadCentsToUsdcBaseUnits(10_000n, 730_000n)).toBe(73_000_000n);
  });

  it("rejects non-positive spot rates", () => {
    expect(() => convertCadCentsToUsdcBaseUnits(100n, 0n)).toThrow(RangeError);
  });
});

describe("createRealtimeQuote", () => {
  it("quotes CAD from the pricing client and USDC via the spot-rate client", async () => {
    const quoteCadCents = vi.fn(
      (): Promise<bigint> => Promise.resolve(25_000n),
    );
    const getUsdcBaseUnitsPerCadDollar = vi.fn(
      (): Promise<bigint> => Promise.resolve(720_000n),
    );
    const pricingClient: AdvertekPricingClient = { quoteCadCents };
    const spotRateClient: SpotRateClient = { getUsdcBaseUnitsPerCadDollar };
    const quotedAt = new Date("2026-07-20T18:00:00.000Z");

    const quote = await createRealtimeQuote({
      pricingClient,
      spotRateClient,
      now: () => quotedAt,
    })(validSpec);

    expect(quoteCadCents).toHaveBeenCalledWith({
      spec: validSpec,
      printProcess: "digital",
    });
    expect(getUsdcBaseUnitsPerCadDollar).toHaveBeenCalledOnce();

    expect(quote.printProcess).toBe("digital");
    expect(quote.priceCad).toEqual({
      currency: "CAD",
      amountCents: 25_000n,
    });
    // 25000 cents * 720000 / 100 = 180_000_000 base units
    expect(quote.priceUsdc).toEqual({
      currency: "USDC",
      amountBaseUnits: 180_000_000n,
    });
    expect(quote.quotedAt).toBe(quotedAt);
  });

  it("does not embed prices — different mocks produce different quotes", async () => {
    const first = await createRealtimeQuote({
      pricingClient: {
        quoteCadCents: (): Promise<bigint> => Promise.resolve(10_000n),
      },
      spotRateClient: {
        getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> =>
          Promise.resolve(700_000n),
      },
      now: () => new Date("2026-07-20T18:00:00.000Z"),
    })(validSpec);

    const second = await createRealtimeQuote({
      pricingClient: {
        quoteCadCents: (): Promise<bigint> => Promise.resolve(40_000n),
      },
      spotRateClient: {
        getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> =>
          Promise.resolve(800_000n),
      },
      now: () => new Date("2026-07-20T18:00:00.000Z"),
    })(validSpec);

    expect(first.priceCad.amountCents).toBe(10_000n);
    expect(second.priceCad.amountCents).toBe(40_000n);
    expect(first.priceUsdc.amountBaseUnits).not.toBe(
      second.priceUsdc.amountBaseUnits,
    );
  });

  it("maps product lines through catalog before pricing", async () => {
    const quoteCadCents = vi.fn(
      (): Promise<bigint> => Promise.resolve(1_000n),
    );

    await createRealtimeQuote({
      pricingClient: { quoteCadCents },
      spotRateClient: {
        getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> =>
          Promise.resolve(750_000n),
      },
      now: () => new Date("2026-07-20T18:00:00.000Z"),
    })({
      ...validSpec,
      productLine: "wideFormat",
    });

    expect(quoteCadCents).toHaveBeenCalledWith({
      spec: { ...validSpec, productLine: "wideFormat" },
      printProcess: "wide-format",
    });
  });

  it("rejects malformed specs before calling pricing or FX", async () => {
    const quoteCadCents = vi.fn(
      (): Promise<bigint> => Promise.resolve(1_000n),
    );
    const getUsdcBaseUnitsPerCadDollar = vi.fn(
      (): Promise<bigint> => Promise.resolve(750_000n),
    );

    await expect(
      createRealtimeQuote({
        pricingClient: { quoteCadCents },
        spotRateClient: { getUsdcBaseUnitsPerCadDollar },
      })({
        ...validSpec,
        quantity: -1,
      }),
    ).rejects.toMatchObject({ name: "ZodError" });

    expect(quoteCadCents).not.toHaveBeenCalled();
    expect(getUsdcBaseUnitsPerCadDollar).not.toHaveBeenCalled();
  });

  it("rejects negative amounts from the pricing client", async () => {
    await expect(
      createRealtimeQuote({
        pricingClient: {
          quoteCadCents: (): Promise<bigint> => Promise.resolve(-1n),
        },
        spotRateClient: {
          getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> =>
            Promise.resolve(750_000n),
        },
      })(validSpec),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
