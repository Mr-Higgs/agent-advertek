export interface SweepCoveredTransfer {
  readonly signature: string;
  readonly orderId: string;
  readonly amountBaseUnits: bigint;
}

export interface SweepRecord {
  readonly sweepId: string;
  /** ISO 8601 timestamp of when the sweep was initiated. */
  readonly initiatedAt: string;
  /** The on-chain customer-payment transactions this sweep accounts for. */
  readonly coveredTransfers: readonly SweepCoveredTransfer[];
  readonly coveredAmountBaseUnits: bigint;
  /** Cursor for the next sweep's incremental scan (newest signature seen this sweep). */
  readonly newestCoveredSignature: string;
  /** The on-chain transfer moving the covered USDC from the settlement wallet into OKX. */
  readonly depositTransactionSignature: string;
  readonly okxQuoteId: string;
  /** OKX's Convert trade id — the conversion reference. */
  readonly okxTradeId: string;
  readonly estimatedFiatAmountMinorUnits: bigint;
  readonly actualFiatAmountMinorUnits: bigint;
  readonly fiatCurrency: "CAD";
}

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

/** Storage seam for recorded sweeps. Swap in a durable (e.g. Postgres-backed) implementation later. */
export interface SweepLedger {
  record(sweep: SweepRecord): Promise<void>;
  listBetween(range: DateRange): Promise<SweepRecord[]>;
  getMostRecent(): Promise<SweepRecord | undefined>;
}

export function createInMemorySweepLedger(): SweepLedger {
  const sweeps: SweepRecord[] = [];

  return {
    record(sweep) {
      sweeps.push(sweep);
      return Promise.resolve();
    },
    listBetween(range) {
      const fromMs = range.from.getTime();
      const toMs = range.to.getTime();
      const matches = sweeps.filter((sweep) => {
        const initiatedMs = new Date(sweep.initiatedAt).getTime();
        return initiatedMs >= fromMs && initiatedMs <= toMs;
      });
      return Promise.resolve(matches);
    },
    getMostRecent() {
      if (sweeps.length === 0) {
        return Promise.resolve(undefined);
      }
      const mostRecent = sweeps.reduce((latest, candidate) =>
        new Date(candidate.initiatedAt).getTime() > new Date(latest.initiatedAt).getTime()
          ? candidate
          : latest,
      );
      return Promise.resolve(mostRecent);
    },
  };
}
