import type { OrderStatus } from "@advertek/types";
import type { AdvertekOrderStatus } from "./advertek-api-types.js";

/**
 * Maps Advertek's raw fulfillment status — used by both the
 * `GET /api/v1/orders/{id}` poll response and inbound webhook deliveries
 * (see `advertek-webhook.ts`) — onto our own agent-facing `OrderStatus`.
 *
 * This is a total mapping. Advertek's real status vocabulary
 * (`downloaded` / `printing` / `printed` / `shipped` / `delivered` /
 * `held` / `cancelled` / `failed`) gives genuine intermediate production
 * coverage, unlike the `accepted` / `shipped` / `cancelled` /
 * `cancelled_after_printing` set that was assumed before Advertek's real
 * webhook contract was available. Two deliberate design decisions follow
 * from that:
 *
 *   1. `downloaded` / `printing` / `printed` are surfaced as their own
 *      distinct `OrderStatus` values rather than collapsed into a single
 *      `in-production` bucket — Advertek actually distinguishes these, so
 *      agents get real visibility into which sub-stage an order is in
 *      instead of an opaque "somewhere in production".
 *   2. `held` and `failed` get their own explicit agent-facing statuses
 *      rather than being silently dropped or folded into `cancelled` — a
 *      held or failed order is a materially different outcome from a
 *      deliberate cancellation, and agents need to be able to tell them
 *      apart (e.g. to decide whether to escalate vs. simply re-order).
 *
 * `delivered` maps to our existing `completed` terminal status (same
 * concept: the order reached the customer), so no new `OrderStatus` value
 * was needed for it.
 */
export function bridgeAdvertekStatusToOrderStatus(
  status: AdvertekOrderStatus,
): OrderStatus {
  switch (status) {
    case "downloaded":
      return "downloaded";
    case "printing":
      return "printing";
    case "printed":
      return "printed";
    case "shipped":
      return "shipped";
    case "delivered":
      return "completed";
    case "held":
      return "held";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    default: {
      const exhaustiveCheck: never = status;
      throw new Error(`Unhandled Advertek order status: ${String(exhaustiveCheck)}`);
    }
  }
}
