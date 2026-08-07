import { describe, expect, it, vi } from "vitest";
import type { RealtimeQuote, SkuQuote, SpotRateClient } from "@advertek/quote-api";
import { UnknownSkuError } from "@advertek/quote-api";
import type { SkuSpec } from "@advertek/types";
import {
  buildCatalogToolResult,
  catalogToolResultSchema,
} from "./catalog-tool.js";
import { createAdvertekMcpServer } from "./create-server.js";
import {
  buildQuoteToolResult,
  quoteToolResultSchema,
} from "./quote-tool.js";
import {
  buildSkuQuoteToolResult,
  skuQuoteToolResultSchema,
} from "./sku-quote-tool.js";
import type { CreatedOrder } from "./create-order-tool.js";

const validSpec: SkuSpec = {
  productLine: "packaging",
  dimensions: { width: 100, height: 150, depth: 40 },
  stock: { material: "corrugate", weight: 200 },
  finish: ["matte", "spotUv"],
  quantity: 1000,
  turnaround: "rush",
  assets: [{ url: "https://assets.example.com/order-1/artwork.pdf" }],
};

const spotRateClient: SpotRateClient = {
  getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> => Promise.resolve(730_000n),
};

describe("get_catalog payload", () => {
  it("returns structured catalog data that matches the output schema", async () => {
    const result = await buildCatalogToolResult({ spotRateClient });
    expect(catalogToolResultSchema.parse(result)).toEqual(result);
    expect(result.productLines.length).toBeGreaterThan(0);
    expect(result.specRequirements.some((field) => field.name === "productLine")).toBe(
      true,
    );
  });

  it("includes every product line id an agent may pass to get_quote", async () => {
    const ids = (await buildCatalogToolResult({ spotRateClient })).productLines.map(
      (line) => line.id,
    );
    expect(ids).toContain("offset");
    expect(ids).toContain("printOnDemand");
    expect(ids).toContain("wideFormat");
  });

  it("includes a skuCatalog of raw POD SKU codes an agent may pass to get_sku_quote, priced in CAD and an estimated USDC", async () => {
    const result = await buildCatalogToolResult({ spotRateClient });
    expect(result.skuCatalog.length).toBeGreaterThan(0);

    const mug = result.skuCatalog.find((entry) => entry.sku === "MUG-11-WHT");
    expect(mug).toEqual({
      sku: "MUG-11-WHT",
      name: "11oz White Mug",
      category: "mugs",
      priceCad: { currency: "CAD", amountCents: "1290" },
      // 1290 cents * 730000 / 100 = 9_417_000 base units
      estimatedPriceUsdc: { currency: "USDC", amountBaseUnits: "9417000" },
    });
  });

  it("recomputes the USDC estimate from whatever spot rate is supplied", async () => {
    const doubleRateClient: SpotRateClient = {
      getUsdcBaseUnitsPerCadDollar: (): Promise<bigint> => Promise.resolve(1_460_000n),
    };

    const result = await buildCatalogToolResult({ spotRateClient: doubleRateClient });
    const mug = result.skuCatalog.find((entry) => entry.sku === "MUG-11-WHT");
    expect(mug?.estimatedPriceUsdc).toEqual({
      currency: "USDC",
      amountBaseUnits: "18834000",
    });
  });
});

