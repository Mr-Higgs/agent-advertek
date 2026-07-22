import { absBigint, allocateProportionally, maxBigint } from "./money.js";
import type { DateRange, SweepLedger } from "./sweep-ledger.js";

export interface ReconciliationTolerance {
  /** Relative tolerance in basis points of the expected amount (50 = 0.5%). */
  readonly toleranceBps: number;
  /** Absolute floor tolerance in minor units, applied even for tiny amounts. */
  readonly toleranceFloorMinorUnits: bigint;
}

export const DEFAULT_RECONCILIATION_TOLERANCE: ReconciliationTolerance = {
  toleranceBps: 50,
  toleranceFloorMinorUnits: 1n,
};

export interface ReconciliationEntry {
  readonly orderId: string;
  readonly onChainTransactionSignature: string;
  readonly okxConversionReference: string;
  readonly fiatCurrency: "CAD";
  readonly expectedFiatAmountMinorUnits: bigint;
  readonly actualFiatAmountMinorUnits: bigint;
  readonly discrepancyMinorUnits: bigint;
  readonly withinTolerance: boolean;
}

export interface ReconcileSweepsDeps {
  readonly ledger: SweepLedger;
  readonly tolerance?: ReconciliationTolerance;
}

/**
 * For every sweep initiated within `range`, matches each order it covered to
 * its on-chain transaction and OKX conversion record, and checks whether the
 * fiat amount it's allocated lands within tolerance of what the sweep's OKX
 * quote estimated for it — surfacing conversion slippage/rounding per order.
 */
export async function reconcileSweeps(
  deps: ReconcileSweepsDeps,
  range: DateRange,
): Promise<ReconciliationEntry[]> {
  const tolerance = deps.tolerance ?? DEFAULT_RECONCILIATION_TOLERANCE;
  const sweeps = await deps.ledger.listBetween(range);
  const entries: ReconciliationEntry[] = [];

  for (const sweep of sweeps) {
    if (sweep.coveredAmountBaseUnits === 0n) {
      continue;
    }

    for (const transfer of sweep.coveredTransfers) {
      const expected = allocateProportionally(
        sweep.estimatedFiatAmountMinorUnits,
        transfer.amountBaseUnits,
        sweep.coveredAmountBaseUnits,
      );
      const actual = allocateProportionally(
        sweep.actualFiatAmountMinorUnits,
        transfer.amountBaseUnits,
        sweep.coveredAmountBaseUnits,
      );
      const discrepancy = actual - expected;
      const allowedDelta = maxBigint(
        tolerance.toleranceFloorMinorUnits,
        (absBigint(expected) * BigInt(tolerance.toleranceBps)) / 10_000n,
      );

      entries.push({
        orderId: transfer.orderId,
        onChainTransactionSignature: transfer.signature,
        okxConversionReference: sweep.okxTradeId,
        fiatCurrency: sweep.fiatCurrency,
        expectedFiatAmountMinorUnits: expected,
        actualFiatAmountMinorUnits: actual,
        discrepancyMinorUnits: discrepancy,
        withinTolerance: absBigint(discrepancy) <= allowedDelta,
      });
    }
  }

  return entries;
}
