import { describe, expect, it } from "vitest";
import {
  absBigint,
  allocateProportionally,
  baseUnitsToDecimalString,
  decimalStringToMinorUnits,
  maxBigint,
  multiplyDecimalStrings,
} from "./money.js";

describe("baseUnitsToDecimalString", () => {
  it("converts whole-unit amounts", () => {
    expect(baseUnitsToDecimalString(5_000_000n, 6)).toBe("5");
  });

  it("converts fractional amounts, trimming trailing zeros", () => {
    expect(baseUnitsToDecimalString(1_250_000n, 6)).toBe("1.25");
  });

  it("preserves precision with no trailing zeros to trim", () => {
    expect(baseUnitsToDecimalString(1_234_567n, 6)).toBe("1.234567");
  });

  it("handles zero", () => {
    expect(baseUnitsToDecimalString(0n, 6)).toBe("0");
  });

  it("handles negative amounts", () => {
    expect(baseUnitsToDecimalString(-1_500_000n, 6)).toBe("-1.5");
  });

  it("handles zero decimals", () => {
    expect(baseUnitsToDecimalString(42n, 0)).toBe("42");
  });

  it("rejects a negative decimals argument", () => {
    expect(() => baseUnitsToDecimalString(1n, -1)).toThrow(RangeError);
  });
});

describe("decimalStringToMinorUnits", () => {
  it("converts an exact 2-decimal amount to cents", () => {
    expect(decimalStringToMinorUnits("91.35", 2)).toBe(9_135n);
  });

  it("rounds half-up on extra fractional digits", () => {
    expect(decimalStringToMinorUnits("91.358", 2)).toBe(9_136n);
    expect(decimalStringToMinorUnits("91.354", 2)).toBe(9_135n);
    expect(decimalStringToMinorUnits("91.355", 2)).toBe(9_136n);
  });

  it("pads short fractional parts", () => {
    expect(decimalStringToMinorUnits("91.3", 2)).toBe(9_130n);
    expect(decimalStringToMinorUnits("91", 2)).toBe(9_100n);
  });

  it("handles negative amounts", () => {
    expect(decimalStringToMinorUnits("-91.35", 2)).toBe(-9_135n);
  });

  it("rejects malformed decimal strings", () => {
    expect(() => decimalStringToMinorUnits("not-a-number", 2)).toThrow();
    expect(() => decimalStringToMinorUnits("1.2.3", 2)).toThrow();
    expect(() => decimalStringToMinorUnits("", 2)).toThrow();
  });
});

describe("allocateProportionally", () => {
  it("splits a total proportionally", () => {
    expect(allocateProportionally(1000n, 25n, 100n)).toBe(250n);
  });

  it("truncates instead of rounding up", () => {
    expect(allocateProportionally(1000n, 1n, 3n)).toBe(333n);
  });

  it("returns 0 when whole is 0 (no division by zero)", () => {
    expect(allocateProportionally(1000n, 0n, 0n)).toBe(0n);
  });
});

describe("multiplyDecimalStrings", () => {
  it("multiplies two decimal strings without floating-point error", () => {
    expect(multiplyDecimalStrings("123.456789", "0.74")).toBe("91.35802386");
  });

  it("multiplies whole numbers", () => {
    expect(multiplyDecimalStrings("100", "1.35")).toBe("135.00");
  });

  it("handles a product smaller than the combined decimal scale", () => {
    expect(multiplyDecimalStrings("0.01", "0.01")).toBe("0.0001");
  });

  it("handles zero", () => {
    expect(multiplyDecimalStrings("0", "123.45")).toBe("0.00");
  });
});

describe("absBigint / maxBigint", () => {
  it("computes absolute value", () => {
    expect(absBigint(-5n)).toBe(5n);
    expect(absBigint(5n)).toBe(5n);
    expect(absBigint(0n)).toBe(0n);
  });

  it("computes the max of two bigints", () => {
    expect(maxBigint(3n, 7n)).toBe(7n);
    expect(maxBigint(7n, 3n)).toBe(7n);
    expect(maxBigint(-1n, -5n)).toBe(-1n);
  });
});