describe("get_quote payload", () => {
  it("returns a structured success quote with string-encoded money amounts", async () => {
    const quote: RealtimeQuote = {
      spec: validSpec,
      printProcess: "packaging",
      priceCad: { currency: "CAD", amountCents: 55_000n },
      priceUsdc: { currency: "USDC", amountBaseUnits: 400_000_000n },
      quotedAt: new Date("2026-07-20T19:00:00.000Z"),
    };
    const executeQuote = vi.fn((): Promise<RealtimeQuote> =>
      Promise.resolve(quote),
    );

    const result = await buildQuoteToolResult(executeQuote, validSpec);
    expect(quoteToolResultSchema.parse(result)).toEqual(result);
    expect(result).toEqual({
      ok: true,
      quote: {
        printProcess: "packaging",
        spec: validSpec,
        priceCad: { currency: "CAD", amountCents: "55000" },
        priceUsdc: { currency: "USDC", amountBaseUnits: "400000000" },
        quotedAt: "2026-07-20T19:00:00.000Z",
      },
    });
    expect(executeQuote).toHaveBeenCalledWith(validSpec);
  });

  it("rejects malformed specs as structured validation errors without quoting", async () => {
    const executeQuote = vi.fn((): Promise<RealtimeQuote> =>
      Promise.resolve({
        spec: validSpec,
        printProcess: "packaging",
        priceCad: { currency: "CAD", amountCents: 1n },
        priceUsdc: { currency: "USDC", amountBaseUnits: 1n },
        quotedAt: new Date(),
      }),
    );

    const result = await buildQuoteToolResult(executeQuote, {
      ...validSpec,
      quantity: 0,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.error.code).toBe("invalid_sku_spec");
    expect(result.error.issues?.length).toBeGreaterThan(0);
    expect(executeQuote).not.toHaveBeenCalled();
    expect(quoteToolResultSchema.parse(result)).toEqual(result);
  });
});

describe("get_sku_quote payload", () => {
  const skuQuote: SkuQuote = {
    sku: "MUG-11-WHT",
    name: "11oz White Mug",
    category: "mugs",
    quantity: 3,
    unitPriceCad: { currency: "CAD", amountCents: 1290n },
    priceCad: { currency: "CAD", amountCents: 3870n },
    priceUsdc: { currency: "USDC", amountBaseUnits: 28_251_000n },
    quotedAt: new Date("2026-08-06T20:00:00.000Z"),
  };

  it("returns a structured success quote with string-encoded money amounts", async () => {
    const executeSkuQuote = vi.fn((): Promise<SkuQuote> => Promise.resolve(skuQuote));

    const result = await buildSkuQuoteToolResult(executeSkuQuote, {
      sku: "MUG-11-WHT",
      quantity: 3,
    });

    expect(skuQuoteToolResultSchema.parse(result)).toEqual(result);
    expect(result).toEqual({
      ok: true,
      quote: {
        sku: "MUG-11-WHT",
        name: "11oz White Mug",
        category: "mugs",
        quantity: 3,
        unitPriceCad: { currency: "CAD", amountCents: "1290" },
        priceCad: { currency: "CAD", amountCents: "3870" },
        priceUsdc: { currency: "USDC", amountBaseUnits: "28251000" },
        quotedAt: "2026-08-06T20:00:00.000Z",
      },
    });
    expect(executeSkuQuote).toHaveBeenCalledWith({ sku: "MUG-11-WHT", quantity: 3 });
  });

  it("rejects malformed input as a structured validation error without quoting", async () => {
    const executeSkuQuote = vi.fn((): Promise<SkuQuote> => Promise.resolve(skuQuote));

    const result = await buildSkuQuoteToolResult(executeSkuQuote, { sku: "", quantity: 3 });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.error.code).toBe("invalid_input");
    expect(result.error.issues?.length).toBeGreaterThan(0);
    expect(executeSkuQuote).not.toHaveBeenCalled();
    expect(skuQuoteToolResultSchema.parse(result)).toEqual(result);
  });

  it("returns a structured unknown_sku error for a SKU not in the catalog", async () => {
    const executeSkuQuote = vi.fn(
      (): Promise<SkuQuote> => Promise.reject(new UnknownSkuError("Unknown SKU: NOPE")),
    );

    const result = await buildSkuQuoteToolResult(executeSkuQuote, { sku: "NOPE" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.error.code).toBe("unknown_sku");
    expect(skuQuoteToolResultSchema.parse(result)).toEqual(result);
  });
});

describe("createAdvertekMcpServer", () => {
  it("registers get_catalog, get_quote, get_sku_quote, and create_order tools", () => {
    const server = createAdvertekMcpServer({
      executeQuote: (): Promise<RealtimeQuote> =>
        Promise.resolve({
          spec: validSpec,
          printProcess: "packaging",
          priceCad: { currency: "CAD", amountCents: 1n },
          priceUsdc: { currency: "USDC", amountBaseUnits: 1n },
          quotedAt: new Date("2026-07-20T19:00:00.000Z"),
        }),
      executeSkuQuote: (): Promise<SkuQuote> =>
        Promise.resolve({
          sku: "MUG-11-WHT",
          name: "11oz White Mug",
          category: "mugs",
          quantity: 1,
          unitPriceCad: { currency: "CAD", amountCents: 1290n },
          priceCad: { currency: "CAD", amountCents: 1290n },
          priceUsdc: { currency: "USDC", amountBaseUnits: 9_417_000n },
          quotedAt: new Date("2026-08-06T20:00:00.000Z"),
        }),
      spotRateClient,
      executeCreateOrder: (): Promise<CreatedOrder> =>
        Promise.resolve({
          orderId: "ord_1",
          memo: "advertek:order:ord_1:nonce",
          settlementWallet: "Sett1ement",
          amountBaseUnits: 9_417_000n,
          usdcMintAddress: "Mint",
          usdcDecimals: 6,
        }),
    });

    const tools = (
      server as unknown as {
        _registeredTools: Record<string, { name?: string }>;
      }
    )._registeredTools;

    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        "get_catalog",
        "get_quote",
        "get_sku_quote",
        "create_order",
      ]),
    );
  });
});
