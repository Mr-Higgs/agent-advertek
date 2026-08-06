import type { WebhookSubscriptionLookup } from "@advertek/fulfillment";
import type { WebhookSubscription } from "@advertek/webhooks";
import type { SqlExecutor } from "./executor.js";

export class WebhookSubscriptionNotFoundError extends Error {
  override readonly name = "WebhookSubscriptionNotFoundError";
}

interface SubscriptionRow {
  readonly id: string;
  readonly target_url: string;
  readonly signing_secret_reference: string;
}

/**
 * Postgres-backed implementation of `@advertek/fulfillment`'s
 * `WebhookSubscriptionLookup` seam: resolves which agent webhook subscription
 * an internal order belongs to, so status events can be dispatched back to
 * the agent that placed the order.
 */
export function createPostgresWebhookSubscriptionLookup(
  executor: SqlExecutor,
): WebhookSubscriptionLookup {
  return {
    async getSubscriptionForOrder(internalOrderId: string): Promise<WebhookSubscription> {
      const rows = await executor.query<SubscriptionRow>(
        `SELECT id, target_url, signing_secret_reference
         FROM webhook_subscriptions
         WHERE internal_order_id = $1
         ORDER BY created_at ASC
         LIMIT 1`,
        [internalOrderId],
      );
      const row = rows[0];
      if (!row) {
        throw new WebhookSubscriptionNotFoundError(
          `No webhook subscription for order: ${internalOrderId}`,
        );
      }
      return {
        id: row.id,
        targetUrl: new URL(row.target_url),
        signingSecretReference: row.signing_secret_reference,
      };
    },
  };
}
