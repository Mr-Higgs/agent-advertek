import type { WebhookDispatcher, WebhookSubscription } from "@advertek/webhooks";
import type { AdvertekWebhookEvent } from "./advertek-webhook.js";

/**
 * @blocker — Subscription persistence doesn't exist yet in this codebase
 * (same shape of gap as `@advertek/payments`' `OrderStatusUpdater` and
 * `@advertek/fulfillment`'s `OrderDetailsLookup`). Looking up which agent
 * webhook subscription an internal order belongs to needs a real backing
 * store; inject a mock in tests until then.
 */
export interface WebhookSubscriptionLookup {
  getSubscriptionForOrder(internalOrderId: string): Promise<WebhookSubscription>;
}

export interface DispatchAdvertekWebhookEventDeps {
  readonly subscriptionLookup: WebhookSubscriptionLookup;
  readonly webhookDispatcher: WebhookDispatcher;
}

/**
 * The "slow" downstream work referenced by `handleAdvertekWebhook`'s
 * `dispatch` dep: looks up which agent webhook subscription the event's
 * order belongs to, then dispatches an `OrderStatusEvent` through
 * `@advertek/webhooks` so the agent that placed the order hears about the
 * status change.
 */
export async function dispatchAdvertekWebhookEvent(
  deps: DispatchAdvertekWebhookEventDeps,
  event: AdvertekWebhookEvent,
): Promise<void> {
  const subscription = await deps.subscriptionLookup.getSubscriptionForOrder(
    event.internalOrderId,
  );

  await deps.webhookDispatcher.dispatch(subscription, {
    orderId: event.internalOrderId,
    status: event.orderStatus,
    occurredAt: event.receivedAt,
  });
}
