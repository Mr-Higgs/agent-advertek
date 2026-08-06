import { describe, expect, it } from "vitest";
import { formatUsdCentsAsDecimalString } from "./money.js";

describe("formatUsdCentsAsDecimalString", () => {
  it("formats whole dollars", () => {
    expect(formatUsdCentsAsDecimalString(1900n)).toBe("19.00");
  });

  it("formats cents with padding", () => {
    expect(formatUsdCentsAsDecimalString(1999n)).toBe("19.99");
    expect(formatUsdCentsAsDecimalString(105n)).toBe("1.05");
    expect(formatUsdCentsAsDecimalString(5n)).toBe("0.05");
  });

  it("formats zero", () => {
    expect(formatUsdCentsAsDecimalString(0n)).toBe("0.00");
  });

  it("rejects negative amounts", () => {
    expect(() => formatUsdCentsAsDecimalString(-1n)).toThrow(RangeError);
  });
});
