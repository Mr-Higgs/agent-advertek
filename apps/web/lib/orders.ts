import { randomUUID } from "node:crypto";
import {
  createPostgresOrderStore,
  createWebhookSubscription,
  type SqlExecutor,
} from "@advertek/db";
import { toFulfillmentOrderInput } from "@advertek/fulfillment";
import type {
  CreateOrderExecutor,
  CreateOrderRequest,
  CreatedOrder,
  QuoteExecutor,
} from "@advertek/mcp-server";
import {
  createUsdcPaymentRequest,
  type SettlementPublicConfig,
} from "@advertek/payments";

/**
 * Order intake: the single place an Advertek order becomes payable. Shared by
 * `POST /api/orders` and the `create_order` MCP tool so both mint ids, price,
 * and persist identically.
 *
 * Two invariants this enforces:
 *
 * - The order id and the price are server-issued. A client-supplied order id
 *   is never accepted (the wire schema has no field for one) and a
 *   client-supplied amount is never trusted — the rail re-prices every item.
 * - No money-moving secret is involved. Building a payment request needs only
 *   {@link SettlementPublicConfig} (destination wallet, mint, decimals), so
 *   the Vercel app stays keyless; the settlement keypair lives solely in
 *   `apps/treasury-worker`.
 */

/**
 * Env var name the webhook dispatcher resolves to sign deliveries to agent
 * callback URLs (see `lib/secrets.ts`). Stored as a reference, never a value.
 */
export const AGENT_WEBHOOK_SIGNING_SECRET_REFERENCE = "AGENT_WEBHOOK_SIGNING_SECRET";

export interface OrderIntakeDeps {
  readonly executeQuote: QuoteExecutor;
  /** Lazy so routes that never take orders don't require a database. */
  readonly getExecutor: () => SqlExecutor;
  /** Lazy so unrelated routes don't require settlement config to be present. */
  readonly getSettlementConfig: () => SettlementPublicConfig;
  readonly createOrderId?: () => string;
  readonly createSubscriptionId?: () => string;
  readonly signingSecretReference?: string;
  readonly now?: () => Date;
}

export function createOrderIntake(deps: OrderIntakeDeps): CreateOrderExecutor {
  const createOrderId = deps.createOrderId ?? (() => `ord_${randomUUID()}`);
  const createSubscriptionId = deps.createSubscriptionId ?? (() => `sub_${randomUUID()}`);
  const signingSecretReference =
    deps.signingSecretReference ?? AGENT_WEBHOOK_SIGNING_SECRET_REFERENCE;
  const now = deps.now ?? ((): Date => new Date());

  return async (request: CreateOrderRequest): Promise<CreatedOrder> => {
    const orderId = createOrderId();

    const quotes = await Promise.all(
      request.order.items.map((item) => deps.executeQuote(item.spec)),
    );
    const amountBaseUnits = quotes.reduce(
      (total, quote) => total + quote.priceUsdc.amountBaseUnits,
      0n,
    );

    const executor = deps.getExecutor();
    const fulfillmentInput = toFulfillmentOrderInput(request.order, orderId, now());
    await createPostgresOrderStore(executor).saveFulfillmentInput(fulfillmentInput);

    let webhookSubscriptionId: string | undefined;
    if (request.callbackUrl !== undefined) {
      webhookSubscriptionId = createSubscriptionId();
      await createWebhookSubscription(executor, {
        id: webhookSubscriptionId,
        internalOrderId: orderId,
        targetUrl: request.callbackUrl,
        signingSecretReference,
      });
    }

    const paymentRequest = createUsdcPaymentRequest(deps.getSettlementConfig(), {
      orderId,
      payerPublicKey: request.payerPublicKey,
      amountBaseUnits,
    });

    return {
      orderId,
      memo: paymentRequest.memo,
      settlementWallet: paymentRequest.settlementWallet,
      amountBaseUnits: paymentRequest.amountBaseUnits,
      usdcMintAddress: paymentRequest.usdcMintAddress,
      usdcDecimals: deps.getSettlementConfig().usdcDecimals,
      ...(webhookSubscriptionId !== undefined ? { webhookSubscriptionId } : {}),
    };
  };
}
