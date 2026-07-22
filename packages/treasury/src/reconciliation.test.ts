import { describe, expect, it } from "vitest";
import { DEFAULT_RECONCILIATION_TOLERANCE, reconcileSweeps } from "./reconciliation.js";
import { createInMemorySweepLedger, type SweepRecord } from "./sweep-ledger.js";

function makeSweep(overrides: Partial<SweepRecord> = {}): SweepRecord {
  return {
    sweepId: "sweep_1",
    initiatedAt: "2024-06-15T00:00:00.000Z",
    coveredTransfers: [
      { signature: "sig_ord_a", orderId: "ord_a", amountBaseUnits: 60_000_000n },
      { signature: "sig_ord_b", orderId: "ord_b", amountBaseUnits: 40_000_000n },
    ],
    coveredAmountBaseUnits: 100_000_000n,
    newestCoveredSignature: "sig_ord_a",
    depositTransactionSignature: "deposit_sig",
    okxQuoteId: "quote_1",
    okxTradeId: "trade_1",
    estimatedFiatAmountMinorUnits: 13_500n,
    actualFiatAmountMinorUnits: 13_480n,
    fiatCurrency: "CAD",
    ...overrides,
  };
}

describe("reconcileSweeps", () => {
  it("allocates expected/actual fiat proportionally per order and flags within-tolerance entries", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(makeSweep());

    const entries = await reconcileSweeps(
      { ledger },
      { from: new Date("2024-06-01T00:00:00.000Z"), to: new Date("2024-06-30T00:00:00.000Z") },
    );

    expect(entries).toHaveLength(2);

    const ordA = entries.find((entry) => entry.orderId === "ord_a");
    const ordB = entries.find((entry) => entry.orderId === "ord_b");

    // ord_a covers 60% of the sweep: 60% of 13500 = 8100, 60% of 13480 = 8088
    expect(ordA).toMatchObject({
      onChainTransactionSignature: "sig_ord_a",
      okxConversionReference: "trade_1",
      fiatCurrency: "CAD",
      expectedFiatAmountMinorUnits: 8_100n,
      actualFiatAmountMinorUnits: 8_088n,
      discrepancyMinorUnits: -12n,
      withinTolerance: true,
    });

    // ord_b covers 40%: 40% of 13500 = 5400, 40% of 13480 = 5392
    expect(ordB).toMatchObject({
      onChainTransactionSignature: "sig_ord_b",
      expectedFiatAmountMinorUnits: 5_400n,
      actualFiatAmountMinorUnits: 5_392n,
      discrepancyMinorUnits: -8n,
      withinTolerance: true,
    });
  });

  it("flags an order's fiat amount as outside tolerance when the discrepancy is too large", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(
      makeSweep({
        coveredTransfers: [{ signature: "sig_big_miss", orderId: "ord_big_miss", amountBaseUnits: 100_000_000n }],
        estimatedFiatAmountMinorUnits: 10_000n,
        actualFiatAmountMinorUnits: 9_000n, // 10% off — well beyond the 0.5% default tolerance
      }),
    );

    const entries = await reconcileSweeps(
      { ledger },
      { from: new Date("2024-06-01T00:00:00.000Z"), to: new Date("2024-06-30T00:00:00.000Z") },
    );

    expect(entries[0]?.withinTolerance).toBe(false);
    expect(entries[0]?.discrepancyMinorUnits).toBe(-1_000n);
  });

  it("respects a custom tolerance configuration", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(
      makeSweep({
        coveredTransfers: [{ signature: "sig_x", orderId: "ord_x", amountBaseUnits: 100_000_000n }],
        estimatedFiatAmountMinorUnits: 10_000n,
        actualFiatAmountMinorUnits: 9_000n,
      }),
    );

    const entries = await reconcileSweeps(
      { ledger, tolerance: { toleranceBps: 2_000, toleranceFloorMinorUnits: 0n } }, // 20% tolerance
      { from: new Date("2024-06-01T00:00:00.000Z"), to: new Date("2024-06-30T00:00:00.000Z") },
    );

    expect(entries[0]?.withinTolerance).toBe(true);
  });

  it("applies the absolute tolerance floor even when the relative tolerance would be zero", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(
      makeSweep({
        coveredTransfers: [{ signature: "sig_tiny", orderId: "ord_tiny", amountBaseUnits: 100n }],
        coveredAmountBaseUnits: 100n,
        estimatedFiatAmountMinorUnits: 1n,
        actualFiatAmountMinorUnits: 2n,
      }),
    );

    const entries = await reconcileSweeps(
      { ledger, tolerance: DEFAULT_RECONCILIATION_TOLERANCE },
      { from: new Date("2024-06-01T00:00:00.000Z"), to: new Date("2024-06-30T00:00:00.000Z") },
    );

    // 0.5% of 1 cent truncates to 0, but the 1-cent floor still allows this 1-cent discrepancy.
    expect(entries[0]?.withinTolerance).toBe(true);
  });

  it("excludes sweeps outside the requested date range", async () => {
    const ledger = createInMemorySweepLedger();
    await ledger.record(makeSweep({ initiatedAt: "2024-01-01T00:00:00.000Z" }));

    const entries = await reconcileSweeps(
      { ledger },
      { from: new Date("2024-06-01T00:00:00.000Z"), to: new Date("2024-06-30T00:00:00.000Z") },
    );

    expect(entries).toEqual([]);
  });
});
