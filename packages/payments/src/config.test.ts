import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  loadPaymentsConfig,
  loadQuickNodeWebhookConfig,
  loadSettlementPublicConfig,
} from "./config.js";

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

describe("loadSettlementPublicConfig", () => {
  it("loads only the public settlement fields, with no RPC or secret key", () => {
    const config = loadSettlementPublicConfig({
      USDC_MINT_ADDRESS: mint,
      ADVERTEK_SETTLEMENT_WALLET: walletA,
      SETTLEMENT_WALLET_SECRET_KEY: "[1,2,3]",
    });

    expect(config).toEqual({
      usdcMintAddress: mint,
      settlementWallet: walletA,
      usdcDecimals: 6,
    });
  });

  it("does not require QUICKNODE_RPC_URL", () => {
    expect(() =>
      loadSettlementPublicConfig({
        USDC_MINT_ADDRESS: mint,
        ADVERTEK_SETTLEMENT_WALLET: walletB,
      }),
    ).not.toThrow();
  });

  it("rejects an invalid settlement wallet", () => {
    expect(() =>
      loadSettlementPublicConfig({
        USDC_MINT_ADDRESS: mint,
        ADVERTEK_SETTLEMENT_WALLET: "not-a-pubkey",
      }),
    ).toThrow(/ADVERTEK_SETTLEMENT_WALLET/);
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
