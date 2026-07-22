import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  Connection,
  type ConfirmedSignatureInfo,
  type Finality,
  type ParsedTransactionWithMeta,
  PublicKey,
} from "@solana/web3.js";
import { z } from "zod";
import type { PaymentsConfig } from "./config.js";
import { MEMO_PROGRAM_ID } from "./payment-request.js";
import {
  RpcRetryExhaustedError,
  withRpcRetry,
  type RetryOptions,
} from "./rpc-retry.js";

export const waitForPaymentInputSchema = z.object({
  memo: z.string().min(1),
  orderId: z.string().min(1),
  amountBaseUnits: z.bigint().positive(),
  /** Max wall-clock time to wait for a matching confirmed payment. */
  pollTimeoutMs: z.number().int().positive().default(60_000),
  /** Delay between poll cycles after a miss. */
  pollIntervalMs: z.number().int().positive().default(2_000),
});

export type WaitForPaymentInput = z.input<typeof waitForPaymentInputSchema>;

export interface ConfirmedUsdcPayment {
  readonly orderId: string;
  readonly memo: string;
  readonly signature: string;
  readonly amountBaseUnits: bigint;
  readonly slot: number;
  readonly commitment: "confirmed";
}

export interface SolanaRpcClient {
  getSignaturesForAddress(
    address: PublicKey,
    options?: { limit?: number },
    commitment?: Finality,
  ): Promise<ConfirmedSignatureInfo[]>;
  getParsedTransaction(
    signature: string,
    options: {
      commitment: Finality;
      maxSupportedTransactionVersion: number;
    },
  ): Promise<ParsedTransactionWithMeta | null>;
}

export type CreateConnection = (rpcUrl: string) => SolanaRpcClient;

export function createQuickNodeConnection(config: PaymentsConfig): Connection {
  return new Connection(config.quicknodeRpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 30_000,
  });
}

export interface WaitForUsdcPaymentDeps {
  readonly config: PaymentsConfig;
  readonly connection?: SolanaRpcClient;
  readonly createConnection?: CreateConnection;
  readonly rpcRetry?: Partial<RetryOptions>;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly signal?: AbortSignal;
}

export class PaymentConfirmationTimeoutError extends Error {
  override readonly name = "PaymentConfirmationTimeoutError";
}

/**
 * Polls QuickNode until a confirmed USDC payment to the settlement wallet
 * includes the expected memo (order id). Resolves only at "confirmed".
 */
export async function waitForUsdcPaymentConfirmation(
  deps: WaitForUsdcPaymentDeps,
  input: WaitForPaymentInput,
): Promise<ConfirmedUsdcPayment> {
  const parsed = waitForPaymentInputSchema.parse(input);
  const connection =
    deps.connection ??
    (deps.createConnection ?? defaultCreateConnection)(
      deps.config.quicknodeRpcUrl,
    );

  const settlement = new PublicKey(deps.config.settlementWallet);
  const settlementTokenAccountPubkey = getAssociatedTokenAddressSync(
    new PublicKey(deps.config.usdcMintAddress),
    settlement,
  );
  const settlementTokenAccount = settlementTokenAccountPubkey.toBase58();

  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? Date.now;
  const deadline = now() + parsed.pollTimeoutMs;

  const retry: RetryOptions = {
    maxAttempts: deps.rpcRetry?.maxAttempts ?? 3,
    timeoutMs: deps.rpcRetry?.timeoutMs ?? 10_000,
    initialDelayMs: deps.rpcRetry?.initialDelayMs ?? 250,
    maxDelayMs: deps.rpcRetry?.maxDelayMs ?? 2_000,
    sleep,
    now,
    ...(deps.signal ? { signal: deps.signal } : {}),
  };

  while (now() < deadline) {
    if (deps.signal?.aborted) {
      throw new Error("Payment confirmation aborted");
    }

    const match = await findConfirmedPaymentForMemo({
      connection,
      settlementTokenAccountPubkey,
      settlementTokenAccount,
      memo: parsed.memo,
      amountBaseUnits: parsed.amountBaseUnits,
      usdcMintAddress: deps.config.usdcMintAddress,
      retry,
    });

    if (match) {
      return {
        orderId: parsed.orderId,
        memo: parsed.memo,
        signature: match.signature,
        amountBaseUnits: parsed.amountBaseUnits,
        slot: match.slot,
        commitment: "confirmed",
      };
    }

    const remaining = deadline - now();
    if (remaining <= 0) {
      break;
    }
    await sleep(Math.min(parsed.pollIntervalMs, remaining));
  }

  throw new PaymentConfirmationTimeoutError(
    `Timed out waiting for confirmed USDC payment with memo ${parsed.memo}`,
  );
}

