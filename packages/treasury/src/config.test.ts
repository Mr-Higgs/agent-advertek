import { describe, expect, it } from "vitest";
import {
  loadOkxTradingCredentials,
  loadOkxWithdrawalCredentials,
  loadOnChainConfig,
  loadReconciliationToleranceConfig,
  loadSettlementSignerConfig,
  loadSweepScheduleConfig,
} from "./config.js";

const settlementWallet = "4Ep2ngzo6t9qAy3QgjCqmj2NhuFJ57gkYez5gJZ9AAQU";
const usdcMintAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("loadOnChainConfig", () => {
  it("loads a valid on-chain configuration", () => {
    const config = loadOnChainConfig({
      QUICKNODE_RPC_URL: "https://example.quiknode.pro/devnet",
      USDC_MINT_ADDRESS: usdcMintAddress,
      ADVERTEK_SETTLEMENT_WALLET: settlementWallet,
    });

    expect(config).toEqual({
      quicknodeRpcUrl: "https://example.quiknode.pro/devnet",
      usdcMintAddress,
      settlementWallet,
      usdcDecimals: 6,
    });
  });

  it("rejects a missing RPC URL", () => {
    expect(() =>
      loadOnChainConfig({ USDC_MINT_ADDRESS: usdcMintAddress, ADVERTEK_SETTLEMENT_WALLET: settlementWallet }),
    ).toThrow(/QUICKNODE_RPC_URL/);
  });

  it("rejects a non-URL RPC value", () => {
    expect(() =>
      loadOnChainConfig({
        QUICKNODE_RPC_URL: "not-a-url",
        USDC_MINT_ADDRESS: usdcMintAddress,
        ADVERTEK_SETTLEMENT_WALLET: settlementWallet,
      }),
    ).toThrow(/QUICKNODE_RPC_URL/);
  });

  it("rejects a malformed mint address", () => {
    expect(() =>
      loadOnChainConfig({
        QUICKNODE_RPC_URL: "https://example.quiknode.pro/devnet",
        USDC_MINT_ADDRESS: "not base58!",
        ADVERTEK_SETTLEMENT_WALLET: settlementWallet,
      }),
    ).toThrow(/USDC_MINT_ADDRESS/);
  });

  it("rejects a malformed settlement wallet address", () => {
    expect(() =>
      loadOnChainConfig({
        QUICKNODE_RPC_URL: "https://example.quiknode.pro/devnet",
        USDC_MINT_ADDRESS: usdcMintAddress,
        ADVERTEK_SETTLEMENT_WALLET: "too-short",
      }),
    ).toThrow(/ADVERTEK_SETTLEMENT_WALLET/);
  });
});

describe("loadSettlementSignerConfig", () => {
  it("parses a JSON byte-array secret key", () => {
    const bytes = Array.from({ length: 64 }, (_, i) => i);
    const config = loadSettlementSignerConfig({
      SETTLEMENT_WALLET_SECRET_KEY: JSON.stringify(bytes),
    });
    expect(Array.from(config.secretKey)).toEqual(bytes);
  });

  it("rejects a missing secret key", () => {
    expect(() => loadSettlementSignerConfig({})).toThrow(/SETTLEMENT_WALLET_SECRET_KEY/);
  });

  it("rejects a non-JSON secret key", () => {
    expect(() =>
      loadSettlementSignerConfig({ SETTLEMENT_WALLET_SECRET_KEY: "not-json" }),
    ).toThrow(/SETTLEMENT_WALLET_SECRET_KEY/);
  });

  it("rejects a JSON value that isn't a byte array", () => {
    expect(() =>
      loadSettlementSignerConfig({ SETTLEMENT_WALLET_SECRET_KEY: JSON.stringify([1, 2, 999]) }),
    ).toThrow(/SETTLEMENT_WALLET_SECRET_KEY/);
  });
});

describe("loadOkxTradingCredentials / loadOkxWithdrawalCredentials", () => {
  it("loads trading credentials, defaulting the base URL and isDemo to false", () => {
    const creds = loadOkxTradingCredentials({
      OKX_API_KEY: "trade-key",
      OKX_API_SECRET: "trade-secret",
      OKX_API_PASSPHRASE: "trade-pass",
    });
    expect(creds).toEqual({
      kind: "okx-trading",
      apiKey: "trade-key",
      apiSecret: "trade-secret",
      apiPassphrase: "trade-pass",
      baseUrl: "https://www.okx.com",
      isDemo: false,
    });
  });

  it("marks demo credentials so the client sends x-simulated-trading", () => {
    const creds = loadOkxTradingCredentials({
      OKX_API_KEY: "trade-key",
      OKX_API_SECRET: "trade-secret",
      OKX_API_PASSPHRASE: "trade-pass",
      OKX_API_DEMO: "true",
    });
    expect(creds.isDemo).toBe(true);
  });

  it("loads withdrawal credentials from a distinct set of env vars", () => {
    const creds = loadOkxWithdrawalCredentials({
      OKX_WITHDRAWAL_API_KEY: "withdraw-key",
      OKX_WITHDRAWAL_API_SECRET: "withdraw-secret",
      OKX_WITHDRAWAL_API_PASSPHRASE: "withdraw-pass",
    });
    expect(creds.kind).toBe("okx-withdrawal");
    expect(creds.apiKey).toBe("withdraw-key");
  });

  it("keeps trading and withdrawal credentials independent (loading one doesn't require the other)", () => {
    const env = {
      OKX_API_KEY: "trade-key",
      OKX_API_SECRET: "trade-secret",
      OKX_API_PASSPHRASE: "trade-pass",
    };
    expect(() => loadOkxTradingCredentials(env)).not.toThrow();
    expect(() => loadOkxWithdrawalCredentials(env)).toThrow(/OKX_WITHDRAWAL_API_KEY/);
  });

  it("rejects missing trading credentials", () => {
    expect(() => loadOkxTradingCredentials({})).toThrow(/OKX_API_KEY/);
  });

  it("rejects missing withdrawal credentials", () => {
    expect(() => loadOkxWithdrawalCredentials({})).toThrow(/OKX_WITHDRAWAL_API_KEY/);
  });
});

describe("loadSweepScheduleConfig", () => {
  it("applies defaults when unset", () => {
    const config = loadSweepScheduleConfig({});
    expect(config).toEqual({ intervalMs: 6 * 60 * 60 * 1000, minSweepAmountBaseUnits: 0n });
  });

  it("loads overrides from env", () => {
    const config = loadSweepScheduleConfig({
      SWEEP_INTERVAL_MS: "60000",
      SWEEP_MIN_USDC_BASE_UNITS: "50000000",
    });
    expect(config).toEqual({ intervalMs: 60_000, minSweepAmountBaseUnits: 50_000_000n });
  });

  it("rejects a negative interval", () => {
    expect(() => loadSweepScheduleConfig({ SWEEP_INTERVAL_MS: "-1" })).toThrow();
  });
});

describe("loadReconciliationToleranceConfig", () => {
  it("applies defaults when unset", () => {
    const config = loadReconciliationToleranceConfig({});
    expect(config).toEqual({ toleranceBps: 50, toleranceFloorMinorUnits: 1n });
  });

  it("loads overrides from env", () => {
    const config = loadReconciliationToleranceConfig({
      RECONCILIATION_TOLERANCE_BPS: "100",
      RECONCILIATION_TOLERANCE_FLOOR_CENTS: "5",
    });
    expect(config).toEqual({ toleranceBps: 100, toleranceFloorMinorUnits: 5n });
  });
});
