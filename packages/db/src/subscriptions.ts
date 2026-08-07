import type { WebhookSubscriptionLookup } from "@advertek/fulfillment";
import type { WebhookSubscription } from "@advertek/webhooks";
import { z } from "zod";
import type { SqlExecutor } from "./executor.js";

export class WebhookSubscriptionNotFoundError extends Error {
  override readonly name = "WebhookSubscriptionNotFoundError";
}

export const webhookSubscriptionInsertSchema = z.object({
  id: z.string().min(1),
  internalOrderId: z.string().min(1),
  targetUrl: z.string().url(),
  /**
   * Name of the secret the dispatcher signs deliveries with — a reference,
   * never the secret value itself (resolved at dispatch time).
   */
  signingSecretReference: z.string().min(1),
});
export type WebhookSubscriptionInsert = z.infer<
  typeof webhookSubscriptionInsertSchema
>;

/**
 * Writes the agent callback subscription an order's status events are
 * dispatched to. Written at order intake, read back by
 * {@link createPostgresWebhookSubscriptionLookup}.
 */
export async function createWebhookSubscription(
  executor: SqlExecutor,
  input: WebhookSubscriptionInsert,
): Promise<WebhookSubscriptionInsert> {
  const parsed = webhookSubscriptionInsertSchema.parse(input);
  await executor.query(
    `INSERT INTO webhook_subscriptions (id, internal_order_id, target_url, signing_secret_reference)
     VALUES ($1, $2, $3, $4)`,
    [parsed.id, parsed.internalOrderId, parsed.targetUrl, parsed.signingSecretReference],
  );
  return parsed;
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
