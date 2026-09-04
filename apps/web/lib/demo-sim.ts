import { z } from "zod";
import type { OrderStatus } from "@advertek/types";

/**
 * Demo order-lifecycle simulator. Real deployments advance status only via
 * the QuickNode payment webhook and Advertek's fulfillment webhooks; the
 * demo has neither, so the /api/demo routes fake the heartbeat — clearly
 * labeled, gated behind DEMO_SIMULATOR, and using an overtly fake payment
 * signature so simulated data can never pass as real.
 */

const demoEnvSchema = z.object({
  DEMO_SIMULATOR: z.enum(["true", "false"]).optional(),
});

export function isDemoSimulatorEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const parsed = demoEnvSchema.safeParse({ DEMO_SIMULATOR: env["DEMO_SIMULATOR"] });
  if (!parsed.success) {
    throw new Error(`Invalid demo simulator configuration: DEMO_SIMULATOR must be "true" or "false"`);
  }
  return parsed.data.DEMO_SIMULATOR === "true";
}

/** Unmistakably not a Solana signature — simulated payments must be obvious. */
export const DEMO_PAYMENT_SIGNATURE = "DEMO-SIMULATED-PAYMENT";

/** Happy path after payment, in order. */
export const DEMO_STATUS_SEQUENCE: readonly OrderStatus[] = [
  "paid",
  "downloaded",
  "printing",
  "printed",
  "shipped",
  "completed",
];

/** One production stage every 25s — payment to "delivered" in ~2 minutes. */
export const DEMO_STAGE_INTERVAL_MS = 25_000;

export interface DemoStatusEvent {
  readonly status: string;
  readonly occurredAt: Date;
}

export interface DueStage {
  readonly status: OrderStatus;
  readonly occurredAt: Date;
}

const HALT_STATUSES: ReadonlySet<string> = new Set(["held", "cancelled", "failed"]);

/**
 * Which simulated stages are owed given the recorded timeline and the clock.
 * Pure: the routes do the reading and writing. Returns [] until a "paid"
 * event exists, and never advances past a held/cancelled/failed off-ramp.
 */
export function dueStages(events: readonly DemoStatusEvent[], now: Date): readonly DueStage[] {
  if (events.some((event) => HALT_STATUSES.has(event.status))) {
    return [];
  }
  const paidEvent = events.find((event) => event.status === "paid");
  if (paidEvent === undefined) {
    return [];
  }

  let currentIndex = 0;
  for (const event of events) {
    const index = DEMO_STATUS_SEQUENCE.indexOf(event.status as OrderStatus);
    if (index > currentIndex) currentIndex = index;
  }

  const elapsed = now.getTime() - paidEvent.occurredAt.getTime();
  const targetIndex = Math.min(
    Math.floor(elapsed / DEMO_STAGE_INTERVAL_MS),
    DEMO_STATUS_SEQUENCE.length - 1,
  );

  const due: DueStage[] = [];
  for (let index = currentIndex + 1; index <= targetIndex; index += 1) {
    const status = DEMO_STATUS_SEQUENCE[index];
    if (status === undefined) break;
    due.push({
      status,
      occurredAt: new Date(paidEvent.occurredAt.getTime() + index * DEMO_STAGE_INTERVAL_MS),
    });
  }
  return due;
}
