import { describe, expect, it } from "vitest";
import { encodePersistedJson } from "./json-codec.js";
import { createPostgresOrderDetailsLookup } from "./order-details.js";
import { OrderNotFoundError } from "./orders.js";
import { createFakeExecutor, fulfillmentInputFixture } from "./test-utils.js";

describe("createPostgresOrderDetailsLookup", () => {
  it("returns the stored fulfillment payload for the order", async () => {
    const fixture = fulfillmentInputFixture();
    const executor = createFakeExecutor(() => [
      { fulfillment_input: encodePersistedJson(fixture) },
    ]);
    const lookup = createPostgresOrderDetailsLookup(executor);

    await expect(lookup.getOrderDetailsForFulfillment("ord_1")).resolves.toEqual(fixture);
  });

  it("throws OrderNotFoundError when nothing is stored for the order", async () => {
    const executor = createFakeExecutor(() => []);
    const lookup = createPostgresOrderDetailsLookup(executor);

    await expect(lookup.getOrderDetailsForFulfillment("ord_missing")).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });
});
