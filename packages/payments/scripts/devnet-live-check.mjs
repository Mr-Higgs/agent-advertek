#!/usr/bin/env node
/**
 * Live devnet payment check (see plan: "Stand up devnet payments").
 *
 * Sends a real USDC transfer (with a memo) from PAYER_SECRET_KEY to the
 * configured settlement wallet, then calls waitForUsdcPaymentConfirmation
 * with the same memo/amount and confirms it resolves at "confirmed".
 *
 * Requires .env at the repo root with QUICKNODE_RPC_URL, USDC_MINT_ADDRESS,
 * ADVERTEK_SETTLEMENT_WALLET, and PAYER_SECRET_KEY. Run after `pnpm build`.
 */
import { Connection, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  loadPaymentsConfig,
  createUsdcPaymentRequest,
  waitForUsdcPaymentConfirmation,
} from "../dist/index.js";

function loadPayerKeypair() {
  const raw = process.env.PAYER_SECRET_KEY;
  if (!raw) {
    throw new Error("PAYER_SECRET_KEY is not set in the environment");
  }
  const bytes = Uint8Array.from(JSON.parse(raw));
  return Keypair.fromSecretKey(bytes);
}

async function main() {
  const config = loadPaymentsConfig();
  const payer = loadPayerKeypair();

  const orderId = `live-check-${Date.now()}`;
  const amountBaseUnits = 1_000_000n; // 1.000000 test-USDC (6 decimals)

  const request = createUsdcPaymentRequest(config, {
    orderId,
    payerPublicKey: payer.publicKey.toBase58(),
    amountBaseUnits,
  });

  console.log(`[live-check] order:  ${orderId}`);
  console.log(`[live-check] memo:   ${request.memo}`);
  console.log(`[live-check] amount: ${amountBaseUnits} base units`);

  const connection = new Connection(config.quicknodeRpcUrl, "confirmed");
  request.transaction.feePayer = payer.publicKey;
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  request.transaction.recentBlockhash = blockhash;

  const signature = await sendAndConfirmTransaction(
    connection,
    request.transaction,
    [payer],
    { commitment: "confirmed" },
  );
  console.log(`[live-check] sent + confirmed on-chain: ${signature}`);
  void lastValidBlockHeight;

  console.log("[live-check] polling waitForUsdcPaymentConfirmation...");
  const confirmed = await waitForUsdcPaymentConfirmation(
    { config },
    {
      memo: request.memo,
      orderId,
      amountBaseUnits,
      pollTimeoutMs: 30_000,
      pollIntervalMs: 1_500,
    },
  );

  console.log("[live-check] listener confirmed payment:");
  console.log(
    JSON.stringify(
      confirmed,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );

  if (confirmed.signature !== signature) {
    throw new Error(
      `Listener matched a different signature (${confirmed.signature}) than the one sent (${signature})`,
    );
  }

  console.log("[live-check] PASS: listener picked up the live transfer.");
}

main().catch((error) => {
  console.error("[live-check] FAILED:", error);
  process.exitCode = 1;
});
