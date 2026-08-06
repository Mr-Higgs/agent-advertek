import type { DateRange, SweepLedger, SweepRecord } from "@advertek/treasury";
import type { SqlExecutor } from "./executor.js";

interface SweepRow {
  readonly sweep_id: string;
  readonly initiated_at: Date;
  readonly covered_amount_base_units: string;
  readonly newest_covered_signature: string;
  readonly deposit_transaction_signature: string;
  readonly okx_quote_id: string;
  readonly okx_trade_id: string;
  readonly estimated_fiat_amount_minor_units: string;
  readonly actual_fiat_amount_minor_units: string;
  readonly fiat_currency: string;
}

interface SweepTransferRow {
  readonly sweep_id: string;
  readonly signature: string;
  readonly order_id: string;
  readonly amount_base_units: string;
}

const SWEEP_COLUMNS = `sweep_id, initiated_at, covered_amount_base_units,
  newest_covered_signature, deposit_transaction_signature, okx_quote_id,
  okx_trade_id, estimated_fiat_amount_minor_units,
  actual_fiat_amount_minor_units, fiat_currency`;

async function loadTransfers(
  executor: SqlExecutor,
  sweepIds: readonly string[],
): Promise<readonly SweepTransferRow[]> {
  if (sweepIds.length === 0) {
    return [];
  }
  return executor.query<SweepTransferRow>(
    `SELECT sweep_id, signature, order_id, amount_base_units
     FROM sweep_covered_transfers
     WHERE sweep_id = ANY($1)
     ORDER BY signature`,
    [sweepIds],
  );
}

function toSweepRecord(
  row: SweepRow,
  transfers: readonly SweepTransferRow[],
): SweepRecord {
  return {
    sweepId: row.sweep_id,
    initiatedAt: row.initiated_at.toISOString(),
    coveredTransfers: transfers
      .filter((transfer) => transfer.sweep_id === row.sweep_id)
      .map((transfer) => ({
        signature: transfer.signature,
        orderId: transfer.order_id,
        amountBaseUnits: BigInt(transfer.amount_base_units),
      })),
    coveredAmountBaseUnits: BigInt(row.covered_amount_base_units),
    newestCoveredSignature: row.newest_covered_signature,
    depositTransactionSignature: row.deposit_transaction_signature,
    okxQuoteId: row.okx_quote_id,
    okxTradeId: row.okx_trade_id,
    estimatedFiatAmountMinorUnits: BigInt(row.estimated_fiat_amount_minor_units),
    actualFiatAmountMinorUnits: BigInt(row.actual_fiat_amount_minor_units),
    fiatCurrency: "CAD",
  };
}

/**
 * Postgres-backed `SweepLedger` — the durable replacement for
 * `@advertek/treasury`'s in-memory ledger. Amounts cross the SQL boundary as
 * base-10 strings into `numeric(78, 0)` columns, never floats.
 */
export function createPostgresSweepLedger(executor: SqlExecutor): SweepLedger {
  return {
    async record(sweep) {
      await executor.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO sweeps (${SWEEP_COLUMNS})
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            sweep.sweepId,
            sweep.initiatedAt,
            sweep.coveredAmountBaseUnits.toString(),
            sweep.newestCoveredSignature,
            sweep.depositTransactionSignature,
            sweep.okxQuoteId,
            sweep.okxTradeId,
            sweep.estimatedFiatAmountMinorUnits.toString(),
            sweep.actualFiatAmountMinorUnits.toString(),
            sweep.fiatCurrency,
          ],
        );
        for (const transfer of sweep.coveredTransfers) {
          await tx.query(
            `INSERT INTO sweep_covered_transfers (sweep_id, signature, order_id, amount_base_units)
             VALUES ($1, $2, $3, $4)`,
            [
              sweep.sweepId,
              transfer.signature,
              transfer.orderId,
              transfer.amountBaseUnits.toString(),
            ],
          );
        }
      });
    },

    async listBetween(range: DateRange) {
      const rows = await executor.query<SweepRow>(
        `SELECT ${SWEEP_COLUMNS} FROM sweeps
         WHERE initiated_at >= $1 AND initiated_at <= $2
         ORDER BY initiated_at ASC`,
        [range.from, range.to],
      );
      const transfers = await loadTransfers(
        executor,
        rows.map((row) => row.sweep_id),
      );
      return rows.map((row) => toSweepRecord(row, transfers));
    },

    async getMostRecent() {
      const rows = await executor.query<SweepRow>(
        `SELECT ${SWEEP_COLUMNS} FROM sweeps
         ORDER BY initiated_at DESC
         LIMIT 1`,
      );
      const row = rows[0];
      if (!row) {
        return undefined;
      }
      const transfers = await loadTransfers(executor, [row.sweep_id]);
      return toSweepRecord(row, transfers);
    },
  };
}
