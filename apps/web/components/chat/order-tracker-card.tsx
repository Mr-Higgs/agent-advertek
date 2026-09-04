"use client";

import { useEffect, useState } from "react";
import { themes } from "../theme";
import { Ticket } from "./tool-cards";

const t = themes.light;

/** Happy path, in order — mirrors the agent-facing OrderStatus vocabulary. */
const HAPPY_PATH = [
  "pending-payment",
  "paid",
  "downloaded",
  "printing",
  "printed",
  "shipped",
  "completed",
] as const;

const STEP_LABELS: Record<string, string> = {
  "pending-payment": "Awaiting payment",
  paid: "Paid",
  downloaded: "In prepress",
  printing: "Printing",
  printed: "Printed",
  shipped: "Shipped",
  completed: "Delivered",
};

const TERMINAL = new Set(["completed", "cancelled", "failed"]);
const POLL_MS = 5_000;

export interface TrackerEvent {
  readonly status: string;
  readonly occurredAt: string;
}

interface TrackerState {
  readonly status: string;
  readonly events: readonly TrackerEvent[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * The pizza tracker. Self-polls the demo status route while the order is
 * live, so the model calls get_order_status once and the card follows the
 * order to completion on its own. Degrades to a static timeline when the
 * demo simulator is off (the poll 404s and stops).
 */
export function OrderTrackerCard({
  orderId,
  initialStatus,
  initialEvents,
}: {
  readonly orderId: string;
  readonly initialStatus: string;
  readonly initialEvents: readonly TrackerEvent[];
}) {
  const [state, setState] = useState<TrackerState>({
    status: initialStatus,
    events: initialEvents,
  });
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live || TERMINAL.has(state.status)) return;
    const timer = setInterval(() => {
      fetch(`/api/demo/orders/${encodeURIComponent(orderId)}`)
        .then(async (response) => {
          if (!response.ok) {
            setLive(false);
            return;
          }
          const data = (await response.json()) as {
            ok: boolean;
            status?: string;
            events?: TrackerEvent[];
          };
          if (data.ok && data.status !== undefined) {
            setState({ status: data.status, events: data.events ?? [] });
          }
        })
        .catch(() => {
          setLive(false);
        });
    }, POLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [live, state.status, orderId]);

  // First occurredAt per status (the poll race can double-insert an event).
  const firstSeen = new Map<string, string>();
  for (const event of state.events) {
    if (!firstSeen.has(event.status)) firstSeen.set(event.status, event.occurredAt);
  }

  const offRamp = ["held", "cancelled", "failed"].includes(state.status);
  const currentIndex = (HAPPY_PATH as readonly string[]).indexOf(state.status);

  return (
    <Ticket label={`Order ${orderId}`}>
      {offRamp ? (
        <div className="font-serif text-3xl leading-none mb-3">{state.status}</div>
      ) : (
        <div>
          {HAPPY_PATH.map((step, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            const pulsing = current && !TERMINAL.has(state.status);
            const dotColor = pulsing ? t.signal : done || current ? t.text : "transparent";
            const time = firstSeen.get(step);
            return (
              <div key={step} className="flex items-center gap-3 py-1.5">
                <span
                  className={pulsing ? "pulse-dot" : undefined}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    flexShrink: 0,
                    backgroundColor: dotColor,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: pulsing ? t.signal : done || current ? t.text : t.ticketLine,
                    ...(pulsing ? { ["--pulse-color" as string]: "rgba(255,77,0,0.35)" } : {}),
                  }}
                />
                <span
                  className="font-mono text-[11px] uppercase tracking-wider flex-1"
                  style={{ color: done || current ? t.ticketText : t.ticketMid }}
                >
                  {STEP_LABELS[step] ?? step}
                </span>
                <span className="font-mono text-[10px]" style={{ color: t.ticketMid }}>
                  {time !== undefined ? formatTime(time) : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="font-mono text-[10px] uppercase tracking-wider mt-3" style={{ color: t.ticketMid }}>
        Demo simulation — production statuses are simulated
      </p>
    </Ticket>
  );
}
