import { describe, expect, it, vi } from "vitest";
import type { WebhookDispatcher, WebhookSubscription } from "@advertek/webhooks";
import { pollAndDispatchOrderStatus } from "./status-poll-dispatcher.js";

const subscription: WebhookSubscription = {
  id: "sub-1",
  targetUrl: new URL("https://agent.example.com/webhooks/advertek"),
  signingSecretReference: "secret-ref-1",
};

describe("pollAndDispatchOrderStatus", () => {
  it("dispatches a mapped OrderStatusEvent when the vendor status is shipped", async () => {
    const polledAt = new Date("2026-08-06T16:00:00.000Z");
    const client = {
      getOrderStatus: () =>
        Promise.resolve({ id: "adv-order-1", status: "shipped" as const }),
    };
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());
    const webhookDispatcher: WebhookDispatcher = { dispatch };

    const result = await pollAndDispatchOrderStatus(
      { client, webhookDispatcher, subscription, now: () => polledAt },
      { internalOrderId: "order-1", vendorOrderId: "adv-order-1" },
    );

    expect(result).toEqual({ vendorStatus: "shipped", polledAt, dispatched: true });
    expect(dispatch).toHaveBeenCalledWith(subscription, {
      orderId: "order-1",
      status: "shipped",
      occurredAt: polledAt,
    });
  });

  it("does not dispatch for the ambiguous 'accepted' status", async () => {
    const client = {
      getOrderStatus: () =>
        Promise.resolve({ id: "adv-order-1", status: "accepted" as const }),
    };
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());

    const result = await pollAndDispatchOrderStatus(
      { client, webhookDispatcher: { dispatch }, subscription },
      { internalOrderId: "order-1", vendorOrderId: "adv-order-1" },
    );

    expect(result.dispatched).toBe(false);
    expect(result.vendorStatus).toBe("accepted");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches cancelled for both cancelled and cancelled_after_printing", async () => {
    for (const vendorStatus of ["cancelled", "cancelled_after_printing"] as const) {
      const client = {
        getOrderStatus: () => Promise.resolve({ id: "adv-order-1", status: vendorStatus }),
      };
      const dispatch = vi.fn((): Promise<void> => Promise.resolve());

      const result = await pollAndDispatchOrderStatus(
        { client, webhookDispatcher: { dispatch }, subscription },
        { internalOrderId: "order-1", vendorOrderId: "adv-order-1" },
      );

      expect(result.dispatched).toBe(true);
      expect(dispatch).toHaveBeenCalledWith(
        subscription,
        expect.objectContaining({ status: "cancelled" }),
      );
    }
  });
});
