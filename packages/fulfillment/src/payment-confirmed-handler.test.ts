import { describe, expect, it, vi } from "vitest";
import type { ConfirmedOrderPayment } from "@advertek/payments";
import type { SkuSpec } from "@advertek/types";
import {
  createFulfillmentOrderStatusUpdater,
  type OrderDetailsLookup,
} from "./payment-confirmed-handler.js";
import type { FulfillmentOrderInput } from "./request-builder.js";

const spec: SkuSpec = {
  productLine: "digital",
  dimensions: { width: 148, height: 210 },
  stock: { material: "uncoated", weight: 80 },
  finish: ["none"],
  quantity: 100,
  turnaround: "standard",
  assets: [{ url: "https://assets.example.com/order-1/file.pdf" }],
};

const orderInput: FulfillmentOrderInput = {
  internalOrderId: "order-1",
  customerOrderNumber: "order-1",
  orderedAt: new Date("2026-08-06T00:00:00.000Z"),
  locationCode: "TOR1",
  shippingService: "UPS_GROUND",
  soldTo: {
    name: "Advertek Agent Rail",
    address1: "123 Bay St",
    city: "Toronto",
    postal_code: "M5J 2T3",
    country_code: "CA",
  },
  shipTo: {
    name: "Jane Customer",
    address1: "456 Main St",
    city: "Buffalo",
    postal_code: "14201",
    country_code: "US",
  },
  orderType: "standard",
  items: [
    {
      internalItemId: "item-1",
      spec,
      customsValueUsdCents: 1500n,
      options: [],
    },
  ],
};

const payment: ConfirmedOrderPayment = {
  orderId: "order-1",
  signature: "sig-abc",
  amountBaseUnits: 1_000_000n,
  slot: 42,
};

describe("createFulfillmentOrderStatusUpdater", () => {
  it("submits the order to Advertek once payment is confirmed", async () => {
    const getOrderDetailsForFulfillment = vi.fn(
      (): Promise<FulfillmentOrderInput> => Promise.resolve(orderInput),
    );
    const orderDetailsLookup: OrderDetailsLookup = { getOrderDetailsForFulfillment };
    const createOrder = vi.fn(() => Promise.resolve({ id: "adv-order-1" }));
    const onOrderSubmitted = vi.fn();

    const updater = createFulfillmentOrderStatusUpdater({
      orderDetailsLookup,
      fulfillmentClient: { createOrder },
      onOrderSubmitted,
    });

    await updater.updateOrderStatus(payment, "paid");

    expect(getOrderDetailsForFulfillment).toHaveBeenCalledWith("order-1");
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_order_number: "order-1",
        metadata: { internal_order_id: "order-1" },
      }),
    );
    expect(onOrderSubmitted).toHaveBeenCalledWith({
      internalOrderId: "order-1",
      vendorOrderId: "adv-order-1",
      triggeredByStatus: "paid",
    });
  });

  it("propagates errors from the order-details lookup without calling Advertek", async () => {
    const getOrderDetailsForFulfillment = vi.fn(
      (): Promise<FulfillmentOrderInput> =>
        Promise.reject(new Error("order not found")),
    );
    const createOrder = vi.fn(() => Promise.resolve({ id: "adv-order-1" }));

    const updater = createFulfillmentOrderStatusUpdater({
      orderDetailsLookup: { getOrderDetailsForFulfillment },
      fulfillmentClient: { createOrder },
    });

    await expect(updater.updateOrderStatus(payment, "paid")).rejects.toThrow(
      "order not found",
    );
    expect(createOrder).not.toHaveBeenCalled();
  });
});
