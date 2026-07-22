import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import {
  buildDepositToOkxTransaction,
  depositUsdcToOkx,
  type SendAndConfirmFn,
} from "./okx-deposit.js";

const settlement = Keypair.generate();
const mint = Keypair.generate();
const okxWallet = Keypair.generate();

describe("buildDepositToOkxTransaction", () => {
  it("builds an idempotent-create-ATA instruction followed by a transferChecked instruction", () => {
    const transaction = buildDepositToOkxTransaction({
      settlementPublicKey: settlement.publicKey,
      usdcMintAddress: mint.publicKey.toBase58(),
      usdcDecimals: 6,
      amountBaseUnits: 42_000_000n,
      okxDepositAddress: okxWallet.publicKey.toBase58(),
    });

    expect(transaction.instructions).toHaveLength(2);

    const [createAtaIx, transferIx] = transaction.instructions;
    // createAssociatedTokenAccountIdempotentInstruction
    expect(createAtaIx?.keys[0]?.pubkey.equals(settlement.publicKey)).toBe(true);

    const destinationAta = getAssociatedTokenAddressSync(mint.publicKey, okxWallet.publicKey);
    const sourceAta = getAssociatedTokenAddressSync(mint.publicKey, settlement.publicKey);

    // transferCheckedInstruction: [source, mint, destination, owner]
    expect(transferIx?.keys[0]?.pubkey.equals(sourceAta)).toBe(true);
    expect(transferIx?.keys[1]?.pubkey.equals(mint.publicKey)).toBe(true);
    expect(transferIx?.keys[2]?.pubkey.equals(destinationAta)).toBe(true);
    expect(transferIx?.keys[3]?.pubkey.equals(settlement.publicKey)).toBe(true);

    // amount (u64) + decimals encoded in the last 9 bytes of the instruction data.
    const data = transferIx?.data;
    expect(data).toBeDefined();
    if (data) {
      const amount = data.readBigUInt64LE(1);
      const decimals = data.readUInt8(9);
      expect(amount).toBe(42_000_000n);
      expect(decimals).toBe(6);
    }
  });
});

describe("depositUsdcToOkx", () => {
  it("signs with the settlement keypair and sends the built transaction", async () => {
    const sendAndConfirm: SendAndConfirmFn = vi.fn(() => Promise.resolve("deposit_sig_abc"));

    const result = await depositUsdcToOkx(
      { sendAndConfirm },
      {
        settlementSecretKey: settlement.secretKey,
        usdcMintAddress: mint.publicKey.toBase58(),
        usdcDecimals: 6,
        amountBaseUnits: 10_000_000n,
        okxDepositAddress: okxWallet.publicKey.toBase58(),
      },
    );

    expect(result).toEqual({ signature: "deposit_sig_abc" });
    expect(sendAndConfirm).toHaveBeenCalledTimes(1);

    const call = (sendAndConfirm as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { instructions: unknown[] },
      Keypair[],
    ];
    const [transaction, signers] = call;
    expect(transaction.instructions).toHaveLength(2);
    expect(signers).toHaveLength(1);
    expect(signers[0]?.publicKey.equals(settlement.publicKey)).toBe(true);
  });

  it("propagates errors from the underlying send without swallowing them", async () => {
    const error = new Error("blockhash not found");
    const sendAndConfirm: SendAndConfirmFn = vi.fn(() => Promise.reject(error));

    await expect(
      depositUsdcToOkx(
        { sendAndConfirm },
        {
          settlementSecretKey: settlement.secretKey,
          usdcMintAddress: mint.publicKey.toBase58(),
          usdcDecimals: 6,
          amountBaseUnits: 10_000_000n,
          okxDepositAddress: okxWallet.publicKey.toBase58(),
        },
      ),
    ).rejects.toBe(error);
  });
});

