import { describe, expect, it } from "vitest";
import { skuSpecSchema, type SkuSpec } from "./sku-spec.js";

const validSpec: SkuSpec = {
  productLine: "offset",
  dimensions: {
    width: 210,
    height: 297,
  },
  stock: {
    material: "coated-text",
    weight: 100,
  },
  finish: ["matte"],
  quantity: 500,
  turnaround: "standard",
};

function withOverrides(overrides: Record<string, unknown>): unknown {
  return {
    ...validSpec,
    ...overrides,
  };
}

describe("skuSpecSchema", () => {
  describe("valid specs", () => {
    it("accepts a minimal valid spec without depth", () => {
      expect(skuSpecSchema.parse(validSpec)).toEqual(validSpec);
    });

    it("accepts a spec with optional depth", () => {
      const spec = withOverrides({
        dimensions: { width: 100, height: 200, depth: 25 },
      });

      expect(skuSpecSchema.parse(spec)).toEqual(spec);
    });

    it("accepts every productLine value", () => {
      const productLines = [
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
      ] as const;

      for (const productLine of productLines) {
        expect(
          skuSpecSchema.parse(withOverrides({ productLine })).productLine,
        ).toBe(productLine);
      }
    });

    it("accepts multiple finishes", () => {
      const spec = withOverrides({
        finish: ["softTouch", "spotUv", "foil"],
      });

      expect(skuSpecSchema.parse(spec).finish).toEqual([
        "softTouch",
        "spotUv",
        "foil",
      ]);
    });

    it("accepts an empty finish list", () => {
      const spec = withOverrides({ finish: [] });
      expect(skuSpecSchema.parse(spec).finish).toEqual([]);
    });

    it("accepts every turnaround value", () => {
      for (const turnaround of ["standard", "expedited", "rush"] as const) {
        expect(
          skuSpecSchema.parse(withOverrides({ turnaround })).turnaround,
        ).toBe(turnaround);
      }
    });
  });

  describe("invalid productLine", () => {
    it.each([
      ["missing", undefined],
      ["null", null],
      ["empty string", ""],
      ["unknown value", "flexo"],
      ["legacy kebab-case value", "wide-format"],
      ["number", 1],
      ["boolean", true],
      ["array", ["offset"]],
    ])("rejects %s", (_label, productLine) => {
      expect(() =>
        skuSpecSchema.parse(withOverrides({ productLine })),
      ).toThrow();
    });
  });

  describe("invalid dimensions", () => {
    it.each([
      ["missing", undefined],
      ["null", null],
      ["not an object", "210x297"],
      ["missing width", { height: 297 }],
      ["missing height", { width: 210 }],
      ["zero width", { width: 0, height: 297 }],
      ["negative height", { width: 210, height: -1 }],
      ["zero depth", { width: 210, height: 297, depth: 0 }],
      ["negative depth", { width: 210, height: 297, depth: -5 }],
      ["string width", { width: "210", height: 297 }],
      ["NaN height", { width: 210, height: Number.NaN }],
    ])("rejects %s", (_label, dimensions) => {
      expect(() =>
        skuSpecSchema.parse(withOverrides({ dimensions })),
      ).toThrow();
    });
  });

  describe("invalid stock", () => {
    it.each([
      ["missing", undefined],
      ["null", null],
      ["not an object", "coated-text 100gsm"],
      ["missing material", { weight: 100 }],
      ["missing weight", { material: "coated-text" }],
      ["empty material", { material: "", weight: 100 }],
      ["zero weight", { material: "coated-text", weight: 0 }],
      ["negative weight", { material: "coated-text", weight: -80 }],
      ["string weight", { material: "coated-text", weight: "100" }],
      ["null material", { material: null, weight: 100 }],
    ])("rejects %s", (_label, stock) => {
      expect(() => skuSpecSchema.parse(withOverrides({ stock }))).toThrow();
    });
  });

  describe("invalid finish", () => {
    it.each([
      ["missing", undefined],
      ["null", null],
      ["string instead of array", "matte"],
      ["object instead of array", { primary: "matte" }],
      ["unknown finish value", ["satin"]],
      ["number in array", [1]],
      ["null in array", [null]],
      ["nested array", [["matte"]]],
      ["boolean", false],
    ])("rejects %s", (_label, finish) => {
      expect(() => skuSpecSchema.parse(withOverrides({ finish }))).toThrow();
    });
  });

  describe("invalid quantity", () => {
    it.each([
      ["missing", undefined],
      ["null", null],
      ["zero", 0],
      ["negative", -1],
      ["float", 1.5],
      ["string", "500"],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["boolean", true],
      ["array", [500]],
    ])("rejects %s", (_label, quantity) => {
      expect(() =>
        skuSpecSchema.parse(withOverrides({ quantity })),
      ).toThrow();
    });
  });

  describe("invalid turnaround", () => {
    it.each([
      ["missing", undefined],
      ["null", null],
      ["empty string", ""],
      ["unknown value", "overnight"],
      ["wrong case", "Standard"],
      ["number", 1],
      ["boolean", false],
      ["array", ["standard"]],
    ])("rejects %s", (_label, turnaround) => {
      expect(() =>
        skuSpecSchema.parse(withOverrides({ turnaround })),
      ).toThrow();
    });
  });
});
