import type { PrintProcess, SkuSpec } from "@advertek/types";

/**
 * Connection to Advertek's internal pricing system.
 * Implementations should call the real pricing service; do not embed
 * catalog prices in business logic.
 *
 * @blocker STEP_11 — Stub only. Requires a real Advertek pricing-system
 * integration before Step 11. Do not ship production quotes on mocks.
 */
export interface AdvertekPricingClient {
  /**
   * Returns the quoted price in CAD cents (integer minor units).
   */
  quoteCadCents(input: {
    readonly spec: SkuSpec;
    readonly printProcess: PrintProcess;
  }): Promise<bigint>;
}
