import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import type { PaymentsConfig } from "./config.js";
import { MEMO_PROGRAM_ID, buildPaymentMemo } from "./payment-request.js";
import {
  PaymentConfirmationTimeoutError,
  waitForUsdcPaymentConfirmation,
  type SolanaRpcClient,
} from "./wait-for-payment.js";

const settlement = Keypair.generate();
const mint = Keypair.generate();

const config: PaymentsConfig = {
  quicknodeRpcUrl: "https://example.quiknode.pro/devnet",
  usdcMintAddress: mint.publicKey.toBase58(),
  settlementWallet: settlement.publicKey.toBase58(),
  usdcDecimals: 6,
};

const settlementAta = getAssociatedTokenAddressSync(
  mint.publicKey,
  settlement.publicKey,
).toBase58();

const memo = buildPaymentMemo("ord_99", "n1");

function matchingTx(amount: bigint = 5_000_000n): ParsedTransactionWithMeta {
  const tx = {
    slot: 42,
    transaction: {
      signatures: ["sig"],
      message: {
        accountKeys: [],
        instructions: [
          {
            program: "spl-token",
            programId: PublicKey.default,
            parsed: {
              type: "transferChecked",
              info: {
                destination: settlementAta,
                mint: mint.publicKey.toBase58(),
                tokenAmount: { amount: amount.toString() },
              },
            },
          },
          {
            program: "spl-memo",
            programId: MEMO_PROGRAM_ID,
            parsed: memo,
          },
        ],
        recentBlockhash: "hash",
      },
    },
    meta: {
      err: null,
      fee: 5000,
      preBalances: [],
      postBalances: [],
      logMessages: [`Program log: Memo: "${memo}"`],
    },
  };
  return tx;
}

describe("waitForUsdcPaymentConfirmation", () => {
  it("resolves when a confirmed transaction matches memo and amount", async () => {
    const getSignaturesForAddress = vi.fn(() =>
      Promise.resolve([
        {
          signature: "sig_confirmed_1",
          slot: 42,
          err: null,
          memo: null,
          blockTime: null,
          confirmationStatus: "confirmed",
        },
      ]),
    );
    const getParsedTransaction = vi.fn(() => Promise.resolve(matchingTx()));
    const connection: SolanaRpcClient = {
      getSignaturesForAddress,
      getParsedTransaction,
    };

    const result = await waitForUsdcPaymentConfirmation(
      {
        config,
        connection,
        sleep: () => Promise.resolve(),
        now: () => 0,
        rpcRetry: {
          maxAttempts: 1,
          timeoutMs: 1_000,
          initialDelayMs: 1,
          maxDelayMs: 1,
        },
      },
      {
        orderId: "ord_99",
        memo,
        amountBaseUnits: 5_000_000n,
        pollTimeoutMs: 1_000,
        pollIntervalMs: 1,
      },
    );

    expect(result).toEqual({
      orderId: "ord_99",
      memo,
      signature: "sig_confirmed_1",
      amountBaseUnits: 5_000_000n,
      slot: 42,
      commitment: "confirmed",
    });
    expect(getSignaturesForAddress).toHaveBeenCalledWith(
      expect.any(PublicKey),
      { limit: 25 },
      "confirmed",
    );
  });

  it("retries RPC timeouts while polling", async () => {
    const getSignaturesForAddress = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(() => {
            /* hang until timeout */
          }),
      )
      .mockResolvedValueOnce([
        {
          signature: "sig_after_retry",
          slot: 99,
          err: null,
          memo: null,
          blockTime: null,
          confirmationStatus: "confirmed",
        },
      ]);

    const connection: SolanaRpcClient = {
      getSignaturesForAddress,
      getParsedTransaction: vi.fn(() => Promise.resolve(matchingTx())),
    };

    const result = await waitForUsdcPaymentConfirmation(
      {
        config,
        connection,
        sleep: () => Promise.resolve(),
        now: () => 0,
        rpcRetry: {
          maxAttempts: 2,
          timeoutMs: 20,
          initialDelayMs: 1,
          maxDelayMs: 1,
        },
      },
      {
        orderId: "ord_99",
        memo,
        amountBaseUnits: 5_000_000n,
        pollTimeoutMs: 5_000,
        pollIntervalMs: 1,
      },
    );

    expect(result.signature).toBe("sig_after_retry");
    expect(getSignaturesForAddress.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("times out when no matching confirmed payment appears", async () => {
    let now = 0;
    const connection: SolanaRpcClient = {
      getSignaturesForAddress: vi.fn(() => Promise.resolve([])),
      getParsedTransaction: vi.fn(() => Promise.resolve(null)),
    };

    await expect(
      waitForUsdcPaymentConfirmation(
        {
          config,
          connection,
          sleep: (ms) => {
            now += ms;
            return Promise.resolve();
          },
          now: () => now,
          rpcRetry: {
            maxAttempts: 1,
            timeoutMs: 50,
            initialDelayMs: 1,
            maxDelayMs: 1,
          },
        },
        {
          orderId: "ord_99",
          memo,
          amountBaseUnits: 5_000_000n,
          pollTimeoutMs: 30,
          pollIntervalMs: 10,
        },
      ),
    ).rejects.toBeInstanceOf(PaymentConfirmationTimeoutError);
  });

  it("ignores confirmed transactions with the wrong memo", async () => {
    let now = 0;
    const connection: SolanaRpcClient = {
      getSignaturesForAddress: vi.fn(() =>
        Promise.resolve([
          {
            signature: "sig_wrong_memo",
            slot: 1,
            err: null,
            memo: null,
            blockTime: null,
            confirmationStatus: "confirmed",
          },
        ]),
      ),
      getParsedTransaction: vi.fn(() =>
        Promise.resolve({
          ...matchingTx(),
          meta: {
            err: null,
            fee: 5000,
            preBalances: [],
            postBalances: [],
            logMessages: ['Program log: Memo: "other"'],
          },
          transaction: {
            signatures: ["sig"],
            message: {
              accountKeys: [],
              recentBlockhash: "hash",
              instructions: [
                {
                  program: "spl-memo",
                  programId: MEMO_PROGRAM_ID,
                  parsed: "other",
                },
              ],
            },
          },
        } as unknown as ParsedTransactionWithMeta),
      ),
    };

    await expect(
      waitForUsdcPaymentConfirmation(
        {
          config,
          connection,
          sleep: (ms) => {
            now += ms;
            return Promise.resolve();
          },
          now: () => now,
          rpcRetry: {
            maxAttempts: 1,
            timeoutMs: 50,
            initialDelayMs: 1,
            maxDelayMs: 1,
          },
        },
        {
          orderId: "ord_99",
          memo,
          amountBaseUnits: 5_000_000n,
          pollTimeoutMs: 25,
          pollIntervalMs: 10,
        },
      ),
    ).rejects.toBeInstanceOf(PaymentConfirmationTimeoutError);
  });
});
