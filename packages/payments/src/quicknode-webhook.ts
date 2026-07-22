import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { parseOrderIdFromMemo } from "./payment-request.js";

/**
 * Receiver for QuickNode Streams/Functions webhook deliveries that notify us
 * when a transaction to our settlement address confirms.
 *
 * QuickNode signs every delivery with HMAC-SHA256 over
 * `nonce + timestamp + rawBody`, keyed by the Stream/Function's security
 * token, and sends the result in the `x-qn-signature` header alongside
 * `x-qn-nonce` and `x-qn-timestamp`. See:
 * https://www.quicknode.com/guides/quicknode-products/streams/validating-incoming-streams-webhook-messages
 *
 * The signature MUST be verified against the raw (decompressed, but
 * otherwise unmodified) request body before any part of the payload is
 * trusted. `handleQuickNodeWebhook` enforces this: verification happens
 * before the body is parsed, and `updateOrderStatus` is only ever invoked
 * for deliveries that passed verification.
 */

export class WebhookSignatureVerificationError extends Error {
  override readonly name = "WebhookSignatureVerificationError";
}

export class WebhookPayloadValidationError extends Error {
  override readonly name = "WebhookPayloadValidationError";
}

export interface VerifyQuickNodeSignatureInput {
  readonly nonce: string;
  readonly timestamp: string;
  /** Raw request body exactly as signed (decompressed if gzip, unparsed). */
  readonly rawBody: string;
  /** Hex-encoded HMAC-SHA256 digest from the `x-qn-signature` header. */
  readonly signatureHex: string;
  readonly securityToken: string;
}

/** Verifies a QuickNode webhook signature using a timing-safe comparison. */
export function verifyQuickNodeSignature(
  input: VerifyQuickNodeSignatureInput,
): boolean {
  const expectedHex = createHmac("sha256", input.securityToken)
    .update(input.nonce + input.timestamp + input.rawBody, "utf8")
    .digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  const provided = parseHexBuffer(input.signatureHex);
  if (!provided || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}

function parseHexBuffer(hex: string): Buffer | undefined {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return undefined;
  }
  return Buffer.from(hex, "hex");
}

/**
 * Shape our own QuickNode Function/Stream filter emits per matched transfer
 * to the settlement token account. We control that Function's code, so this
 * is a contract we define — not something QuickNode fixes for us.
 */
export const quickNodeConfirmedTransferSchema = z.object({
  signature: z.string().min(1),
  slot: z.number().int().nonnegative(),
  memo: z.string().min(1),
  settlementTokenAccount: z.string().min(1),
  mint: z.string().min(1),
  /** Base-10 integer string; JSON has no bigint, so it travels as text. */
  amountBaseUnits: z.string().regex(/^\d+$/, "must be a base-10 integer string"),
});

export type QuickNodeConfirmedTransfer = z.infer<
  typeof quickNodeConfirmedTransferSchema
>;

export const quickNodeWebhookPayloadSchema = z.object({
  confirmedTransfers: z.array(quickNodeConfirmedTransferSchema),
});

export type QuickNodeWebhookPayload = z.infer<
  typeof quickNodeWebhookPayloadSchema
>;

export type OrderStatus = "paid";

export interface ConfirmedOrderPayment {
  readonly orderId: string;
  readonly signature: string;
  readonly amountBaseUnits: bigint;
  readonly slot: number;
}

/**
 * @blocker STEP_9 — order-status persistence isn't implemented yet. This is
 * the seam Step 9 fills in with a real implementation (e.g. backed by a
 * database). Until then, callers must inject their own (mocked in tests).
 */
export interface OrderStatusUpdater {
  updateOrderStatus(
    payment: ConfirmedOrderPayment,
    status: OrderStatus,
  ): Promise<void>;
}

export interface QuickNodeWebhookHeaders {
  readonly "x-qn-nonce"?: string | undefined;
  readonly "x-qn-timestamp"?: string | undefined;
  readonly "x-qn-signature"?: string | undefined;
}

export interface QuickNodeWebhookRequest {
  readonly headers: QuickNodeWebhookHeaders;
  /** Raw body exactly as signed (decompressed if gzip, unparsed JSON text). */
  readonly rawBody: string;
}

export interface HandleQuickNodeWebhookDeps {
  readonly securityToken: string;
  readonly updateOrderStatus: OrderStatusUpdater["updateOrderStatus"];
}

export interface QuickNodeWebhookResult {
  readonly processedOrderIds: readonly string[];
  readonly skipped: readonly { readonly memo: string; readonly reason: string }[];
}

/**
 * Verifies a QuickNode webhook delivery and, only if verification succeeds,
 * looks up each confirmed transfer's order by its memo and calls
 * `updateOrderStatus`. Throws {@link WebhookSignatureVerificationError} for
 * missing/invalid signatures — `updateOrderStatus` is never reached in that
 * case, so an unverified payload can never update order status.
 */
export async function handleQuickNodeWebhook(
  deps: HandleQuickNodeWebhookDeps,
  request: QuickNodeWebhookRequest,
): Promise<QuickNodeWebhookResult> {
  const nonce = request.headers["x-qn-nonce"];
  const timestamp = request.headers["x-qn-timestamp"];
  const signature = request.headers["x-qn-signature"];

  if (!nonce || !timestamp || !signature) {
    throw new WebhookSignatureVerificationError(
      "Missing required x-qn-nonce/x-qn-timestamp/x-qn-signature header(s)",
    );
  }

  const verified = verifyQuickNodeSignature({
    nonce,
    timestamp,
    rawBody: request.rawBody,
    signatureHex: signature,
    securityToken: deps.securityToken,
  });

  if (!verified) {
    throw new WebhookSignatureVerificationError(
      "QuickNode webhook signature verification failed",
    );
  }

  // Only past this point has the payload been proven to originate from
  // QuickNode and to be byte-for-byte what it signed.
  let payload: QuickNodeWebhookPayload;
  try {
    payload = quickNodeWebhookPayloadSchema.parse(
      JSON.parse(request.rawBody) as unknown,
    );
  } catch (error) {
    throw new WebhookPayloadValidationError(
      `Verified QuickNode webhook body failed schema validation: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const processedOrderIds: string[] = [];
  const skipped: { memo: string; reason: string }[] = [];

  for (const transfer of payload.confirmedTransfers) {
    const orderId = parseOrderIdFromMemo(transfer.memo);
    if (!orderId) {
      skipped.push({
        memo: transfer.memo,
        reason: "memo does not match the advertek:order:{orderId}:{nonce} format",
      });
      continue;
    }

    await deps.updateOrderStatus(
      {
        orderId,
        signature: transfer.signature,
        amountBaseUnits: BigInt(transfer.amountBaseUnits),
        slot: transfer.slot,
      },
      "paid",
    );
    processedOrderIds.push(orderId);
  }

  return { processedOrderIds, skipped };
}
