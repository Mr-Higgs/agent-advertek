import type { PrintProcess, SkuSpec } from "@advertek/types";

/**
 * Connection to Advertek's internal pricing system. The production
 * implementation is `createHttpAdvertekPricingClient` (`http-clients.ts`);
 * do not embed catalog prices in business logic.
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
