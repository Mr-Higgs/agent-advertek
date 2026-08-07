import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { z } from "zod";
import type { SettlementPublicConfig } from "./config.js";

/** Solana Memo program (shared mainnet/devnet). */
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export const paymentRequestInputSchema = z.object({
  orderId: z.string().min(1),
  payerPublicKey: z
    .string()
    .min(32)
    .max(44)
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/),
  amountBaseUnits: z.bigint().positive(),
  /** Optional uniqueness salt; generated when omitted. */
  memoNonce: z.string().min(1).optional(),
});

export type PaymentRequestInput = z.infer<typeof paymentRequestInputSchema>;

export interface UsdcPaymentRequest {
  readonly orderId: string;
  readonly memo: string;
  readonly amountBaseUnits: bigint;
  readonly usdcMintAddress: string;
  readonly settlementWallet: string;
  readonly payerPublicKey: string;
  readonly payerTokenAccount: string;
  readonly settlementTokenAccount: string;
  readonly transaction: Transaction;
  readonly instructions: readonly TransactionInstruction[];
}

const MEMO_PREFIX = "advertek:order:";

export function buildPaymentMemo(
  orderId: string,
  memoNonce: string,
): string {
  return `${MEMO_PREFIX}${orderId}:${memoNonce}`;
}

/**
 * Inverse of {@link buildPaymentMemo}: extracts the order id from a memo of
 * the form `advertek:order:{orderId}:{nonce}`. Used to look up which order a
 * confirmed on-chain transfer or webhook delivery belongs to. Returns
 * `undefined` for memos that don't match the expected format.
 */
export function parseOrderIdFromMemo(memo: string): string | undefined {
  if (!memo.startsWith(MEMO_PREFIX)) {
    return undefined;
  }
  const rest = memo.slice(MEMO_PREFIX.length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) {
    return undefined;
  }
  const orderId = rest.slice(0, lastColon);
  const nonce = rest.slice(lastColon + 1);
  if (orderId.length === 0 || nonce.length === 0) {
    return undefined;
  }
  return orderId;
}

export function createMemoInstruction(
  memo: string,
  signer: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8"),
  });
}

/**
 * Builds the keyless payment request an agent pays: a USDC transfer to the
 * settlement wallet plus a memo carrying the internal order id. Only needs
 * {@link SettlementPublicConfig} — no settlement secret key is ever required
 * to *request* a payment.
 */
export function createUsdcPaymentRequest(
  config: SettlementPublicConfig,
  input: PaymentRequestInput,
  options?: {
    readonly createNonce?: () => string;
  },
): UsdcPaymentRequest {
  const parsed = paymentRequestInputSchema.parse(input);
  const memoNonce = parsed.memoNonce ?? (options?.createNonce ?? defaultNonce)();
  const memo = buildPaymentMemo(parsed.orderId, memoNonce);

  const mint = new PublicKey(config.usdcMintAddress);
  const payer = new PublicKey(parsed.payerPublicKey);
  const settlement = new PublicKey(config.settlementWallet);

  const payerTokenAccount = getAssociatedTokenAddressSync(mint, payer);
  const settlementTokenAccount = getAssociatedTokenAddressSync(mint, settlement);

  const transferIx = createTransferCheckedInstruction(
    payerTokenAccount,
    mint,
    settlementTokenAccount,
    payer,
    parsed.amountBaseUnits,
    config.usdcDecimals,
  );
  const memoIx = createMemoInstruction(memo, payer);

  const instructions = [transferIx, memoIx];
  const transaction = new Transaction().add(...instructions);

  return {
    orderId: parsed.orderId,
    memo,
    amountBaseUnits: parsed.amountBaseUnits,
    usdcMintAddress: config.usdcMintAddress,
    settlementWallet: config.settlementWallet,
    payerPublicKey: parsed.payerPublicKey,
    payerTokenAccount: payerTokenAccount.toBase58(),
    settlementTokenAccount: settlementTokenAccount.toBase58(),
    transaction,
    instructions,
  };
}

function defaultNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
