import {
  createPostgresOrderDetailsLookup,
  createPostgresOrderStore,
  createProcessedDeliveriesStore,
} from "@advertek/db";
import {
  createAdvertekFulfillmentClient,
  createFulfillmentOrderStatusUpdater,
  loadFulfillmentConfig,
} from "@advertek/fulfillment";
import {
  handleQuickNodeWebhook,
  loadQuickNodeWebhookConfig,
  WebhookPayloadValidationError,
  WebhookSignatureVerificationError,
} from "@advertek/payments";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/json";
import { readRawBody } from "@/lib/raw-body";

export const runtime = "nodejs";

/**
 * QuickNode Streams payment-confirmation receiver. Webhook-first by design:
 * serverless functions cannot hold `waitForUsdcPaymentConfirmation`'s polling
 * loop open, so confirmed USDC transfers arrive here.
 *
 * Pipeline per confirmed transfer: HMAC verification (inside
 * `handleQuickNodeWebhook`) -> idempotency check (tx signature) -> persist
 * "paid" -> submit the order to Advertek (fulfillment updater) -> stamp the
 * vendor order id. Replays short-circuit before any side effect.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const rawBody = await readRawBody(request);
    const { securityToken } = loadQuickNodeWebhookConfig();

    const executor = getDb();
    const deliveries = createProcessedDeliveriesStore(executor);
    const orderStore = createPostgresOrderStore(executor);
    const fulfillmentUpdater = createFulfillmentOrderStatusUpdater({
      orderDetailsLookup: createPostgresOrderDetailsLookup(executor),
      fulfillmentClient: createAdvertekFulfillmentClient(loadFulfillmentConfig()),
      onOrderSubmitted: (result) =>
        orderStore.setVendorOrderId(result.internalOrderId, result.vendorOrderId),
    });

    const result = await handleQuickNodeWebhook(
      {
        securityToken,
        updateOrderStatus: async (payment, status) => {
          const isNewDelivery = await deliveries.markProcessed(
            "quicknode",
            payment.signature,
          );
          if (!isNewDelivery) {
            return;
          }
          await orderStore.updateOrderStatus(payment, status);
          await fulfillmentUpdater.updateOrderStatus(payment, status);
        },
      },
      {
        headers: {
          "x-qn-nonce": request.headers.get("x-qn-nonce") ?? undefined,
          "x-qn-timestamp": request.headers.get("x-qn-timestamp") ?? undefined,
          "x-qn-signature": request.headers.get("x-qn-signature") ?? undefined,
        },
        rawBody,
      },
    );

    return jsonResponse({ ok: true, processedOrderIds: result.processedOrderIds });
  } catch (error) {
    if (error instanceof WebhookSignatureVerificationError) {
      return jsonResponse({ ok: false, error: error.message }, { status: 401 });
    }
    if (error instanceof WebhookPayloadValidationError) {
      return jsonResponse({ ok: false, error: error.message }, { status: 400 });
    }
    return jsonResponse(
      { ok: false, error: "Internal error processing webhook" },
      { status: 500 },
    );
  }
}
