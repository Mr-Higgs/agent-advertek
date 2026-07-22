/**
 * Spot FX lookup for converting CAD prices to USDC.
 * Implementations should fetch a live rate; do not hardcode rates in
 * quote business logic.
 *
 * @blocker STEP_11 — Stub only. Requires a real CAD→USDC spot-rate
 * integration before Step 11. Do not ship production quotes on mocks.
 */
export interface SpotRateClient {
  /**
   * Returns how many USDC base units (1 USDC = 1_000_000 base units)
   * equal one CAD dollar (100 cents) at the current spot rate.
   */
  getUsdcBaseUnitsPerCadDollar(): Promise<bigint>;
}

export function convertCadCentsToUsdcBaseUnits(
  cadCents: bigint,
  usdcBaseUnitsPerCadDollar: bigint,
): bigint {
  if (cadCents < 0n) {
    throw new RangeError("CAD amount must be non-negative");
  }
  if (usdcBaseUnitsPerCadDollar <= 0n) {
    throw new RangeError("Spot rate must be a positive integer");
  }

  return (cadCents * usdcBaseUnitsPerCadDollar) / 100n;
}
