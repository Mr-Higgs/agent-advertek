import { MEMO_PROGRAM_ID, buildPaymentMemo } from "@advertek/payments";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { listInboundUsdcTransfers, type TreasurySolanaRpcClient } from "./inbound-transfers.js";

const settlement = Keypair.generate();
const mint = Keypair.generate();
const settlementWallet = settlement.publicKey.toBase58();
const usdcMintAddress = mint.publicKey.toBase58();
const settlementAta = getAssociatedTokenAddressSync(mint.publicKey, settlement.publicKey).toBase58();

function transferTx(args: {
  slot: number;
  blockTime: number | null;
  amountBaseUnits: bigint;
  memo?: string;
  destination?: string;
  mintAddress?: string;
}): ParsedTransactionWithMeta {
  const instructions: unknown[] = [
    {
      program: "spl-token",
      programId: PublicKey.default,
      parsed: {
        type: "transferChecked",
        info: {
          destination: args.destination ?? settlementAta,
          mint: args.mintAddress ?? usdcMintAddress,
          tokenAmount: { amount: args.amountBaseUnits.toString() },
        },
      },
    },
  ];
  if (args.memo !== undefined) {
    instructions.push({
      program: "spl-memo",
      programId: MEMO_PROGRAM_ID,
      parsed: args.memo,
    });
  }

  return {
    slot: args.slot,
    blockTime: args.blockTime,
    transaction: {
      signatures: ["sig"],
      message: {
        accountKeys: [],
        recentBlockhash: "hash",
        instructions,
      },
    },
    meta: {
      err: null,
      fee: 5000,
      preBalances: [],
      postBalances: [],
      logMessages: [],
    },
  } as unknown as ParsedTransactionWithMeta;
}

describe("listInboundUsdcTransfers", () => {
  it("returns memo-tagged inbound transfers with parsed order ids", async () => {
    const memo = buildPaymentMemo("ord_1", "n1");
    const getSignaturesForAddress = vi.fn(() =>
      Promise.resolve([{ signature: "sig_a", slot: 10, err: null } as never]),
    );
    const getParsedTransaction = vi.fn(() =>
      Promise.resolve(
        transferTx({ slot: 10, blockTime: 1_700_000_000, amountBaseUnits: 1_000_000n, memo }),
      ),
    );
    const connection: TreasurySolanaRpcClient = { getSignaturesForAddress, getParsedTransaction };

    const { transfers, newestSignatureScanned } = await listInboundUsdcTransfers({
      connection,
      settlementWallet,
      usdcMintAddress,
    });

    expect(transfers).toEqual([
      {
        signature: "sig_a",
        slot: 10,
        blockTime: 1_700_000_000,
        memo,
        orderId: "ord_1",
        amountBaseUnits: 1_000_000n,
      },
    ]);
    expect(newestSignatureScanned).toBe("sig_a");
  });

  it("leaves orderId undefined for transfers without a well-formed advertek memo", async () => {
    const getSignaturesForAddress = vi.fn(() =>
      Promise.resolve([{ signature: "sig_b", slot: 11, err: null } as never]),
    );
    const getParsedTransaction = vi.fn(() =>
      Promise.resolve(
        transferTx({
          slot: 11,
          blockTime: 1_700_000_100,
          amountBaseUnits: 2_000_000n,
          memo: "not-an-advertek-memo",
        }),
      ),
    );
    const connection: TreasurySolanaRpcClient = { getSignaturesForAddress, getParsedTransaction };

    const { transfers } = await listInboundUsdcTransfers({
      connection,
      settlementWallet,
      usdcMintAddress,
    });

    expect(transfers[0]?.orderId).toBeUndefined();
    expect(transfers[0]?.memo).toBe("not-an-advertek-memo");
  });

  it("skips signatures for transactions that errored on-chain", async () => {
    const getSignaturesForAddress = vi.fn(() =>
      Promise.resolve([{ signature: "sig_failed", slot: 12, err: { InstructionError: [] } } as never]),
    );
    const getParsedTransaction = vi.fn();
    const connection: TreasurySolanaRpcClient = { getSignaturesForAddress, getParsedTransaction };

    const { transfers } = await listInboundUsdcTransfers({
      connection,
      settlementWallet,
      usdcMintAddress,
    });

    expect(transfers).toEqual([]);
    expect(getParsedTransaction).not.toHaveBeenCalled();
  });

  it("skips transactions with no recognizable transfer into the settlement ATA", async () => {
    const getSignaturesForAddress = vi.fn(() =>
      Promise.resolve([{ signature: "sig_unrelated", slot: 13, err: null } as never]),
    );
    const getParsedTransaction = vi.fn(() =>
      Promise.resolve(
        transferTx({
          slot: 13,
          blockTime: 1_700_000_200,
          amountBaseUnits: 1_000_000n,
          destination: "SomeOtherAccountNotOurs",
        }),
      ),
    );
    const connection: TreasurySolanaRpcClient = { getSignaturesForAddress, getParsedTransaction };

    const { transfers } = await listInboundUsdcTransfers({
      connection,
      settlementWallet,
      usdcMintAddress,
    });

    expect(transfers).toEqual([]);
  });

  it("skips transfers of a different mint", async () => {
    const otherMint = Keypair.generate().publicKey.toBase58();
    const getSignaturesForAddress = vi.fn(() =>
      Promise.resolve([{ signature: "sig_other_mint", slot: 14, err: null } as never]),
    );
    const getParsedTransaction = vi.fn(() =>
      Promise.resolve(
        transferTx({
          slot: 14,
          blockTime: 1_700_000_300,
          amountBaseUnits: 1_000_000n,
          mintAddress: otherMint,
        }),
      ),
    );
    const connection: TreasurySolanaRpcClient = { getSignaturesForAddress, getParsedTransaction };

    const { transfers } = await listInboundUsdcTransfers({
      connection,
      settlementWallet,
      usdcMintAddress,
    });

    expect(transfers).toEqual([]);
  });

  it("passes the untilSignature cursor through to getSignaturesForAddress for incremental scans", async () => {
    const getSignaturesForAddress = vi.fn(() => Promise.resolve([]));
    const connection: TreasurySolanaRpcClient = {
      getSignaturesForAddress,
      getParsedTransaction: vi.fn(),
    };

    await listInboundUsdcTransfers(
      { connection, settlementWallet, usdcMintAddress },
      { untilSignature: "sig_previous_cursor" },
    );

    expect(getSignaturesForAddress).toHaveBeenCalledWith(
      expect.any(PublicKey),
      { limit: 1000, until: "sig_previous_cursor" },
      "confirmed",
    );
  });
});
