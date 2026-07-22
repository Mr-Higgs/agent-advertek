import { describe, expect, it } from "vitest";
import type { ProductLine, SkuSpec } from "@advertek/types";
import {
  PRODUCT_LINE_TO_PRINT_PROCESS,
  mapProductLineToPrintProcess,
  mapSkuSpecToPrintProcess,
  resolvePrintProcessFromUnknown,
} from "./product-line-map.js";

const baseSpec: SkuSpec = {
  productLine: "offset",
  dimensions: { width: 210, height: 297 },
  stock: { material: "coated-text", weight: 100 },
  finish: ["matte"],
  quantity: 500,
  turnaround: "standard",
};

describe("product-line-map", () => {
  it("maps every ProductLine to an Advertek PrintProcess", () => {
    const expected: Record<ProductLine, string> = {
      offset: "offset",
      digital: "digital",
      wideFormat: "wide-format",
      bookManufacturing: "offset",
      dyeSublimation: "wide-format",
      wallDecor: "wide-format",
      directMail: "direct-mail",
      embellishments: "digital",
      packaging: "packaging",
      bindery: "offset",
      printOnDemand: "print-on-demand",
    };

    for (const productLine of Object.keys(expected) as ProductLine[]) {
      expect(mapProductLineToPrintProcess(productLine)).toBe(
        expected[productLine],
      );
      expect(PRODUCT_LINE_TO_PRINT_PROCESS[productLine]).toBe(
        expected[productLine],
      );
    }
  });

  it("maps a valid SKU spec through its productLine", () => {
    expect(
      mapSkuSpecToPrintProcess({
        ...baseSpec,
        productLine: "wideFormat",
      }),
    ).toBe("wide-format");
  });

  it("rejects an invalid SKU spec before mapping", () => {
    expect(() =>
      mapSkuSpecToPrintProcess({
        ...baseSpec,
        quantity: 0,
      }),
    ).toThrow();
  });

  it("resolves print process from unknown input via Zod", () => {
    const resolved = resolvePrintProcessFromUnknown({
      ...baseSpec,
      productLine: "printOnDemand",
    });

    expect(resolved.printProcess).toBe("print-on-demand");
    expect(resolved.spec.productLine).toBe("printOnDemand");
  });

  it("rejects malformed unknown input cleanly via safeParse path", () => {
    const result = (() => {
      try {
        resolvePrintProcessFromUnknown({ productLine: "flexo" });
        return { ok: true as const };
      } catch (error) {
        return {
          ok: false as const,
          name: error instanceof Error ? error.name : "unknown",
        };
      }
    })();

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ name: "ZodError" });
  });
});
