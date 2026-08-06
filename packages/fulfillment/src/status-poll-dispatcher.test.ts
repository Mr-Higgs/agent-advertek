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

    expect(result).toEqual({
      vendorStatus: "shipped",
      orderStatus: "shipped",
      polledAt,
    });
    expect(dispatch).toHaveBeenCalledWith(subscription, {
      orderId: "order-1",
      status: "shipped",
      occurredAt: polledAt,
    });
  });

  it("dispatches the granular downloaded/printing/printed stages rather than a generic in-production bucket", async () => {
    for (const vendorStatus of ["downloaded", "printing", "printed"] as const) {
      const client = {
        getOrderStatus: () => Promise.resolve({ id: "adv-order-1", status: vendorStatus }),
      };
      const dispatch = vi.fn((): Promise<void> => Promise.resolve());

      const result = await pollAndDispatchOrderStatus(
        { client, webhookDispatcher: { dispatch }, subscription },
        { internalOrderId: "order-1", vendorOrderId: "adv-order-1" },
      );

      expect(result.orderStatus).toBe(vendorStatus);
      expect(dispatch).toHaveBeenCalledWith(
        subscription,
        expect.objectContaining({ status: vendorStatus }),
      );
    }
  });

  it("dispatches held and failed as their own explicit statuses, not cancelled", async () => {
    for (const vendorStatus of ["held", "failed"] as const) {
      const client = {
        getOrderStatus: () => Promise.resolve({ id: "adv-order-1", status: vendorStatus }),
      };
      const dispatch = vi.fn((): Promise<void> => Promise.resolve());

      const result = await pollAndDispatchOrderStatus(
        { client, webhookDispatcher: { dispatch }, subscription },
        { internalOrderId: "order-1", vendorOrderId: "adv-order-1" },
      );

      expect(result.orderStatus).toBe(vendorStatus);
      expect(dispatch).toHaveBeenCalledWith(
        subscription,
        expect.objectContaining({ status: vendorStatus }),
      );
    }
  });

  it("dispatches completed for the vendor's delivered status", async () => {
    const client = {
      getOrderStatus: () => Promise.resolve({ id: "adv-order-1", status: "delivered" as const }),
    };
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());

    const result = await pollAndDispatchOrderStatus(
      { client, webhookDispatcher: { dispatch }, subscription },
      { internalOrderId: "order-1", vendorOrderId: "adv-order-1" },
    );

    expect(result.orderStatus).toBe("completed");
    expect(dispatch).toHaveBeenCalledWith(
      subscription,
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("dispatches cancelled for the vendor's cancelled status", async () => {
    const client = {
      getOrderStatus: () => Promise.resolve({ id: "adv-order-1", status: "cancelled" as const }),
    };
    const dispatch = vi.fn((): Promise<void> => Promise.resolve());

    const result = await pollAndDispatchOrderStatus(
      { client, webhookDispatcher: { dispatch }, subscription },
      { internalOrderId: "order-1", vendorOrderId: "adv-order-1" },
    );

    expect(result.orderStatus).toBe("cancelled");
    expect(dispatch).toHaveBeenCalledWith(
      subscription,
      expect.objectContaining({ status: "cancelled" }),
    );
  });
});
