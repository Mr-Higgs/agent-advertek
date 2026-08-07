/**
 * Spot FX lookup for converting CAD prices to USDC. The production
 * implementation is `createHttpSpotRateClient` (`http-clients.ts`); never
 * hardcode rates in quote business logic.
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
