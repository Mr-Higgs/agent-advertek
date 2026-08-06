import {
  createPostgresOrderStore,
  createPostgresWebhookSubscriptionLookup,
  createProcessedDeliveriesStore,
} from "@advertek/db";
import {
  AdvertekWebhookAuthError,
  AdvertekWebhookPayloadValidationError,
  dispatchAdvertekWebhookEvent,
  handleAdvertekWebhook,
  loadAdvertekWebhookConfig,
} from "@advertek/fulfillment";
import { createHttpWebhookDispatcher } from "@advertek/webhooks";
import { after } from "next/server";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/json";
import { readRawBody } from "@/lib/raw-body";
import { resolveSecretFromEnv } from "@/lib/secrets";

export const runtime = "nodejs";

/**
 * Advertek inbound order-status webhook. Auth + payload validation are
 * synchronous (inside `handleAdvertekWebhook`) so the 10-second/5-retry
 * delivery contract is met; the slow downstream work (persist the bridged
 * agent-facing status, dispatch to the agent's subscription) fires
 * fire-and-forget from there — scheduled through Next.js `after()` so the
 * serverless function stays alive until it finishes. Delivery idempotency
 * key: vendor order id + vendor status — Advertek's retries of one
 * transition collapse to a single status write + dispatch.
 */
export async function POST(request: Request): Promise<Response> {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto !== null && forwardedProto.toLowerCase() !== "https") {
    return jsonResponse(
      { ok: false, error: "Advertek webhook endpoint must be served over HTTPS" },
      { status: 400 },
    );
  }

  try {
    const rawBody = await readRawBody(request);
    const credentials = loadAdvertekWebhookConfig();

    const executor = getDb();
    const deliveries = createProcessedDeliveriesStore(executor);
    const orderStore = createPostgresOrderStore(executor);
    const webhookDispatcher = createHttpWebhookDispatcher({
      fetchImpl: fetch,
      resolveSecret: resolveSecretFromEnv,
    });

    const event = handleAdvertekWebhook(
      {
        credentials,
        dispatch: (webhookEvent) => {
          after(async () => {
            const deliveryId = `${webhookEvent.vendorOrderId}:${webhookEvent.vendorStatus}`;
            const isNewDelivery = await deliveries.markProcessed("advertek", deliveryId);
            if (!isNewDelivery) {
              return;
            }
            await orderStore.recordStatusEvent(
              webhookEvent.internalOrderId,
              webhookEvent.orderStatus,
              webhookEvent.receivedAt,
            );
            await dispatchAdvertekWebhookEvent(
              {
                subscriptionLookup: createPostgresWebhookSubscriptionLookup(executor),
                webhookDispatcher,
              },
              webhookEvent,
            );
          });
          return Promise.resolve();
        },
        onDispatchError: (error, webhookEvent) => {
          console.error("Advertek webhook dispatch failed", {
            error,
            vendorOrderId: webhookEvent.vendorOrderId,
            internalOrderId: webhookEvent.internalOrderId,
          });
        },
      },
      {
        authorizationHeader: request.headers.get("authorization") ?? undefined,
        rawBody,
      },
    );

    return jsonResponse({
      ok: true,
      vendorOrderId: event.vendorOrderId,
      internalOrderId: event.internalOrderId,
    });
  } catch (error) {
    if (error instanceof AdvertekWebhookAuthError) {
      return jsonResponse({ ok: false, error: error.message }, { status: 401 });
    }
    if (error instanceof AdvertekWebhookPayloadValidationError) {
      return jsonResponse({ ok: false, error: error.message }, { status: 400 });
    }
    return jsonResponse(
      { ok: false, error: "Internal error processing webhook" },
      { status: 500 },
    );
  }
}
