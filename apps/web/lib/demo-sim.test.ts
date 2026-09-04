import { describe, expect, it } from "vitest";
import {
  DEMO_STAGE_INTERVAL_MS,
  DEMO_STATUS_SEQUENCE,
  dueStages,
  isDemoSimulatorEnabled,
} from "./demo-sim";

const paidAt = new Date("2026-09-03T12:00:00.000Z");
const paid = { status: "paid", occurredAt: paidAt };

function at(msAfterPaid: number): Date {
  return new Date(paidAt.getTime() + msAfterPaid);
}

describe("dueStages", () => {
  it("owes nothing before payment", () => {
    expect(dueStages([], at(120_000))).toEqual([]);
    expect(dueStages([{ status: "pending-payment", occurredAt: paidAt }], at(120_000))).toEqual([]);
  });

  it("owes nothing immediately after payment", () => {
    expect(dueStages([paid], at(0))).toEqual([]);
    expect(dueStages([paid], at(DEMO_STAGE_INTERVAL_MS - 1))).toEqual([]);
  });

  it("owes the next stage after one interval, stamped at the schedule time", () => {
    const due = dueStages([paid], at(DEMO_STAGE_INTERVAL_MS));
    expect(due).toEqual([{ status: "downloaded", occurredAt: at(DEMO_STAGE_INTERVAL_MS) }]);
  });

  it("owes all remaining stages capped at completed after a long gap", () => {
    const due = dueStages([paid], at(60 * 60 * 1000));
    expect(due.map((stage) => stage.status)).toEqual([
      "downloaded",
      "printing",
      "printed",
      "shipped",
      "completed",
    ]);
    expect(due[due.length - 1]?.occurredAt).toEqual(
      at((DEMO_STATUS_SEQUENCE.length - 1) * DEMO_STAGE_INTERVAL_MS),
    );
  });

  it("owes only the remainder when partially advanced", () => {
    const events = [
      paid,
      { status: "downloaded", occurredAt: at(DEMO_STAGE_INTERVAL_MS) },
      { status: "printing", occurredAt: at(2 * DEMO_STAGE_INTERVAL_MS) },
    ];
    const due = dueStages(events, at(4 * DEMO_STAGE_INTERVAL_MS));
    expect(due.map((stage) => stage.status)).toEqual(["printed", "shipped"]);
  });

  it("owes nothing once terminal", () => {
    const events = DEMO_STATUS_SEQUENCE.map((status, index) => ({
      status,
      occurredAt: at(index * DEMO_STAGE_INTERVAL_MS),
    }));
    expect(dueStages(events, at(60 * 60 * 1000))).toEqual([]);
  });

  it("halts on held, cancelled, and failed", () => {
    for (const status of ["held", "cancelled", "failed"]) {
      const events = [paid, { status, occurredAt: at(1000) }];
      expect(dueStages(events, at(60 * 60 * 1000))).toEqual([]);
    }
  });
});

describe("isDemoSimulatorEnabled", () => {
  it("is on only when DEMO_SIMULATOR is exactly 'true'", () => {
    expect(isDemoSimulatorEnabled({ DEMO_SIMULATOR: "true" })).toBe(true);
    expect(isDemoSimulatorEnabled({ DEMO_SIMULATOR: "false" })).toBe(false);
    expect(isDemoSimulatorEnabled({})).toBe(false);
  });

  it("rejects other values", () => {
    expect(() => isDemoSimulatorEnabled({ DEMO_SIMULATOR: "yes" })).toThrow(
      "Invalid demo simulator configuration",
    );
  });
});
