import { createHmac } from "node:crypto";
import { orderStatusWebhookSchema } from "./index.js";
import type { WebhookDispatcher } from "./index.js";
import type { OrderStatusEvent } from "@advertek/types";

export class WebhookDispatchError extends Error {
  override readonly name = "WebhookDispatchError";
}

export interface FetchLike {
  (url: string, init: {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: string;
  }): Promise<{ readonly ok: boolean; readonly status: number }>;
}

export interface HttpWebhookDispatcherDeps {
  readonly fetchImpl: FetchLike;
  /**
   * Resolves a subscription's `signingSecretReference` (an opaque reference,
   * e.g. a secret-manager key or env var name — never the secret itself) to
   * the actual signing secret. Throwing here fails the dispatch.
   */
  readonly resolveSecret: (reference: string) => string;
}

export const SIGNATURE_HEADER = "x-advertek-signature";

export function signWebhookBody(secret: string, rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

/**
 * Delivers agent-facing `OrderStatusEvent`s to the subscription's target URL
 * over HTTP POST, signed with HMAC-SHA256 (`x-advertek-signature:
 * sha256=<hex>`) so the receiving agent can verify provenance. Non-2xx
 * responses throw {@link WebhookDispatchError} — retry policy belongs to the
 * caller.
 */
export function createHttpWebhookDispatcher(
  deps: HttpWebhookDispatcherDeps,
): WebhookDispatcher {
  return {
    async dispatch(subscription, event: OrderStatusEvent): Promise<void> {
      const parsed = orderStatusWebhookSchema.parse(event);
      const body = JSON.stringify({
        orderId: parsed.orderId,
        status: parsed.status,
        occurredAt: parsed.occurredAt.toISOString(),
      });
      const secret = deps.resolveSecret(subscription.signingSecretReference);

      const response = await deps.fetchImpl(subscription.targetUrl.href, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [SIGNATURE_HEADER]: signWebhookBody(secret, body),
        },
        body,
      });

      if (!response.ok) {
        throw new WebhookDispatchError(
          `Webhook dispatch to ${subscription.targetUrl.href} failed with status ${String(response.status)}`,
        );
      }
    },
  };
}
