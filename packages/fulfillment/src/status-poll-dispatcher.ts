import type { WebhookDispatcher, WebhookSubscription } from "@advertek/webhooks";
import type { AdvertekOrderStatus } from "./advertek-api-types.js";
import type { AdvertekFulfillmentClient } from "./advertek-client.js";
import { pollAdvertekOrderStatus } from "./poll-order-status.js";
import { bridgeAdvertekStatusToOrderStatus } from "./status-bridge.js";

export interface PollAndDispatchOrderStatusDeps {
  readonly client: Pick<AdvertekFulfillmentClient, "getOrderStatus">;
  readonly webhookDispatcher: WebhookDispatcher;
  readonly subscription: WebhookSubscription;
  readonly now?: () => Date;
}

export interface PollAndDispatchOrderStatusInput {
  readonly internalOrderId: string;
  readonly vendorOrderId: string;
}

export interface PollAndDispatchOrderStatusResult {
  readonly vendorStatus: AdvertekOrderStatus;
  readonly polledAt: Date;
  /** True only when the raw vendor status mapped to one of our OrderStatus values and was dispatched. */
  readonly dispatched: boolean;
}

/**
 * Polls Advertek for an order's current status and, only when the raw
 * vendor status maps to one of our own `OrderStatus` values (see
 * `status-bridge.ts`), dispatches an `OrderStatusEvent` through the
 * `@advertek/webhooks` dispatcher for agent-facing updates. Ambiguous
 * middle states (currently just `accepted`) are polled but intentionally
 * not dispatched — see the TODO in `status-bridge.ts`.
 */
export async function pollAndDispatchOrderStatus(
  deps: PollAndDispatchOrderStatusDeps,
  input: PollAndDispatchOrderStatusInput,
): Promise<PollAndDispatchOrderStatusResult> {
  const polled = await pollAdvertekOrderStatus(
    { client: deps.client, ...(deps.now ? { now: deps.now } : {}) },
    input.vendorOrderId,
  );

  const mappedStatus = bridgeAdvertekStatusToOrderStatus(polled.status);
  if (mappedStatus === undefined) {
    return { vendorStatus: polled.status, polledAt: polled.polledAt, dispatched: false };
  }

  await deps.webhookDispatcher.dispatch(deps.subscription, {
    orderId: input.internalOrderId,
    status: mappedStatus,
    occurredAt: polled.polledAt,
  });

  return { vendorStatus: polled.status, polledAt: polled.polledAt, dispatched: true };
}
