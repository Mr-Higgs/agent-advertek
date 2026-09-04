import { createOrderRequestSchema } from "@advertek/mcp-server";
import { ZodError } from "zod";
import { guardApiRequest } from "@/lib/api-guard";
import { jsonResponse } from "@/lib/json";
import { createQuoteExecutors } from "@/lib/quotes";

export const runtime = "nodejs";

/**
 * Order intake over REST — the same seam the `create_order` MCP tool uses.
 *
 * The response is a payment request: pay `amountBaseUnits` of `usdcMint` to
 * `settlementWallet` in one Solana transaction carrying `memo` verbatim, and
 * the QuickNode webhook handler will match the transfer back to this order.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = guardApiRequest(request, "orders");
  if (blocked) {
    return blocked;
  }

  try {
    const parsed = createOrderRequestSchema.parse(await request.json());
    const { executeCreateOrder } = createQuoteExecutors();
    const order = await executeCreateOrder(parsed);

    return jsonResponse(
      {
        ok: true,
        orderId: order.orderId,
        memo: order.memo,
        settlementWallet: order.settlementWallet,
        amountBaseUnits: order.amountBaseUnits,
        usdcMint: order.usdcMintAddress,
        usdcDecimals: order.usdcDecimals,
        ...(order.webhookSubscriptionId !== undefined
          ? { webhookSubscriptionId: order.webhookSubscriptionId }
          : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          ok: false,
          error: "Invalid order request",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    console.error("Order intake failed:", error);
    return jsonResponse({ ok: false, error: "Order intake failed" }, { status: 500 });
  }
}
