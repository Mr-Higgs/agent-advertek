import { timingSafeEqual } from "node:crypto";
import type { OrderStatus } from "@advertek/types";
import {
  advertekWebhookPayloadSchema,
  type AdvertekOrderStatus,
  type AdvertekWebhookPackage,
} from "./advertek-api-types.js";
import { bridgeAdvertekStatusToOrderStatus } from "./status-bridge.js";

/**
 * Receiver for Advertek's inbound order-status webhook.
 *
 * Contract:
 *   - Authenticated via HTTP Basic Auth on our receiving endpoint (see
 *     `advertek-webhook-http.ts` for the HTTPS-only enforcement).
 *   - Advertek expects a 2xx response within 10 seconds and retries on
 *     timeout/non-2xx, up to 5 total attempts. `handleAdvertekWebhook` is
 *     therefore synchronous up to the point where the event is
 *     constructed — auth verification and payload validation never await
 *     anything — so the HTTP layer can acknowledge immediately.
 *     `deps.dispatch` (the slow part: order lookup + agent-facing
 *     dispatch) is invoked afterward without being awaited, so a slow or
 *     failing dispatch can never delay or fail the acknowledgement.
 *   - Payload shape: `{ id, status, metadata, packages[] }`. `metadata` is
 *     the exact map stamped onto the order at creation time (see
 *     `request-builder.ts`) — `metadata.internal_order_id` is our only
 *     correlation key back to the internal order id.
 */

export class AdvertekWebhookAuthError extends Error {
  override readonly name = "AdvertekWebhookAuthError";
}

export class AdvertekWebhookPayloadValidationError extends Error {
  override readonly name = "AdvertekWebhookPayloadValidationError";
}

export interface AdvertekWebhookCredentials {
  readonly username: string;
  readonly password: string;
}

export interface AdvertekWebhookRequest {
  readonly authorizationHeader?: string | undefined;
  /** Raw request body (decompressed if gzip'd, but otherwise unparsed JSON text). */
  readonly rawBody: string;
}

export interface AdvertekWebhookEvent {
  readonly vendorOrderId: string;
  readonly internalOrderId: string;
  readonly vendorStatus: AdvertekOrderStatus;
  readonly orderStatus: OrderStatus;
  readonly packages: readonly AdvertekWebhookPackage[];
  readonly receivedAt: Date;
}

export interface HandleAdvertekWebhookDeps {
  readonly credentials: AdvertekWebhookCredentials;
  /**
   * Slow downstream processing (order lookup, agent-facing dispatch).
   * Invoked without being awaited — see the module doc comment — so a
   * rejection here can only ever reach `onDispatchError`, never the caller
   * of `handleAdvertekWebhook`.
   */
  readonly dispatch: (event: AdvertekWebhookEvent) => Promise<void>;
  readonly onDispatchError?: (error: unknown, event: AdvertekWebhookEvent) => void;
  readonly now?: () => Date;
}

/** Verifies an `Authorization: Basic ...` header with timing-safe comparisons. */
export function verifyAdvertekWebhookBasicAuth(
  authorizationHeader: string | undefined,
  credentials: AdvertekWebhookCredentials,
): boolean {
  if (!authorizationHeader) {
    return false;
  }
  const match = /^Basic\s+(.+)$/i.exec(authorizationHeader.trim());
  if (!match?.[1]) {
    return false;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return false;
  }
  const providedUsername = decoded.slice(0, separatorIndex);
  const providedPassword = decoded.slice(separatorIndex + 1);

  return (
    timingSafeEqualStrings(providedUsername, credentials.username) &&
    timingSafeEqualStrings(providedPassword, credentials.password)
  );
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Still run a fixed-cost comparison so mismatched lengths don't return
    // measurably faster than matched ones.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Verifies auth and validates the payload (both fast, both synchronous),
 * then fires `deps.dispatch` for the slow work without awaiting it before
 * returning. Throws {@link AdvertekWebhookAuthError} for a failed/missing
 * Basic Auth header and {@link AdvertekWebhookPayloadValidationError} for a
 * malformed body or a payload whose `metadata` can't be correlated to an
 * internal order — `deps.dispatch` is never reached in either case.
 */
export function handleAdvertekWebhook(
  deps: HandleAdvertekWebhookDeps,
  request: AdvertekWebhookRequest,
): AdvertekWebhookEvent {
  if (!verifyAdvertekWebhookBasicAuth(request.authorizationHeader, deps.credentials)) {
    throw new AdvertekWebhookAuthError(
      "Advertek webhook Basic Auth verification failed",
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(request.rawBody);
  } catch (error) {
    throw new AdvertekWebhookPayloadValidationError(
      `Advertek webhook body is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const parsed = advertekWebhookPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new AdvertekWebhookPayloadValidationError(
      `Advertek webhook payload failed schema validation: ${parsed.error.message}`,
    );
  }
  const payload = parsed.data;

  const internalOrderId = payload.metadata["internal_order_id"];
  if (internalOrderId === undefined) {
    throw new AdvertekWebhookPayloadValidationError(
      "Advertek webhook payload metadata is missing internal_order_id — cannot correlate to an internal order",
    );
  }

  const now = deps.now ?? ((): Date => new Date());
  const event: AdvertekWebhookEvent = {
    vendorOrderId: payload.id,
    internalOrderId,
    vendorStatus: payload.status,
    orderStatus: bridgeAdvertekStatusToOrderStatus(payload.status),
    packages: payload.packages,
    receivedAt: now(),
  };

  // Fire-and-forget: by design, nothing below this line may be awaited —
  // Advertek is waiting on our HTTP response, not on this. Any rejection
  // is routed to `onDispatchError` instead of being thrown.
  void Promise.resolve()
    .then(() => deps.dispatch(event))
    .catch((error: unknown) => {
      deps.onDispatchError?.(error, event);
    });

  return event;
}
