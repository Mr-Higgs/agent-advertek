/**
 * Converts an integer USD-cents amount (bigint, per project convention —
 * never floats) to the decimal-string format Advertek's API expects for
 * `customs_value` (e.g. `1999n` -> `"19.99"`).
 */
export function formatUsdCentsAsDecimalString(amountCents: bigint): string {
  if (amountCents < 0n) {
    throw new RangeError("USD cents amount cannot be negative");
  }

  const whole = amountCents / 100n;
  const fraction = amountCents % 100n;
  return `${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}
