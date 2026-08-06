import { describe, expect, it } from "vitest";
import type { ProductLine } from "@advertek/types";
import {
  PRODUCT_LINE_TO_ADVERTEK_PRODUCT_CODE,
  mapProductLineToAdvertekProductCode,
} from "./product-code-map.js";

describe("product-code-map", () => {
  it("maps every ProductLine to a non-empty Advertek product code", () => {
    const productLines: ProductLine[] = [
      "offset",
      "digital",
      "wideFormat",
      "bookManufacturing",
      "dyeSublimation",
      "wallDecor",
      "directMail",
      "embellishments",
      "packaging",
      "bindery",
      "printOnDemand",
    ];

    for (const productLine of productLines) {
      const code = mapProductLineToAdvertekProductCode(productLine);
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
      expect(PRODUCT_LINE_TO_ADVERTEK_PRODUCT_CODE[productLine]).toBe(code);
    }
  });

  it("is a pure lookup — same input always returns the same code", () => {
    expect(mapProductLineToAdvertekProductCode("offset")).toBe(
      mapProductLineToAdvertekProductCode("offset"),
    );
  });
});
