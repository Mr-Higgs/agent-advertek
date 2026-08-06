import type { OrderStatus } from "@advertek/types";
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
  readonly orderStatus: OrderStatus;
  readonly polledAt: Date;
}

/**
 * Polls Advertek for an order's current status and dispatches an
 * `OrderStatusEvent` through the `@advertek/webhooks` dispatcher for
 * agent-facing updates. `bridgeAdvertekStatusToOrderStatus` is a total
 * mapping (see `status-bridge.ts`), so every raw vendor status — including
 * `held` and `failed` — always produces a dispatchable `OrderStatus`.
 */
export async function pollAndDispatchOrderStatus(
  deps: PollAndDispatchOrderStatusDeps,
  input: PollAndDispatchOrderStatusInput,
): Promise<PollAndDispatchOrderStatusResult> {
  const polled = await pollAdvertekOrderStatus(
    { client: deps.client, ...(deps.now ? { now: deps.now } : {}) },
    input.vendorOrderId,
  );

  const orderStatus = bridgeAdvertekStatusToOrderStatus(polled.status);

  await deps.webhookDispatcher.dispatch(deps.subscription, {
    orderId: input.internalOrderId,
    status: orderStatus,
    occurredAt: polled.polledAt,
  });

  return { vendorStatus: polled.status, orderStatus, polledAt: polled.polledAt };
}
