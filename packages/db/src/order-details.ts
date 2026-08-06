import type { FulfillmentOrderInput, OrderDetailsLookup } from "@advertek/fulfillment";
import type { SqlExecutor } from "./executor.js";
import { OrderNotFoundError, readFulfillmentInput } from "./orders.js";

/**
 * Postgres-backed implementation of `@advertek/fulfillment`'s
 * `OrderDetailsLookup` seam: given an internal order id, returns the full
 * fulfillment payload (SKU specs, addresses, customs values) stored at order
 * intake.
 */
export function createPostgresOrderDetailsLookup(
  executor: SqlExecutor,
): OrderDetailsLookup {
  return {
    async getOrderDetailsForFulfillment(orderId: string): Promise<FulfillmentOrderInput> {
      const input = await readFulfillmentInput(executor, orderId);
      if (!input) {
        throw new OrderNotFoundError(
          `No fulfillment details stored for order: ${orderId}`,
        );
      }
      return input;
    },
  };
}
