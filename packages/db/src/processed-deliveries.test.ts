import { describe, expect, it } from "vitest";
import { createProcessedDeliveriesStore } from "./processed-deliveries.js";
import { createFakeExecutor, lastQuery } from "./test-utils.js";

describe("createProcessedDeliveriesStore", () => {
  it("returns true when the delivery is newly recorded", async () => {
    const executor = createFakeExecutor(() => [{ delivery_id: "sig_1" }]);
    const store = createProcessedDeliveriesStore(executor);

    await expect(store.markProcessed("quicknode", "sig_1")).resolves.toBe(true);

    const query = lastQuery(executor);
    expect(query.text).toContain("ON CONFLICT (source, delivery_id) DO NOTHING");
    expect(query.params).toEqual(["quicknode", "sig_1"]);
  });

  it("returns false on a replay (conflict, nothing inserted)", async () => {
    const executor = createFakeExecutor(() => []);
    const store = createProcessedDeliveriesStore(executor);

    await expect(store.markProcessed("advertek", "evt_9")).resolves.toBe(false);
  });

  it("checks prior processing by source and delivery id", async () => {
    const executor = createFakeExecutor(() => [{ delivery_id: "sig_1" }]);
    const store = createProcessedDeliveriesStore(executor);

    await expect(store.isProcessed("quicknode", "sig_1")).resolves.toBe(true);
    expect(lastQuery(executor).params).toEqual(["quicknode", "sig_1"]);
  });
});
