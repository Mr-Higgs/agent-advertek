import { describe, expect, it, vi } from "vitest";
import type { RealtimeQuote } from "@advertek/quote-api";
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

const validSpec: SkuSpec = {
  productLine: "packaging",
  dimensions: { width: 100, height: 150, depth: 40 },
  stock: { material: "corrugate", weight: 200 },
  finish: ["matte", "spotUv"],
  quantity: 1000,
  turnaround: "rush",
  assets: [{ url: "https://assets.example.com/order-1/artwork.pdf" }],
};

describe("get_catalog payload", () => {
  it("returns structured catalog data that matches the output schema", () => {
    const result = buildCatalogToolResult();
    expect(catalogToolResultSchema.parse(result)).toEqual(result);
    expect(result.productLines.length).toBeGreaterThan(0);
    expect(result.specRequirements.some((field) => field.name === "productLine")).toBe(
      true,
    );
  });

  it("includes every product line id an agent may pass to get_quote", () => {
    const ids = buildCatalogToolResult().productLines.map((line) => line.id);
    expect(ids).toContain("offset");
    expect(ids).toContain("printOnDemand");
    expect(ids).toContain("wideFormat");
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

describe("createAdvertekMcpServer", () => {
  it("registers get_catalog and get_quote tools", () => {
    const server = createAdvertekMcpServer({
      executeQuote: (): Promise<RealtimeQuote> =>
        Promise.resolve({
          spec: validSpec,
          printProcess: "packaging",
          priceCad: { currency: "CAD", amountCents: 1n },
          priceUsdc: { currency: "USDC", amountBaseUnits: 1n },
          quotedAt: new Date("2026-07-20T19:00:00.000Z"),
        }),
    });

    const tools = (
      server as unknown as {
        _registeredTools: Record<string, { name?: string }>;
      }
    )._registeredTools;

    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining(["get_catalog", "get_quote"]),
    );
  });
});
