#!/usr/bin/env node
/**
 * Live OKX Demo Trading check ("Check: manually verify three matched
 * records against OKX's dashboard").
 *
 * Runs three real Convert (USDC/USDT -> CAD) trades against OKX's Demo
 * Trading API using real signing/HTTP code from this package, then prints
 * each trade's quoteId/tradeId/fill amounts so you can open OKX's dashboard
 * (Demo Trading mode) and cross-check them by hand.
 *
 * Demo Trading does NOT support deposits/withdrawals, so this intentionally
 * skips the on-chain deposit leg of a real sweep and drives the Convert
 * client directly — it exercises the exact same signed HTTP client, Convert
 * wrappers, and money/reconciliation math the real sweep uses, without
 * moving any real funds.
 *
 * Requires .env at the repo root with:
 *   OKX_API_KEY / OKX_API_SECRET / OKX_API_PASSPHRASE  (Demo Trading keys —
 *     created under Trade -> Demo Trading -> Personal Center -> Demo
 *     Trading API in the OKX dashboard)
 *   OKX_API_DEMO=true
 *
 * Optional:
 *   OKX_DEMO_CONVERT_BASE_CCY (default "USDT" — whatever your demo seed
 *     balance actually holds; check the printed balances if unsure)
 *
 * Run after `pnpm build`:
 *   node --env-file=../../.env scripts/okx-demo-live-check.mjs
 */
import {
  createInMemorySweepLedger,
  createOkxHttpClient,
  decimalStringToMinorUnits,
  estimateOkxConvertQuote,
  executeOkxConvertTrade,
  getOkxFundingBalances,
  loadOkxTradingCredentials,
  multiplyDecimalStrings,
  reconcileSweeps,
} from "../dist/index.js";

const FIAT_CURRENCY = "CAD";
const CONVERT_SIZES = ["10", "15", "20"]; // three distinct records to check by hand

async function main() {
  const credentials = loadOkxTradingCredentials();
  if (!credentials.isDemo) {
    throw new Error(
      "OKX_API_DEMO is not set to true — refusing to run this script against a non-demo OKX key. " +
        "Set OKX_API_DEMO=true and use Demo Trading API keys before running this check.",
    );
  }
  const baseCcy = process.env.OKX_DEMO_CONVERT_BASE_CCY || "USDT";

  const client = createOkxHttpClient(credentials);

  console.log(`[okx-demo-check] using base URL: ${credentials.baseUrl} (demo=${credentials.isDemo})`);
  console.log("[okx-demo-check] fetching funding balances...");
  const balances = await getOkxFundingBalances(client);
  console.log(
    "[okx-demo-check] funding balances:",
    balances.length ? balances : "(empty — demo balance may live in the trading account instead)",
  );

  const ledger = createInMemorySweepLedger();
  const records = [];

  for (const [index, rfqSz] of CONVERT_SIZES.entries()) {
    console.log(`\n[okx-demo-check] --- record ${index + 1}/3: converting ${rfqSz} ${baseCcy} -> ${FIAT_CURRENCY} ---`);

    const quote = await estimateOkxConvertQuote(client, {
      baseCcy,
      quoteCcy: FIAT_CURRENCY,
      rfqSz,
      rfqSzCcy: baseCcy,
      clQReqId: `demo-check-${Date.now()}-${index}`,
    });
    console.log(`[okx-demo-check] quote:  quoteId=${quote.quoteId} cnvtPx=${quote.cnvtPx}`);

    const trade = await executeOkxConvertTrade(client, {
      quoteId: quote.quoteId,
      baseCcy,
      quoteCcy: FIAT_CURRENCY,
      sz: rfqSz,
      szCcy: baseCcy,
      clTReqId: `demo-check-${Date.now()}-${index}`,
    });
    console.log(
      `[okx-demo-check] trade:  tradeId=${trade.tradeId} state=${trade.state} ` +
        `fillBaseSz=${trade.fillBaseSz} fillQuoteSz=${trade.fillQuoteSz}`,
    );

    records.push({ orderId: `demo-order-${index + 1}`, quote, trade, rfqSz });

    // A synthetic sweep record standing in for a real one — orderId/signatures
    // here are placeholders (demo mode has no real inbound transfers), but
    // okxTradeId/estimatedFiatAmountMinorUnits/actualFiatAmountMinorUnits are
    // real numbers straight from OKX's response.
    await ledger.record({
      sweepId: `demo-sweep-${index + 1}`,
      initiatedAt: new Date().toISOString(),
      coveredTransfers: [
        {
          signature: `demo-placeholder-signature-${index + 1}`,
          orderId: `demo-order-${index + 1}`,
          amountBaseUnits: BigInt(Math.round(Number(rfqSz) * 1_000_000)),
        },
      ],
      coveredAmountBaseUnits: BigInt(Math.round(Number(rfqSz) * 1_000_000)),
      newestCoveredSignature: `demo-placeholder-signature-${index + 1}`,
      depositTransactionSignature: "demo-placeholder-deposit-signature",
      okxQuoteId: quote.quoteId,
      okxTradeId: trade.tradeId,
      estimatedFiatAmountMinorUnits: decimalStringToMinorUnits(
        multiplyDecimalStrings(rfqSz, quote.cnvtPx),
        2,
      ),
      actualFiatAmountMinorUnits: decimalStringToMinorUnits(trade.fillQuoteSz, 2),
      fiatCurrency: FIAT_CURRENCY,
    });
  }

  console.log("\n[okx-demo-check] running reconcileSweeps over the 3 synthetic sweep records...");
  const entries = await reconcileSweeps(
    { ledger },
    { from: new Date(Date.now() - 60_000), to: new Date(Date.now() + 60_000) },
  );
  console.log(
    JSON.stringify(
      entries,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );

  console.log("\n[okx-demo-check] === MANUAL VERIFICATION CHECKLIST ===");
  console.log(
    "Open OKX -> Trade -> Demo Trading -> Assets -> Convert -> History (or Order History,\n" +
      "filtered to Demo), and confirm each of these 3 records by tradeId:\n",
  );
  for (const record of records) {
    console.log(
      `  - tradeId ${record.trade.tradeId}: expect ${record.rfqSz} ${baseCcy} -> ` +
        `${record.trade.fillQuoteSz} ${FIAT_CURRENCY} (quoteId ${record.quote.quoteId})`,
    );
  }
  console.log(
    "\nFor each, confirm the dashboard's filled base/quote amounts match what's printed above " +
      "exactly, and that reconcileSweeps' actualFiatAmountMinorUnits above matches the dashboard's " +
      "quote-currency fill amount (in cents).",
  );
}

main().catch((error) => {
  console.error("[okx-demo-check] FAILED:", error);
  process.exitCode = 1;
});
