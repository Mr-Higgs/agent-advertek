import { describe, expect, it } from "vitest";
import { pollAdvertekOrderStatus } from "./poll-order-status.js";

describe("pollAdvertekOrderStatus", () => {
  it("returns the raw vendor status plus a poll timestamp", async () => {
    const polledAt = new Date("2026-08-06T15:00:00.000Z");
    const client = {
      getOrderStatus: (vendorOrderId: string) =>
        Promise.resolve({ id: vendorOrderId, status: "shipped" as const }),
    };

    const result = await pollAdvertekOrderStatus(
      { client, now: () => polledAt },
      "adv-order-1",
    );

    expect(result).toEqual({
      vendorOrderId: "adv-order-1",
      status: "shipped",
      polledAt,
    });
  });

  it("uses the current time by default", async () => {
    const client = {
      getOrderStatus: () => Promise.resolve({ id: "adv-order-1", status: "accepted" as const }),
    };

    const before = Date.now();
    const result = await pollAdvertekOrderStatus({ client }, "adv-order-1");
    const after = Date.now();

    expect(result.polledAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.polledAt.getTime()).toBeLessThanOrEqual(after);
  });
});
