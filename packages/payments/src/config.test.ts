import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { loadPaymentsConfig, loadQuickNodeWebhookConfig } from "./config.js";

const walletA = Keypair.generate().publicKey.toBase58();
const walletB = Keypair.generate().publicKey.toBase58();
const mint = Keypair.generate().publicKey.toBase58();

describe("loadPaymentsConfig", () => {
  it("loads QuickNode RPC, USDC mint, and settlement wallet from env", () => {
    const config = loadPaymentsConfig({
      QUICKNODE_RPC_URL: "https://example.quiknode.pro/abc",
      USDC_MINT_ADDRESS: mint,
      ADVERTEK_SETTLEMENT_WALLET: walletA,
    });

    expect(config).toEqual({
      quicknodeRpcUrl: "https://example.quiknode.pro/abc",
      usdcMintAddress: mint,
      settlementWallet: walletA,
      usdcDecimals: 6,
    });
  });

  it("rejects missing QUICKNODE_RPC_URL", () => {
    expect(() =>
      loadPaymentsConfig({
        USDC_MINT_ADDRESS: mint,
        ADVERTEK_SETTLEMENT_WALLET: walletB,
      }),
    ).toThrow(/QUICKNODE_RPC_URL/);
  });

  it("rejects invalid mint addresses", () => {
    expect(() =>
      loadPaymentsConfig({
        QUICKNODE_RPC_URL: "https://example.quiknode.pro/abc",
        USDC_MINT_ADDRESS: "not-a-pubkey",
        ADVERTEK_SETTLEMENT_WALLET: walletA,
      }),
    ).toThrow(/USDC_MINT_ADDRESS/);
  });
});

describe("loadQuickNodeWebhookConfig", () => {
  it("loads the webhook security token from env", () => {
    const config = loadQuickNodeWebhookConfig({
      QUICKNODE_WEBHOOK_SECURITY_TOKEN: "shh-secret-token",
    });

    expect(config).toEqual({ securityToken: "shh-secret-token" });
  });

  it("rejects a missing security token", () => {
    expect(() => loadQuickNodeWebhookConfig({})).toThrow(
      /QUICKNODE_WEBHOOK_SECURITY_TOKEN/,
    );
  });

  it("rejects an empty security token", () => {
    expect(() =>
      loadQuickNodeWebhookConfig({ QUICKNODE_WEBHOOK_SECURITY_TOKEN: "" }),
    ).toThrow(/QUICKNODE_WEBHOOK_SECURITY_TOKEN/);
  });
});
