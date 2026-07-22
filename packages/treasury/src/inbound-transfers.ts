import { MEMO_PROGRAM_ID, parseOrderIdFromMemo } from "@advertek/payments";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  type ConfirmedSignatureInfo,
  type Finality,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";

/** Minimal RPC surface needed to scan the settlement token account's history. */
export interface TreasurySolanaRpcClient {
  getSignaturesForAddress(
    address: PublicKey,
    options: { limit?: number; before?: string; until?: string },
    commitment?: Finality,
  ): Promise<ConfirmedSignatureInfo[]>;
  getParsedTransaction(
    signature: string,
    options: { commitment: Finality; maxSupportedTransactionVersion: number },
  ): Promise<ParsedTransactionWithMeta | null>;
}

export function createDefaultTreasurySolanaRpcClient(rpcUrl: string): TreasurySolanaRpcClient {
  const connection = new Connection(rpcUrl, "confirmed");
  return {
    getSignaturesForAddress: (address, options, commitment) =>
      connection.getSignaturesForAddress(address, options, commitment),
    getParsedTransaction: (signature, options) =>
      connection.getParsedTransaction(signature, options),
  };
}

export interface InboundUsdcTransfer {
  readonly signature: string;
  readonly slot: number;
  readonly blockTime: number | undefined;
  readonly memo: string | undefined;
  /** `undefined` when the memo doesn't match `advertek:order:{orderId}:{nonce}`. */
  readonly orderId: string | undefined;
  readonly amountBaseUnits: bigint;
}

export interface ListInboundUsdcTransfersDeps {
  readonly connection: TreasurySolanaRpcClient;
  readonly settlementWallet: string;
  readonly usdcMintAddress: string;
}

export interface ListInboundUsdcTransfersOptions {
  /** Max signatures to page through per call (default 1000, Solana's RPC max). */
  readonly limit?: number;
  /** Stop once this signature is reached (exclusive) — used to resume from the last swept transfer. */
  readonly untilSignature?: string;
}

export interface ListInboundUsdcTransfersResult {
  readonly transfers: readonly InboundUsdcTransfer[];
  /**
   * The single newest signature the RPC returned in this scan (regardless of
   * whether it turned out to be a qualifying transfer) — pass this as
   * `untilSignature` on the next incremental scan so nothing is skipped or
   * reprocessed, even if some newer signatures aren't USDC transfers at all.
   */
  readonly newestSignatureScanned: string | undefined;
}

/**
 * Lists confirmed incoming USDC transfers to the settlement wallet's
 * associated token account, newest first, optionally stopping at a
 * previously-seen signature (for incremental "since last sweep" scans).
 */
export async function listInboundUsdcTransfers(
  deps: ListInboundUsdcTransfersDeps,
  options: ListInboundUsdcTransfersOptions = {},
): Promise<ListInboundUsdcTransfersResult> {
  const settlementTokenAccount = getAssociatedTokenAddressSync(
    new PublicKey(deps.usdcMintAddress),
    new PublicKey(deps.settlementWallet),
  );

  const signatures = await deps.connection.getSignaturesForAddress(
    settlementTokenAccount,
    {
      limit: options.limit ?? 1000,
      ...(options.untilSignature ? { until: options.untilSignature } : {}),
    },
    "confirmed",
  );

  const transfers: InboundUsdcTransfer[] = [];
  const settlementTokenAccountBase58 = settlementTokenAccount.toBase58();

  for (const info of signatures) {
    if (info.err) {
      continue;
    }

    const tx = await deps.connection.getParsedTransaction(info.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || tx.meta?.err) {
      continue;
    }

    const amountBaseUnits = extractIncomingTransferAmount(tx, {
      settlementTokenAccount: settlementTokenAccountBase58,
      usdcMintAddress: deps.usdcMintAddress,
    });
    if (amountBaseUnits === undefined) {
      continue;
    }

    const memo = extractMemo(tx);
    transfers.push({
      signature: info.signature,
      slot: tx.slot,
      blockTime: tx.blockTime ?? undefined,
      memo,
      orderId: memo ? parseOrderIdFromMemo(memo) : undefined,
      amountBaseUnits,
    });
  }

  return { transfers, newestSignatureScanned: signatures[0]?.signature };
}

function extractIncomingTransferAmount(
  tx: ParsedTransactionWithMeta,
  args: { readonly settlementTokenAccount: string; readonly usdcMintAddress: string },
): bigint | undefined {
  for (const ix of tx.transaction.message.instructions) {
    if (!("parsed" in ix) || typeof ix.parsed !== "object" || ix.parsed === null) {
      continue;
    }
    const parsed = ix.parsed as {
      type?: string;
      info?: {
        destination?: string;
        mint?: string;
        amount?: string;
        tokenAmount?: { amount?: string };
      };
    };
    if (parsed.type !== "transfer" && parsed.type !== "transferChecked") {
      continue;
    }
    if (parsed.info?.destination !== args.settlementTokenAccount) {
      continue;
    }
    if (parsed.info.mint !== undefined && parsed.info.mint !== args.usdcMintAddress) {
      continue;
    }
    const amountRaw = parsed.info.tokenAmount?.amount ?? parsed.info.amount;
    if (amountRaw === undefined) {
      continue;
    }
    try {
      return BigInt(amountRaw);
    } catch {
      continue;
    }
  }
  return undefined;
}

function extractMemo(tx: ParsedTransactionWithMeta): string | undefined {
  for (const ix of tx.transaction.message.instructions) {
    if ("parsed" in ix) {
      if (
        (ix.program === "spl-memo" || ix.programId.equals(MEMO_PROGRAM_ID)) &&
        typeof ix.parsed === "string"
      ) {
        return ix.parsed;
      }
      continue;
    }
    if (ix.programId.equals(MEMO_PROGRAM_ID)) {
      try {
        return Buffer.from(ix.data, "base64").toString("utf8");
      } catch {
        return ix.data;
      }
    }
  }
  return undefined;
}
