import { readOrderStatus } from "@advertek/db";
import { guardApiRequest } from "@/lib/api-guard";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/json";

export const runtime = "nodejs";

/**
 * Order status for the agent that placed it: current status plus the full
 * `order_status_events` timeline (payment confirmation, Advertek production
 * transitions, shipment). Timestamps are ISO-8601; USDC amounts are base
 * units as decimal strings.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const blocked = guardApiRequest(request, "orders");
  if (blocked) {
    return blocked;
  }

  const { id } = await context.params;

  try {
    const order = await readOrderStatus(getDb(), id);
    if (!order) {
      return jsonResponse({ ok: false, error: `Unknown order: ${id}` }, { status: 404 });
    }

    return jsonResponse({
      ok: true,
      orderId: order.orderId,
      status: order.status,
      vendorOrderId: order.vendorOrderId,
      payment: {
        signature: order.paymentSignature,
        amountBaseUnits: order.paymentAmountBaseUnits,
        slot: order.paymentSlot,
      },
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      events: order.events.map((event) => ({
        status: event.status,
        occurredAt: event.occurredAt.toISOString(),
        recordedAt: event.recordedAt.toISOString(),
      })),
    });
  } catch {
    return jsonResponse({ ok: false, error: "Order lookup failed" }, { status: 500 });
  }
}
