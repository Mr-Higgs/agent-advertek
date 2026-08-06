import type { OrderStatus } from "@advertek/types";
import type { AdvertekOrderStatus } from "./advertek-api-types.js";

/**
 * TODO(advertek-status-gap): Advertek's fulfillment API only exposes
 * `accepted` / `shipped` / `cancelled` / `cancelled_after_printing` — there
 * is no `in_production` or `quality_check` status. That means this can only
 * reliably bridge the *ends* of our four-stage `OrderStatus` lifecycle
 * (`pending-payment` -> `paid` -> `in-production` -> `shipped` ->
 * `completed` -> `cancelled`); `accepted` is genuinely ambiguous — it could
 * mean anything from "we just received it" to "about to ship" — and we have
 * no vendor signal for when production actually starts or finishes short of
 * shipping.
 *
 * Two follow-ups needed before this gap can close for real:
 *   1. Ask Advertek whether they can add a webhook or an additional status
 *      for production-start (and ideally quality-check), so we can emit
 *      `in-production` the moment we actually know it's true instead of
 *      guessing.
 *   2. Failing that, a polling heuristic: e.g. treat `accepted` as
 *      `in-production` once N hours have elapsed since order creation.
 *      This needs a real SLA/turnaround number from Advertek to pick a
 *      defensible N, and isn't implemented here.
 *
 * Until one of those lands, `bridgeAdvertekStatusToOrderStatus` deliberately
 * returns `undefined` for `accepted` rather than emitting a stage-advancing
 * SLA webhook off of an unreliable guess. Callers (see
 * `status-poll-dispatcher.ts`) must treat `undefined` as "nothing new to
 * report to the agent yet" and keep polling.
 */
export function bridgeAdvertekStatusToOrderStatus(
  status: AdvertekOrderStatus,
): OrderStatus | undefined {
  switch (status) {
    case "accepted":
      return undefined;
    case "shipped":
      return "shipped";
    case "cancelled":
    case "cancelled_after_printing":
      return "cancelled";
    default: {
      const exhaustiveCheck: never = status;
      throw new Error(`Unhandled Advertek order status: ${String(exhaustiveCheck)}`);
    }
  }
}
