import { z } from "zod";
import { createPostgresOrderStore, readOrderStatus } from "@advertek/db";
import { DEMO_PAYMENT_SIGNATURE, isDemoSimulatorEnabled } from "@/lib/demo-sim";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/json";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  // The quoted amount is not persisted before payment, so the card echoes it
  // back here. Trusting the client is acceptable only because the signature
  // below is overtly fake — nothing downstream treats this as a settlement.
  amountBaseUnits: z.string().regex(/^\d+$/),
});

/**
 * Demo-only: marks an order paid with an unmistakably fake signature so the
 * tracker can run without real funds. 404s unless DEMO_SIMULATOR=true.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isDemoSimulatorEnabled()) {
    return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
  }
  const decision = checkRateLimit(`demo-pay:ip:${clientIpAddress(request)}`);
  if (!decision.allowed) {
    return jsonResponse(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429, headers: { "retry-after": String(decision.retryAfterSeconds) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!body.success) {
    return jsonResponse({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const order = await readOrderStatus(getDb(), id);
    if (order === undefined) {
      return jsonResponse({ ok: false, error: `Unknown order: ${id}` }, { status: 404 });
    }
    if (order.status !== "pending-payment") {
      return jsonResponse({ ok: true, demo: true, orderId: id, status: order.status });
    }
    await createPostgresOrderStore(getDb()).updateOrderStatus(
      {
        orderId: id,
        signature: DEMO_PAYMENT_SIGNATURE,
        amountBaseUnits: BigInt(body.data.amountBaseUnits),
        slot: 0,
      },
      "paid",
    );
    return jsonResponse({ ok: true, demo: true, orderId: id, status: "paid" });
  } catch {
    return jsonResponse({ ok: false, error: "Simulated payment failed" }, { status: 500 });
  }
}
