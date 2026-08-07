import { fulfillmentOrderIntakeSchema } from "@advertek/fulfillment";
import { ZodError, z } from "zod";

/**
 * Order intake tool: the only way an agent gets a payable Advertek order.
 * The rail mints the order id, prices the job itself, persists the
 * fulfillment payload, and returns the payment request — the agent supplies
 * the job and its payer wallet, nothing more.
 */

export const createOrderToolInputSchema = {
  order: fulfillmentOrderIntakeSchema.describe(
    "The full print order: customerOrderNumber, locationCode, shippingService, soldTo/shipTo addresses, and one or more items (each with internalItemId, a complete SKU spec as accepted by get_quote, and customsValueUsdCents as an integer string of US cents). Do not include an order id — the rail mints it.",
  ),
  payerPublicKey: z
    .string()
    .min(32)
    .max(44)
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/)
    .describe(
      "Base58 Solana public key of the wallet that will pay for this order in USDC.",
    ),
  callbackUrl: z
    .string()
    .url()
    .optional()
    .describe(
      "Optional https URL to receive signed order-status webhooks (accepted, printing, shipped, ...) for this order.",
    ),
};

export const createOrderRequestSchema = z.object(createOrderToolInputSchema);
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

/** The payable order the rail issues back. Amounts stay bigint in-process. */
export interface CreatedOrder {
  readonly orderId: string;
  readonly memo: string;
  readonly settlementWallet: string;
  readonly amountBaseUnits: bigint;
  readonly usdcMintAddress: string;
  readonly usdcDecimals: number;
  /** Present only when the request carried a `callbackUrl`. */
  readonly webhookSubscriptionId?: string;
}

/** Injected order-intake seam — persistence and pricing live in the host app. */
export type CreateOrderExecutor = (
  request: CreateOrderRequest,
) => Promise<CreatedOrder>;

/** MCP SDK outputSchema must be a Zod object — see quote-tool.ts for why success/error share one shape. */
export const createOrderToolResultSchema = z.object({
  ok: z.boolean(),
  order: z
    .object({
      orderId: z.string(),
      memo: z.string(),
      settlementWallet: z.string(),
      amountBaseUnits: z.string(),
      usdcMintAddress: z.string(),
      usdcDecimals: z.number(),
      webhookSubscriptionId: z.string().optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.enum(["invalid_order", "order_failed"]),
      message: z.string(),
      issues: z
        .array(
          z.object({
            path: z.string(),
            code: z.string(),
            message: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type CreateOrderToolResult = z.infer<typeof createOrderToolResultSchema>;

function serializeCreatedOrder(order: CreatedOrder): CreateOrderToolResult {
  return {
    ok: true,
    order: {
      orderId: order.orderId,
      memo: order.memo,
      settlementWallet: order.settlementWallet,
      amountBaseUnits: order.amountBaseUnits.toString(),
      usdcMintAddress: order.usdcMintAddress,
      usdcDecimals: order.usdcDecimals,
      ...(order.webhookSubscriptionId !== undefined
        ? { webhookSubscriptionId: order.webhookSubscriptionId }
        : {}),
    },
  };
}

function invalidOrderResult(error: ZodError): CreateOrderToolResult {
  return {
    ok: false,
    error: {
      code: "invalid_order",
      message:
        "The order failed validation. Fix the listed fields and call create_order again.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    },
  };
}

export async function buildCreateOrderToolResult(
  executeCreateOrder: CreateOrderExecutor,
  input: unknown,
): Promise<CreateOrderToolResult> {
  const parsed = createOrderRequestSchema.safeParse(input);
  if (!parsed.success) {
    return invalidOrderResult(parsed.error);
  }

  try {
    return serializeCreatedOrder(await executeCreateOrder(parsed.data));
  } catch (error) {
    if (error instanceof ZodError) {
      return invalidOrderResult(error);
    }
    return {
      ok: false,
      error: {
        code: "order_failed",
        message:
          error instanceof Error
            ? error.message
            : "Order creation failed for an unknown reason.",
      },
    };
  }
}
