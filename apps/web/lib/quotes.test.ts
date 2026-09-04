import { createSkuQuote, type SpotRateClient } from "@advertek/quote-api";
import type { SkuSpec } from "@advertek/types";
import { describe, expect, it, vi } from "vitest";
import { withPodSkuPricing } from "./quotes";

const spotRateClient: SpotRateClient = {
  getUsdcBaseUnitsPerCadDollar: () => Promise.resolve(730_000n),
};

function podSpec(
  overrides: Partial<{ material: string; quantity: number; productLine: SkuSpec["productLine"] }> = {},
): SkuSpec {
  return {
    productLine: overrides.productLine ?? "printOnDemand",
    dimensions: { width: 90, height: 95 },
    stock: { material: overrides.material ?? "MUG-11-WHT", weight: 200 },
    finish: ["none"],
    quantity: overrides.quantity ?? 1,
    turnaround: "standard",
    assets: [{ url: "https://example.com/art.png" }],
  };
}

describe("withPodSkuPricing", () => {
  it("prices a known POD SKU at MSRP times quantity without calling the inner executor", async () => {
    const inner = vi.fn();
    const execute = withPodSkuPricing({ inner, spotRateClient });

    const quote = await execute(podSpec({ quantity: 3 }));

    // MUG-11-WHT MSRP is 1290 CAD cents in the checked-in price list.
    expect(quote.priceCad.amountCents).toBe(1290n * 3n);
    expect(quote.printProcess).toBe("print-on-demand");
    expect(inner).not.toHaveBeenCalled();
  });

  it("matches createSkuQuote's USDC conversion for the same SKU and rate", async () => {
    const execute = withPodSkuPricing({ inner: vi.fn(), spotRateClient });
    const skuQuote = await createSkuQuote({ spotRateClient })({ sku: "MUG-11-WHT", quantity: 2 });

    const quote = await execute(podSpec({ quantity: 2 }));

    expect(quote.priceCad.amountCents).toBe(skuQuote.priceCad.amountCents);
    expect(quote.priceUsdc.amountBaseUnits).toBe(skuQuote.priceUsdc.amountBaseUnits);
  });

  it("delegates unknown POD materials to the inner executor", async () => {
    const fallback = { priceCad: { currency: "CAD", amountCents: 12_500n } };
    const inner = vi.fn().mockResolvedValue(fallback);
    const execute = withPodSkuPricing({ inner, spotRateClient });

    const spec = podSpec({ material: "NOT-A-SKU" });
    await expect(execute(spec)).resolves.toBe(fallback);
    expect(inner).toHaveBeenCalledWith(spec);
  });

  it("delegates non-POD product lines to the inner executor", async () => {
    const inner = vi.fn().mockResolvedValue({});
    const execute = withPodSkuPricing({ inner, spotRateClient });

    await execute(podSpec({ productLine: "digital" }));
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("delegates invalid specs so the inner executor reports the validation error", async () => {
    const inner = vi.fn().mockRejectedValue(new Error("invalid"));
    const execute = withPodSkuPricing({ inner, spotRateClient });

    await expect(execute({ nonsense: true } as unknown as SkuSpec)).rejects.toThrow("invalid");
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
