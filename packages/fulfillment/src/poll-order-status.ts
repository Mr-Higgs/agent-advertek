import type { AdvertekOrderStatus } from "./advertek-api-types.js";
import type { AdvertekFulfillmentClient } from "./advertek-client.js";

export interface PolledOrderStatus {
  readonly vendorOrderId: string;
  /** Raw vendor status — see status-bridge.ts before mapping this to anything else. */
  readonly status: AdvertekOrderStatus;
  readonly polledAt: Date;
}

export interface PollOrderStatusDeps {
  readonly client: Pick<AdvertekFulfillmentClient, "getOrderStatus">;
  readonly now?: () => Date;
}

/**
 * Polls Advertek for an order's current status and stamps the poll time.
 * Deliberately returns the raw vendor status (`downloaded` / `printing` /
 * `printed` / `shipped` / `delivered` / `held` / `cancelled` / `failed`)
 * rather than inventing a mapping to our own `OrderStatus` — see
 * `status-bridge.ts`.
 */
export async function pollAdvertekOrderStatus(
  deps: PollOrderStatusDeps,
  vendorOrderId: string,
): Promise<PolledOrderStatus> {
  const detail = await deps.client.getOrderStatus(vendorOrderId);
  const now = deps.now ?? ((): Date => new Date());

  return {
    vendorOrderId: detail.id,
    status: detail.status,
    polledAt: now(),
  };
}
