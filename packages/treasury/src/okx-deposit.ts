import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export interface BuildDepositToOkxTransactionInput {
  readonly settlementPublicKey: PublicKey;
  readonly usdcMintAddress: string;
  readonly usdcDecimals: number;
  readonly amountBaseUnits: bigint;
  /** OKX's USDC deposit wallet address on Solana (owner of the destination ATA). */
  readonly okxDepositAddress: string;
}

/** Pure transaction construction — no RPC calls, fully unit-testable. */
export function buildDepositToOkxTransaction(
  input: BuildDepositToOkxTransactionInput,
): Transaction {
  const mint = new PublicKey(input.usdcMintAddress);
  const destinationOwner = new PublicKey(input.okxDepositAddress);

  const sourceAta = getAssociatedTokenAddressSync(mint, input.settlementPublicKey);
  const destinationAta = getAssociatedTokenAddressSync(mint, destinationOwner);

  return new Transaction().add(
    // Idempotent: a no-op if OKX's deposit ATA already exists, so this never
    // fails a repeat sweep even if OKX has already initialized it.
    createAssociatedTokenAccountIdempotentInstruction(
      input.settlementPublicKey,
      destinationAta,
      destinationOwner,
      mint,
    ),
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      input.settlementPublicKey,
      input.amountBaseUnits,
      input.usdcDecimals,
    ),
  );
}

export interface DepositUsdcToOkxInput {
  readonly settlementSecretKey: Uint8Array;
  readonly usdcMintAddress: string;
  readonly usdcDecimals: number;
  readonly amountBaseUnits: bigint;
  readonly okxDepositAddress: string;
}

export interface DepositUsdcToOkxResult {
  readonly signature: string;
}

export interface SendAndConfirmFn {
  (transaction: Transaction, signers: Keypair[]): Promise<string>;
}

export interface DepositUsdcToOkxDeps {
  readonly sendAndConfirm: SendAndConfirmFn;
}

/**
 * Moves accumulated USDC from the settlement wallet on-chain into OKX's
 * funding account, ahead of the Convert (USDC -> CAD) step. This is the
 * "covered" transfer's counterpart deposit leg — a brand-new tx distinct
 * from the inbound customer-payment transactions it sweeps.
 */
export async function depositUsdcToOkx(
  deps: DepositUsdcToOkxDeps,
  input: DepositUsdcToOkxInput,
): Promise<DepositUsdcToOkxResult> {
  const settlement = Keypair.fromSecretKey(input.settlementSecretKey);
  const transaction = buildDepositToOkxTransaction({
    settlementPublicKey: settlement.publicKey,
    usdcMintAddress: input.usdcMintAddress,
    usdcDecimals: input.usdcDecimals,
    amountBaseUnits: input.amountBaseUnits,
    okxDepositAddress: input.okxDepositAddress,
  });

  const signature = await deps.sendAndConfirm(transaction, [settlement]);
  return { signature };
}

export function createDefaultSendAndConfirm(connection: Connection): SendAndConfirmFn {
  return (transaction, signers) =>
    sendAndConfirmTransaction(connection, transaction, signers, { commitment: "confirmed" });
}
