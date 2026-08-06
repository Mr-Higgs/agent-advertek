import type { SweepRecord } from "@advertek/treasury";
import { describe, expect, it } from "vitest";
import { createPostgresSweepLedger } from "./sweep-ledger.js";
import { createFakeExecutor } from "./test-utils.js";

function sweepFixture(): SweepRecord {
  return {
    sweepId: "sweep_1",
    initiatedAt: "2026-08-05T12:00:00.000Z",
    coveredTransfers: [
      { signature: "sig_a", orderId: "ord_1", amountBaseUnits: 730_000n },
      { signature: "sig_b", orderId: "ord_2", amountBaseUnits: 1_460_000n },
    ],
    coveredAmountBaseUnits: 2_190_000n,
    newestCoveredSignature: "sig_b",
    depositTransactionSignature: "dep_1",
    okxQuoteId: "quote_1",
    okxTradeId: "trade_1",
    estimatedFiatAmountMinorUnits: 2_200n,
    actualFiatAmountMinorUnits: 2_195n,
    fiatCurrency: "CAD",
  };
}

describe("createPostgresSweepLedger.record", () => {
  it("inserts the sweep and its covered transfers in one transaction, amounts as strings", async () => {
    const executor = createFakeExecutor();
    const ledger = createPostgresSweepLedger(executor);

    await ledger.record(sweepFixture());

    expect(executor.queries).toHaveLength(3);
    const [sweepInsert, transferA, transferB] = executor.queries;
    expect(sweepInsert?.text).toContain("INSERT INTO sweeps");
    expect(sweepInsert?.params).toEqual([
      "sweep_1",
      "2026-08-05T12:00:00.000Z",
      "2190000",
      "sig_b",
      "dep_1",
      "quote_1",
      "trade_1",
      "2200",
      "2195",
      "CAD",
    ]);
    expect(transferA?.params).toEqual(["sweep_1", "sig_a", "ord_1", "730000"]);
    expect(transferB?.params).toEqual(["sweep_1", "sig_b", "ord_2", "1460000"]);
  });
});

describe("createPostgresSweepLedger reads", () => {
  const sweepRow = {
    sweep_id: "sweep_1",
    initiated_at: new Date("2026-08-05T12:00:00.000Z"),
    covered_amount_base_units: "2190000",
    newest_covered_signature: "sig_b",
    deposit_transaction_signature: "dep_1",
    okx_quote_id: "quote_1",
    okx_trade_id: "trade_1",
    estimated_fiat_amount_minor_units: "2200",
    actual_fiat_amount_minor_units: "2195",
    fiat_currency: "CAD",
  };
  const transferRows = [
    { sweep_id: "sweep_1", signature: "sig_a", order_id: "ord_1", amount_base_units: "730000" },
    { sweep_id: "sweep_1", signature: "sig_b", order_id: "ord_2", amount_base_units: "1460000" },
  ];

  it("getMostRecent returns undefined when the ledger is empty", async () => {
    const executor = createFakeExecutor(() => []);
    const ledger = createPostgresSweepLedger(executor);

    await expect(ledger.getMostRecent()).resolves.toBeUndefined();
  });

  it("getMostRecent maps the newest sweep row and its transfers back to bigints", async () => {
    const executor = createFakeExecutor((text) =>
      text.includes("FROM sweeps") ? [sweepRow] : transferRows,
    );
    const ledger = createPostgresSweepLedger(executor);

    const record = await ledger.getMostRecent();

    expect(record).toEqual(sweepFixture());
    expect(record?.coveredAmountBaseUnits).toBe(2_190_000n);
  });

  it("listBetween filters by range and groups transfers per sweep", async () => {
    const executor = createFakeExecutor((text, params) => {
      if (text.includes("FROM sweeps")) {
        expect(params[0]).toBeInstanceOf(Date);
        return [sweepRow];
      }
      expect(params[0]).toEqual(["sweep_1"]);
      return transferRows;
    });
    const ledger = createPostgresSweepLedger(executor);

    const records = await ledger.listBetween({
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-06T00:00:00.000Z"),
    });

    expect(records).toEqual([sweepFixture()]);
  });
});
