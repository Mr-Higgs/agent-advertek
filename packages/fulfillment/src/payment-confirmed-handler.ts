import type {
  ConfirmedOrderPayment,
  OrderStatus as PaymentConfirmationStatus,
  OrderStatusUpdater,
} from "@advertek/payments";
import type { AdvertekFulfillmentClient } from "./advertek-client.js";
import { buildAdvertekCreateOrderRequest, type FulfillmentOrderInput } from "./request-builder.js";

/**
 * @blocker — Order persistence doesn't exist yet in this codebase (see
 * `@advertek/payments`' `OrderStatusUpdater` `@blocker STEP_9` note).
 * Submitting an order to Advertek needs the full order — SKU specs,
 * shipping address, declared customs value — keyed by our internal order
 * id, which nothing here currently stores. This interface is the seam a
 * real order-persistence backend fills in; inject a mock in tests until
 * then.
 */
export interface OrderDetailsLookup {
  getOrderDetailsForFulfillment(orderId: string): Promise<FulfillmentOrderInput>;
}

export interface FulfillmentOrderSubmissionResult {
  readonly internalOrderId: string;
  readonly vendorOrderId: string;
  readonly triggeredByStatus: PaymentConfirmationStatus;
}

export interface CreateFulfillmentOrderStatusUpdaterDeps {
  readonly orderDetailsLookup: OrderDetailsLookup;
  readonly fulfillmentClient: Pick<AdvertekFulfillmentClient, "createOrder">;
  /** Called after a successful submission — e.g. to persist the vendor order id for later status polling. */
  readonly onOrderSubmitted?: (
    result: FulfillmentOrderSubmissionResult,
  ) => void | Promise<void>;
}

/**
 * Implements `@advertek/payments`' `OrderStatusUpdater` seam: once a
 * QuickNode payment confirmation fires and `handleQuickNodeWebhook` calls
 * `updateOrderStatus(payment, "paid")`, this looks up the order's full
 * fulfillment details and submits it to Advertek.
 *
 * `@advertek/payments`' `OrderStatus` is currently the single-value union
 * `"paid"`, so there's no other status this can be called with today — the
 * type system, not a runtime branch, is what guarantees that. `status` is
 * still threaded through to `onOrderSubmitted` for observability (and so a
 * future widening of `OrderStatus` doesn't silently get ignored here).
 */
export function createFulfillmentOrderStatusUpdater(
  deps: CreateFulfillmentOrderStatusUpdaterDeps,
): OrderStatusUpdater {
  return {
    async updateOrderStatus(
      payment: ConfirmedOrderPayment,
      status: PaymentConfirmationStatus,
    ): Promise<void> {
      const orderInput = await deps.orderDetailsLookup.getOrderDetailsForFulfillment(
        payment.orderId,
      );
      const request = buildAdvertekCreateOrderRequest(orderInput);
      const response = await deps.fulfillmentClient.createOrder(request);

      if (deps.onOrderSubmitted) {
        await deps.onOrderSubmitted({
          internalOrderId: payment.orderId,
          vendorOrderId: response.id,
          triggeredByStatus: status,
        });
      }
    },
  };
}
