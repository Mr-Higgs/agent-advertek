import type { WebhookDispatcher, WebhookSubscription } from "@advertek/webhooks";
import { describe, expect, it, vi } from "vitest";
import type { AdvertekWebhookEvent } from "./advertek-webhook.js";
import { dispatchAdvertekWebhookEvent } from "./webhook-dispatch.js";

const subscription: WebhookSubscription = {
  id: "sub-1",
  targetUrl: new URL("https://agent.example.com/webhooks/advertek"),
  signingSecretReference: "secret-ref-1",
};

const event: AdvertekWebhookEvent = {
  vendorOrderId: "adv-order-1",
  internalOrderId: "order-123",
  vendorStatus: "shipped",
  orderStatus: "shipped",
  packages: [],
  receivedAt: new Date("2026-08-06T18:00:00.000Z"),
};

describe("dispatchAdvertekWebhookEvent", () => {
  it("looks up the subscription for the event's order and dispatches the mapped OrderStatusEvent", async () => {
    const getSubscriptionForOrder = vi.fn(() => Promise.resolve(subscription));
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());
    const webhookDispatcher: WebhookDispatcher = { dispatch };

    await dispatchAdvertekWebhookEvent(
      { subscriptionLookup: { getSubscriptionForOrder }, webhookDispatcher },
      event,
    );

    expect(getSubscriptionForOrder).toHaveBeenCalledWith("order-123");
    expect(dispatch).toHaveBeenCalledWith(subscription, {
      orderId: "order-123",
      status: "shipped",
      occurredAt: event.receivedAt,
    });
  });
});
