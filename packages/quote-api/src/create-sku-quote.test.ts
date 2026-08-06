import { describe, expect, it, vi } from "vitest";
import { createSkuQuote, UnknownSkuError } from "./create-sku-quote.js";
import type { SpotRateClient } from "./spot-rate-client.js";

describe("createSkuQuote", () => {
  it("quotes a known SKU at MSRP times quantity, converted to USDC via the spot-rate client", async () => {
    const getUsdcBaseUnitsPerCadDollar = vi.fn(
      (): Promise<bigint> => Promise.resolve(730_000n),
    );
    const spotRateClient: SpotRateClient = { getUsdcBaseUnitsPerCadDollar };
    const quotedAt = new Date("2026-08-06T20:00:00.000Z");

    const quote = await createSkuQuote({ spotRateClient, now: () => quotedAt })({
      sku: "MUG-11-WHT",
      quantity: 3,
    });

    expect(getUsdcBaseUnitsPerCadDollar).toHaveBeenCalledOnce();
    expect(quote.sku).toBe("MUG-11-WHT");
    expect(quote.name).toBe("11oz White Mug");
    expect(quote.category).toBe("mugs");
    expect(quote.quantity).toBe(3);
    // MSRP is 1290 CAD cents/unit.
    expect(quote.unitPriceCad).toEqual({ currency: "CAD", amountCents: 1290n });
    expect(quote.priceCad).toEqual({ currency: "CAD", amountCents: 3870n });
    // 3870 cents * 730000 / 100 = 28_251_000 base units
    expect(quote.priceUsdc).toEqual({
      currency: "USDC",
      amountBaseUnits: 28_251_000n,
    });
    expect(quote.quotedAt).toBe(quotedAt);
  });

  it("defaults quantity to 1 when omitted", async () => {
    const quote = await createSkuQuote({
      spotRateClient: {
        getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> => Promise.resolve(730_000n),
      },
    })({ sku: "MUG-11-WHT" });

    expect(quote.quantity).toBe(1);
    expect(quote.priceCad).toEqual(quote.unitPriceCad);
  });

  it("throws UnknownSkuError for a SKU that isn't in the price list, without calling the spot-rate client", async () => {
    const getUsdcBaseUnitsPerCadDollar = vi.fn(
      (): Promise<bigint> => Promise.resolve(730_000n),
    );

    await expect(
      createSkuQuote({ spotRateClient: { getUsdcBaseUnitsPerCadDollar } })({
        sku: "NOT-A-REAL-SKU",
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(UnknownSkuError);
    expect(getUsdcBaseUnitsPerCadDollar).not.toHaveBeenCalled();
  });

  it("rejects a non-positive quantity before looking anything up", async () => {
    const getUsdcBaseUnitsPerCadDollar = vi.fn(
      (): Promise<bigint> => Promise.resolve(730_000n),
    );

    await expect(
      createSkuQuote({ spotRateClient: { getUsdcBaseUnitsPerCadDollar } })({
        sku: "MUG-11-WHT",
        quantity: 0,
      }),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(getUsdcBaseUnitsPerCadDollar).not.toHaveBeenCalled();
  });

  it("rejects a missing sku before looking anything up", async () => {
    await expect(
      createSkuQuote({
        spotRateClient: {
          getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> => Promise.resolve(730_000n),
        },
      })({ quantity: 1 }),
    ).rejects.toMatchObject({ name: "ZodError" });
  });
});
