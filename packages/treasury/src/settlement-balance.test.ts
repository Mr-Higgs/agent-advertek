import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { getSettlementUsdcBalance, type TokenBalanceRpcClient } from "./settlement-balance.js";

const settlementWallet = "4Ep2ngzo6t9qAy3QgjCqmj2NhuFJ57gkYez5gJZ9AAQU";
const usdcMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("getSettlementUsdcBalance", () => {
  it("queries the settlement wallet's associated USDC token account", async () => {
    const expectedTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(usdcMintAddress),
      new PublicKey(settlementWallet),
    );
    const getTokenAccountBalance = vi.fn(() =>
      Promise.resolve({ amount: "42500000", decimals: 6 }),
    );
    const connection: TokenBalanceRpcClient = { getTokenAccountBalance };

    const balance = await getSettlementUsdcBalance({
      connection,
      settlementWallet,
      usdcMintAddress,
    });

    expect(balance).toEqual({ amountBaseUnits: 42_500_000n, decimals: 6 });
    expect(getTokenAccountBalance).toHaveBeenCalledTimes(1);
    const [calledPubkey] = getTokenAccountBalance.mock.calls[0] as [PublicKey];
    expect(calledPubkey.equals(expectedTokenAccount)).toBe(true);
  });

  it("returns a zero balance as-is rather than throwing", async () => {
    const connection: TokenBalanceRpcClient = {
      getTokenAccountBalance: () => Promise.resolve({ amount: "0", decimals: 6 }),
    };

    const balance = await getSettlementUsdcBalance({
      connection,
      settlementWallet,
      usdcMintAddress,
    });

    expect(balance.amountBaseUnits).toBe(0n);
  });
});
