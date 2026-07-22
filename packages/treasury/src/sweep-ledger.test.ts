import { describe, expect, it } from "vitest";
import { createInMemorySweepLedger, type SweepRecord } from "./sweep-ledger.js";

function makeSweep(overrides: Partial<SweepRecord> = {}): SweepRecord {
  return {
    sweepId: "sweep_1",
    initiatedAt: "2024-06-01T00:00:00.000Z",
    coveredTransfers: [{ signature: "sig_1", orderId: "ord_1", amountBaseUnits: 1_000_000n }],
    coveredAmountBaseUnits: 1_000_000n,
    newestCoveredSignature: "sig_1",
    depositTransactionSignature: "deposit_sig_1",
    okxQuoteId: "quote_1",
    okxTradeId: "trade_1",
    estimatedFiatAmountMinorUnits: 13_500n,
    actualFiatAmountMinorUnits: 13_480n,
    fiatCurrency: "CAD",
    ...overrides,
  };
}

describe("createInMemorySweepLedger", () => {
  it("records and lists sweeps within a date range", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(makeSweep({ sweepId: "s1", initiatedAt: "2024-06-01T00:00:00.000Z" }));
    await ledger.record(makeSweep({ sweepId: "s2", initiatedAt: "2024-06-15T00:00:00.000Z" }));
    await ledger.record(makeSweep({ sweepId: "s3", initiatedAt: "2024-07-01T00:00:00.000Z" }));

    const inJune = await ledger.listBetween({
      from: new Date("2024-06-01T00:00:00.000Z"),
      to: new Date("2024-06-30T23:59:59.999Z"),
    });

    expect(inJune.map((sweep) => sweep.sweepId)).toEqual(["s1", "s2"]);
  });

  it("returns an empty list when nothing falls in range", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(makeSweep({ initiatedAt: "2024-06-01T00:00:00.000Z" }));

    const result = await ledger.listBetween({
      from: new Date("2025-01-01T00:00:00.000Z"),
      to: new Date("2025-01-31T00:00:00.000Z"),
    });

    expect(result).toEqual([]);
  });

  it("getMostRecent returns undefined for an empty ledger", async () => {
    const ledger = createInMemorySweepLedger();
    await expect(ledger.getMostRecent()).resolves.toBeUndefined();
  });

  it("getMostRecent returns the sweep with the latest initiatedAt regardless of insertion order", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(makeSweep({ sweepId: "older", initiatedAt: "2024-06-01T00:00:00.000Z" }));
    await ledger.record(makeSweep({ sweepId: "newest", initiatedAt: "2024-06-20T00:00:00.000Z" }));
    await ledger.record(makeSweep({ sweepId: "middle", initiatedAt: "2024-06-10T00:00:00.000Z" }));

    const mostRecent = await ledger.getMostRecent();
    expect(mostRecent?.sweepId).toBe("newest");
  });
});
