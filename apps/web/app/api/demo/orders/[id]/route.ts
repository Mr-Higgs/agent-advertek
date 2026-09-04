import { createPostgresOrderStore, readOrderStatus } from "@advertek/db";
import { dueStages, isDemoSimulatorEnabled } from "@/lib/demo-sim";
import { getDb } from "@/lib/db";
import { jsonResponse } from "@/lib/json";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";

export const runtime = "nodejs";

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "failed"]);

/**
 * Demo-only order status for the chat's live tracker. Serverless has no
 * timers, so each poll lazily writes whatever simulated stages have come due
 * since the payment event, then returns the merged timeline. 404s unless
 * DEMO_SIMULATOR=true.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isDemoSimulatorEnabled()) {
    return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
  }
  const decision = checkRateLimit(`demo-status:ip:${clientIpAddress(request)}`);
  if (!decision.allowed) {
    return jsonResponse(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429, headers: { "retry-after": String(decision.retryAfterSeconds) } },
    );
  }

  const { id } = await context.params;
  try {
    const order = await readOrderStatus(getDb(), id);
    if (order === undefined) {
      return jsonResponse({ ok: false, error: `Unknown order: ${id}` }, { status: 404 });
    }

    const due = dueStages(order.events, new Date());
    const store = createPostgresOrderStore(getDb());
    for (const stage of due) {
      await store.recordStatusEvent(id, stage.status, stage.occurredAt);
    }

    const events = [
      ...order.events.map((event) => ({
        status: event.status,
        occurredAt: event.occurredAt.toISOString(),
      })),
      ...due.map((stage) => ({
        status: stage.status,
        occurredAt: stage.occurredAt.toISOString(),
      })),
    ];
    const status = due.length > 0 ? (due[due.length - 1]?.status ?? order.status) : order.status;

    return jsonResponse({
      ok: true,
      demo: true,
      orderId: id,
      status,
      events,
      terminal: TERMINAL_STATUSES.has(status),
    });
  } catch {
    return jsonResponse({ ok: false, error: "Order lookup failed" }, { status: 500 });
  }
}
