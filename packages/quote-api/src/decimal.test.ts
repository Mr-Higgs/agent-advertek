import { describe, expect, it } from "vitest";
import { DecimalParseError, decimalStringToMinorUnits } from "./decimal.js";

describe("decimalStringToMinorUnits", () => {
  it("scales a decimal string to integer minor units", () => {
    expect(decimalStringToMinorUnits("0.7312", 6)).toBe(731_200n);
    expect(decimalStringToMinorUnits("1", 6)).toBe(1_000_000n);
    expect(decimalStringToMinorUnits("12.5", 2)).toBe(1250n);
  });

  it("truncates precision beyond the requested decimals", () => {
    expect(decimalStringToMinorUnits("0.7312349999", 6)).toBe(731_234n);
  });

  it("keeps precision beyond Number.MAX_SAFE_INTEGER", () => {
    expect(decimalStringToMinorUnits("9007199254.740993", 6)).toBe(
      9_007_199_254_740_993n,
    );
  });

  it("rejects negative and malformed values", () => {
    expect(() => decimalStringToMinorUnits("-1.00", 6)).toThrow(DecimalParseError);
    expect(() => decimalStringToMinorUnits("1e6", 6)).toThrow(DecimalParseError);
    expect(() => decimalStringToMinorUnits("", 6)).toThrow(DecimalParseError);
  });
});
