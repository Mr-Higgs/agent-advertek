import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import type { PaymentsConfig } from "./config.js";
import {
  MEMO_PROGRAM_ID,
  buildPaymentMemo,
  createUsdcPaymentRequest,
  parseOrderIdFromMemo,
} from "./payment-request.js";

const payer = Keypair.generate();
const settlement = Keypair.generate();
const mint = Keypair.generate();

const config: PaymentsConfig = {
  quicknodeRpcUrl: "https://example.quiknode.pro/devnet",
  usdcMintAddress: mint.publicKey.toBase58(),
  settlementWallet: settlement.publicKey.toBase58(),
  usdcDecimals: 6,
};

describe("createUsdcPaymentRequest", () => {
  it("builds a USDC transfer to the settlement wallet with an order memo", () => {
    const request = createUsdcPaymentRequest(
      config,
      {
        orderId: "ord_123",
        payerPublicKey: payer.publicKey.toBase58(),
        amountBaseUnits: 1_250_000n,
        memoNonce: "nonce1",
      },
    );

    expect(request.memo).toBe(buildPaymentMemo("ord_123", "nonce1"));
    expect(request.amountBaseUnits).toBe(1_250_000n);
    expect(request.settlementWallet).toBe(config.settlementWallet);
    expect(request.usdcMintAddress).toBe(config.usdcMintAddress);
    expect(request.instructions).toHaveLength(2);

    const expectedPayerAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      payer.publicKey,
    ).toBase58();
    const expectedSettlementAta = getAssociatedTokenAddressSync(
      mint.publicKey,
      settlement.publicKey,
    ).toBase58();

    expect(request.payerTokenAccount).toBe(expectedPayerAta);
    expect(request.settlementTokenAccount).toBe(expectedSettlementAta);

    const memoIx = request.instructions[1];
    expect(memoIx?.programId.equals(MEMO_PROGRAM_ID)).toBe(true);
    expect(Buffer.from(memoIx?.data ?? []).toString("utf8")).toBe(request.memo);

    const transferIx = request.instructions[0];
    expect(transferIx?.keys.some((key) => key.pubkey.equals(new PublicKey(expectedPayerAta)))).toBe(
      true,
    );
    expect(
      transferIx?.keys.some((key) =>
        key.pubkey.equals(new PublicKey(expectedSettlementAta)),
      ),
    ).toBe(true);
  });

  it("generates a unique memo nonce when one is not provided", () => {
    const first = createUsdcPaymentRequest(
      config,
      {
        orderId: "ord_abc",
        payerPublicKey: payer.publicKey.toBase58(),
        amountBaseUnits: 100n,
      },
      { createNonce: () => "aaa" },
    );
    const second = createUsdcPaymentRequest(
      config,
      {
        orderId: "ord_abc",
        payerPublicKey: payer.publicKey.toBase58(),
        amountBaseUnits: 100n,
      },
      { createNonce: () => "bbb" },
    );

    expect(first.memo).not.toBe(second.memo);
    expect(first.memo).toContain("ord_abc");
    expect(second.memo).toContain("ord_abc");
  });

  it("rejects non-positive amounts", () => {
    expect(() =>
      createUsdcPaymentRequest(config, {
        orderId: "ord_bad",
        payerPublicKey: payer.publicKey.toBase58(),
        amountBaseUnits: 0n,
      }),
    ).toThrow();
  });
});

describe("parseOrderIdFromMemo", () => {
  it("extracts the order id from a well-formed memo", () => {
    const memo = buildPaymentMemo("ord_123", "n1");
    expect(parseOrderIdFromMemo(memo)).toBe("ord_123");
  });

  it("round-trips order ids that themselves contain colons", () => {
    const memo = buildPaymentMemo("ord:with:colons", "n2");
    expect(parseOrderIdFromMemo(memo)).toBe("ord:with:colons");
  });

  it("returns undefined for memos missing the advertek prefix", () => {
    expect(parseOrderIdFromMemo("some:other:memo")).toBeUndefined();
  });

  it("returns undefined for memos missing a nonce segment", () => {
    expect(parseOrderIdFromMemo("advertek:order:ord_123")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(parseOrderIdFromMemo("")).toBeUndefined();
  });
});
