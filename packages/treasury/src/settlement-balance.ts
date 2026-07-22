import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

export interface TokenAccountBalance {
  readonly amount: string;
  readonly decimals: number;
}

/** Minimal RPC surface needed to read a token account's balance. */
export interface TokenBalanceRpcClient {
  getTokenAccountBalance(tokenAccount: PublicKey): Promise<TokenAccountBalance>;
}

export function createDefaultTokenBalanceRpcClient(rpcUrl: string): TokenBalanceRpcClient {
  const connection = new Connection(rpcUrl, "confirmed");
  return {
    async getTokenAccountBalance(tokenAccount) {
      const { value } = await connection.getTokenAccountBalance(tokenAccount, "confirmed");
      return { amount: value.amount, decimals: value.decimals };
    },
  };
}

export interface SettlementBalance {
  readonly amountBaseUnits: bigint;
  readonly decimals: number;
}

export interface GetSettlementUsdcBalanceDeps {
  readonly connection: TokenBalanceRpcClient;
  readonly settlementWallet: string;
  readonly usdcMintAddress: string;
}

/** Checks the USDC balance currently accumulated in Advertek's settlement wallet. */
export async function getSettlementUsdcBalance(
  deps: GetSettlementUsdcBalanceDeps,
): Promise<SettlementBalance> {
  const settlementTokenAccount = getAssociatedTokenAddressSync(
    new PublicKey(deps.usdcMintAddress),
    new PublicKey(deps.settlementWallet),
  );
  const balance = await deps.connection.getTokenAccountBalance(settlementTokenAccount);
  return { amountBaseUnits: BigInt(balance.amount), decimals: balance.decimals };
}
