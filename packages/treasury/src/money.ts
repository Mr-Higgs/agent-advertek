/**
 * Pure, floating-point-free conversions between on-chain integer base units
 * (e.g. USDC's 6 decimals) and the decimal strings OKX's REST API expects,
 * and between decimal strings and integer minor units (e.g. CAD cents).
 * Per project convention, money is never represented as a float anywhere.
 */

/** Converts an integer base-unit amount into the decimal string OKX expects. */
export function baseUnitsToDecimalString(amountBaseUnits: bigint, decimals: number): string {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new RangeError(`decimals must be a non-negative integer, got ${String(decimals)}`);
  }
  const negative = amountBaseUnits < 0n;
  const abs = negative ? -amountBaseUnits : amountBaseUnits;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = (abs % divisor).toString().padStart(decimals, "0");
  const trimmedFraction = fraction.replace(/0+$/, "");
  const decimalString =
    trimmedFraction.length > 0 ? `${whole.toString()}.${trimmedFraction}` : whole.toString();
  return negative ? `-${decimalString}` : decimalString;
}

/**
 * Converts a decimal string (e.g. an OKX `fillQuoteSz`/`cnvtPx` value) into
 * integer minor units at `minorUnitDecimals` precision (2 for CAD cents),
 * rounding half-up on any extra fractional digits.
 */
export function decimalStringToMinorUnits(
  value: string,
  minorUnitDecimals: number,
): bigint {
  const trimmed = value.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Not a valid decimal string: ${value}`);
  }
  const [, sign = "", wholePart = "0", fractionPartRaw = ""] = match;

  const keptFraction = fractionPartRaw.slice(0, minorUnitDecimals).padEnd(minorUnitDecimals, "0");
  const roundingDigit = fractionPartRaw.charAt(minorUnitDecimals);

  let minorUnits = BigInt(wholePart + keptFraction);
  if (roundingDigit !== "" && Number(roundingDigit) >= 5) {
    minorUnits += 1n;
  }
  return sign === "-" ? -minorUnits : minorUnits;
}

/** Multiplies two arbitrary-precision decimal strings without floating point, returning a decimal string. */
export function multiplyDecimalStrings(a: string, b: string): string {
  const [aWhole = "0", aFraction = ""] = a.split(".");
  const [bWhole = "0", bFraction = ""] = b.split(".");
  const aInt = BigInt(`${aWhole}${aFraction}`);
  const bInt = BigInt(`${bWhole}${bFraction}`);
  const scale = aFraction.length + bFraction.length;
  const productInt = aInt * bInt;
  const productStr = productInt.toString().padStart(scale + 1, "0");
  const splitAt = productStr.length - scale;
  const whole = productStr.slice(0, splitAt) || "0";
  const fraction = productStr.slice(splitAt);
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

/** Allocates `totalMinorUnits` proportionally to `part` out of `whole` (bigint-safe, truncating). */
export function allocateProportionally(
  totalMinorUnits: bigint,
  part: bigint,
  whole: bigint,
): bigint {
  if (whole === 0n) {
    return 0n;
  }
  return (totalMinorUnits * part) / whole;
}

export function absBigint(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function maxBigint(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