async function findConfirmedPaymentForMemo(args: {
  readonly connection: SolanaRpcClient;
  readonly settlementTokenAccountPubkey: PublicKey;
  readonly settlementTokenAccount: string;
  readonly memo: string;
  readonly amountBaseUnits: bigint;
  readonly usdcMintAddress: string;
  readonly retry: RetryOptions;
}): Promise<{ signature: string; slot: number } | undefined> {
  // Query by the settlement's *token account*, not the settlement wallet
  // pubkey: a transferChecked instruction references the destination token
  // account directly, and the wallet's own address never appears in the
  // transaction's account list.
  const signatures = await withRpcRetry(
    "getSignaturesForAddress",
    async () =>
      args.connection.getSignaturesForAddress(
        args.settlementTokenAccountPubkey,
        { limit: 25 },
        "confirmed",
      ),
    args.retry,
  );

  for (const info of signatures) {
    if (info.err) {
      continue;
    }

    let tx: ParsedTransactionWithMeta | null;
    try {
      tx = await withRpcRetry(
        "getParsedTransaction",
        async () =>
          args.connection.getParsedTransaction(info.signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          }),
        args.retry,
      );
    } catch (error) {
      if (error instanceof RpcRetryExhaustedError) {
        continue;
      }
      throw error;
    }

    if (!tx || tx.meta?.err) {
      continue;
    }

    if (!parsedTransactionContainsMemo(tx, args.memo)) {
      continue;
    }

    const transferCheck = inspectUsdcTransfer(tx, {
      settlementTokenAccount: args.settlementTokenAccount,
      amountBaseUnits: args.amountBaseUnits,
      usdcMintAddress: args.usdcMintAddress,
    });

    if (transferCheck === "mismatch") {
      continue;
    }

    return { signature: info.signature, slot: tx.slot };
  }

  return undefined;
}

export function parsedTransactionContainsMemo(
  tx: ParsedTransactionWithMeta,
  memo: string,
): boolean {
  const logs = tx.meta?.logMessages ?? [];
  if (logs.some((line) => line.includes(memo))) {
    return true;
  }

  for (const ix of tx.transaction.message.instructions) {
    if ("parsed" in ix) {
      if (
        ix.program === "spl-memo" ||
        ix.programId.equals(MEMO_PROGRAM_ID)
      ) {
        if (typeof ix.parsed === "string" && ix.parsed === memo) {
          return true;
        }
      }
      continue;
    }

    if (ix.programId.equals(MEMO_PROGRAM_ID)) {
      try {
        const decoded = Buffer.from(ix.data, "base64").toString("utf8");
        if (decoded === memo) {
          return true;
        }
      } catch {
        if (ix.data === memo) {
          return true;
        }
      }
    }
  }

  return false;
}

type TransferCheck = "match" | "mismatch" | "unknown";

function inspectUsdcTransfer(
  tx: ParsedTransactionWithMeta,
  args: {
    readonly settlementTokenAccount: string;
    readonly amountBaseUnits: bigint;
    readonly usdcMintAddress: string;
  },
): TransferCheck {
  let sawParsableTransfer = false;

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

    sawParsableTransfer = true;
    const destination = parsed.info?.destination;
    const amountRaw =
      parsed.info?.tokenAmount?.amount ?? parsed.info?.amount ?? undefined;
    const mint = parsed.info?.mint;

    if (destination !== args.settlementTokenAccount) {
      continue;
    }
    if (mint !== undefined && mint !== args.usdcMintAddress) {
      return "mismatch";
    }
    if (amountRaw === undefined) {
      return "unknown";
    }

    try {
      return BigInt(amountRaw) === args.amountBaseUnits ? "match" : "mismatch";
    } catch {
      return "mismatch";
    }
  }

  return sawParsableTransfer ? "mismatch" : "unknown";
}

function defaultCreateConnection(rpcUrl: string): SolanaRpcClient {
  const connection = new Connection(rpcUrl, "confirmed");
  return {
    getSignaturesForAddress: (address, options, commitment) =>
      connection.getSignaturesForAddress(address, options, commitment),
    getParsedTransaction: (signature, options) =>
      connection.getParsedTransaction(signature, options),
  };
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
