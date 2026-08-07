/**
 * Integer-safe decimal-string parsing for vendor boundaries. Rates and
 * prices arrive from upstream APIs as decimal strings; they are converted
 * straight to `bigint` minor units here without ever passing through a
 * float, per the repo's money convention.
 */

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

export class DecimalParseError extends Error {
  override readonly name = "DecimalParseError";
}

/**
 * Converts a non-negative decimal string to integer minor units with
 * `decimals` places, truncating (never rounding up) any extra precision —
 * a rate of "0.7312349" at 6 decimals becomes 731_234n, so a converted
 * amount is never larger than the upstream rate justifies.
 */
export function decimalStringToMinorUnits(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new DecimalParseError(`Invalid decimals: ${String(decimals)}`);
  }
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) {
    throw new DecimalParseError(`Not a decimal number: ${value}`);
  }
  const [, sign, whole = "0", fraction = ""] = match;
  if (sign === "-") {
    throw new DecimalParseError(`Value must be non-negative: ${value}`);
  }
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(`${whole}${padded}`);
}
