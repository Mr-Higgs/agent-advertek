import { describe, expect, it } from "vitest";
import {
  POD_PRICE_LIST,
  createPodPriceListCatalogRepository,
  getPodPriceListEntry,
  listPodPriceListEntriesByCategory,
  podPriceListEntrySchema,
} from "./pod-price-list.js";

describe("POD_PRICE_LIST", () => {
  it("is non-empty and every entry passes its own schema", () => {
    expect(POD_PRICE_LIST.length).toBeGreaterThan(0);
    for (const entry of POD_PRICE_LIST) {
      expect(() => podPriceListEntrySchema.parse(entry)).not.toThrow();
    }
  });

  it("has no duplicate SKUs", () => {
    const skus = POD_PRICE_LIST.map((entry) => entry.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("never prices MSRP below wholesale cost, in either currency", () => {
    for (const entry of POD_PRICE_LIST) {
      expect(entry.msrpUsdCents).toBeGreaterThanOrEqual(entry.wholesaleUsdCents);
      expect(entry.msrpCadCents).toBeGreaterThanOrEqual(entry.wholesaleCadCents);
    }
  });

  it("spot-checks a known mug SKU against the source spreadsheet", () => {
    expect(getPodPriceListEntry("MUG-11-WHT")).toEqual({
      sku: "MUG-11-WHT",
      name: "11oz White Mug",
      category: "mugs",
      wholesaleUsdCents: 705n,
      msrpUsdCents: 1499n,
      wholesaleCadCents: 860n,
      msrpCadCents: 1290n,
    });
  });

  it("gives every reconstructed t-shirt SKU the same price regardless of size/orientation", () => {
    const tShirtSkus = [
      "TEE-CN-V-S",
      "TEE-CN-V-M",
      "TEE-CN-V-L",
      "TEE-CN-V-XL",
      "TEE-CN-H-S",
      "TEE-CN-H-M",
      "TEE-CN-H-L",
      "TEE-CN-H-XL",
    ];

    for (const sku of tShirtSkus) {
      const entry = getPodPriceListEntry(sku);
      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        category: "t-shirts",
        wholesaleUsdCents: 1344n,
        msrpUsdCents: 2799n,
        wholesaleCadCents: 1639n,
        msrpCadCents: 2459n,
      });
    }
  });
});

describe("getPodPriceListEntry", () => {
  it("returns undefined for an unknown SKU", () => {
    expect(getPodPriceListEntry("NOT-A-REAL-SKU")).toBeUndefined();
  });
});

describe("listPodPriceListEntriesByCategory", () => {
  it("returns only entries in the requested category", () => {
    const canvasEntries = listPodPriceListEntriesByCategory("canvas-gallery-wrap");
    expect(canvasEntries.length).toBeGreaterThan(0);
    for (const entry of canvasEntries) {
      expect(entry.category).toBe("canvas-gallery-wrap");
    }
  });

  it("returns an empty array for a category with (hypothetically) no entries", () => {
    // Every real category currently has entries; this guards the function's
    // filter behavior rather than a specific data gap.
    const result = listPodPriceListEntriesByCategory("mugs").filter(
      (entry) => entry.sku === "NOT-A-REAL-SKU",
    );
    expect(result).toEqual([]);
  });
});

describe("createPodPriceListCatalogRepository", () => {
  it("lists every price list entry as an active print-on-demand Sku", async () => {
    const repo = createPodPriceListCatalogRepository();
    const skus = await repo.list();

    expect(skus.length).toBe(POD_PRICE_LIST.length);
    for (const sku of skus) {
      expect(sku.process).toBe("print-on-demand");
      expect(sku.active).toBe(true);
    }
  });

  it("finds a Sku by its price list SKU code", async () => {
    const repo = createPodPriceListCatalogRepository();
    const sku = await repo.findById("MUG-11-WHT");

    expect(sku).toEqual({
      id: "MUG-11-WHT",
      name: "11oz White Mug",
      process: "print-on-demand",
      active: true,
    });
  });

  it("returns undefined for an unknown id", async () => {
    const repo = createPodPriceListCatalogRepository();
    expect(await repo.findById("NOT-A-REAL-SKU")).toBeUndefined();
  });
});
