import type { FulfillmentOrderInput } from "@advertek/fulfillment";
import { describe, expect, it } from "vitest";
import {
  createPostgresOrderStore,
  OrderNotFoundError,
  readFulfillmentInput,
  readOrderStatus,
} from "./orders.js";
import { createFakeExecutor, fulfillmentInputFixture, lastQuery } from "./test-utils.js";

describe("createPostgresOrderStore.updateOrderStatus", () => {
  it("upserts the order as paid and records a status event in one transaction", async () => {
    const executor = createFakeExecutor();
    const store = createPostgresOrderStore(executor);

    await store.updateOrderStatus(
      {
        orderId: "ord_1",
        signature: "sig_1",
        amountBaseUnits: 730_000n,
        slot: 123,
      },
      "paid",
    );

    expect(executor.queries).toHaveLength(2);
    const [upsert, event] = executor.queries;
    expect(upsert?.text).toContain("INSERT INTO orders");
    expect(upsert?.text).toContain("ON CONFLICT (id) DO UPDATE");
    expect(upsert?.params).toEqual(["ord_1", "paid", "sig_1", "730000", 123]);
    expect(event?.text).toContain("INSERT INTO order_status_events");
    expect(event?.params).toEqual(["ord_1", "paid"]);
  });

  it("serializes the payment amount as a base-10 string, never a float", async () => {
    const executor = createFakeExecutor();
    const store = createPostgresOrderStore(executor);

    await store.updateOrderStatus(
      { orderId: "ord_2", signature: "sig_2", amountBaseUnits: 9_007_199_254_740_993n, slot: 1 },
      "paid",
    );

    expect(executor.queries[0]?.params[3]).toBe("9007199254740993");
  });
});

describe("createPostgresOrderStore.saveFulfillmentInput", () => {
  it("validates and stores the encoded fulfillment payload keyed by internal order id", async () => {
    const executor = createFakeExecutor();
    const store = createPostgresOrderStore(executor);

    await store.saveFulfillmentInput(fulfillmentInputFixture());

    const query = lastQuery(executor);
    expect(query.text).toContain("INSERT INTO orders");
    expect(query.params[0]).toBe("ord_1");
    expect(typeof query.params[1]).toBe("string");
    expect(query.params[1]).toContain('"$type":"bigint"');
  });

  it("rejects an invalid payload before any SQL runs", async () => {
    const executor = createFakeExecutor();
    const store = createPostgresOrderStore(executor);

    await expect(
      store.saveFulfillmentInput({
        internalOrderId: "ord_x",
      } as unknown as FulfillmentOrderInput),
    ).rejects.toThrow();
    expect(executor.queries).toHaveLength(0);
  });
});

describe("createPostgresOrderStore.recordStatusEvent", () => {
  it("updates the order status and appends the event", async () => {
    const executor = createFakeExecutor(() => [{ id: "ord_1" }]);
    const store = createPostgresOrderStore(executor);
    const occurredAt = new Date("2026-08-03T09:30:00.000Z");

    await store.recordStatusEvent("ord_1", "printing", occurredAt);

    expect(executor.queries[0]?.params).toEqual(["ord_1", "printing"]);
    expect(executor.queries[1]?.params).toEqual(["ord_1", "printing", occurredAt]);
  });

  it("throws OrderNotFoundError for an unknown order", async () => {
    const executor = createFakeExecutor(() => []);
    const store = createPostgresOrderStore(executor);

    await expect(
      store.recordStatusEvent("ord_missing", "printing", new Date()),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});

describe("createPostgresOrderStore.setVendorOrderId", () => {
  it("stamps the vendor order id", async () => {
    const executor = createFakeExecutor(() => [{ id: "ord_1" }]);
    const store = createPostgresOrderStore(executor);

    await store.setVendorOrderId("ord_1", "adv_123");
    expect(lastQuery(executor).params).toEqual(["ord_1", "adv_123"]);
  });

  it("throws OrderNotFoundError for an unknown order", async () => {
    const executor = createFakeExecutor(() => []);
    const store = createPostgresOrderStore(executor);

    await expect(store.setVendorOrderId("ord_missing", "adv_1")).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });
});

describe("readOrderStatus", () => {
  it("returns the order row with its status timeline", async () => {
    const executor = createFakeExecutor((text) =>
      text.includes("order_status_events")
        ? [
            {
              status: "pending-payment",
              occurred_at: new Date("2026-08-01T12:00:00.000Z"),
              recorded_at: new Date("2026-08-01T12:00:01.000Z"),
            },
            {
              status: "paid",
              occurred_at: "2026-08-01T12:05:00.000Z",
              recorded_at: "2026-08-01T12:05:01.000Z",
            },
          ]
        : [
            {
              id: "ord_1",
              status: "paid",
              payment_signature: "sig_1",
              payment_amount_base_units: "730000",
              payment_slot: "123",
              vendor_order_id: "adv_1",
              created_at: new Date("2026-08-01T12:00:00.000Z"),
              updated_at: new Date("2026-08-01T12:05:00.000Z"),
            },
          ],
    );

    const view = await readOrderStatus(executor, "ord_1");

    expect(view?.orderId).toBe("ord_1");
    expect(view?.status).toBe("paid");
    expect(view?.paymentAmountBaseUnits).toBe(730_000n);
    expect(view?.paymentSlot).toBe(123);
    expect(view?.events.map((event) => event.status)).toEqual([
      "pending-payment",
      "paid",
    ]);
    expect(view?.events[1]?.occurredAt).toEqual(new Date("2026-08-01T12:05:00.000Z"));
    expect(executor.queries[0]?.params).toEqual(["ord_1"]);
    expect(lastQuery(executor).text).toContain("FROM order_status_events");
  });

  it("returns undefined for an unknown order without reading events", async () => {
    const executor = createFakeExecutor(() => []);

    await expect(readOrderStatus(executor, "ord_missing")).resolves.toBeUndefined();
    expect(executor.queries).toHaveLength(1);
  });
});

describe("readFulfillmentInput", () => {
  it("decodes a stored payload back into a FulfillmentOrderInput", async () => {
    const { encodePersistedJson } = await import("./json-codec.js");
    const fixture = fulfillmentInputFixture();
    const executor = createFakeExecutor(() => [
      { fulfillment_input: encodePersistedJson(fixture) },
    ]);

    await expect(readFulfillmentInput(executor, "ord_1")).resolves.toEqual(fixture);
  });

  it("returns undefined when no payload is stored", async () => {
    const executor = createFakeExecutor(() => [{ fulfillment_input: null }]);
    await expect(readFulfillmentInput(executor, "ord_1")).resolves.toBeUndefined();
  });

  it("returns undefined for an unknown order", async () => {
    const executor = createFakeExecutor(() => []);
    await expect(readFulfillmentInput(executor, "ord_missing")).resolves.toBeUndefined();
  });
});
