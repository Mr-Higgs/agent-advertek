import { z } from "zod";

const solanaAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Must be a base58 Solana address");

/** On-chain config needed to read the settlement wallet's USDC balance/history. */
const onChainEnvSchema = z.object({
  QUICKNODE_RPC_URL: z.string().url(),
  USDC_MINT_ADDRESS: solanaAddressSchema,
  ADVERTEK_SETTLEMENT_WALLET: solanaAddressSchema,
});

export type OnChainConfig = {
  readonly quicknodeRpcUrl: string;
  readonly usdcMintAddress: string;
  readonly settlementWallet: string;
  readonly usdcDecimals: number;
};

export function loadOnChainConfig(
  env: NodeJS.ProcessEnv = process.env,
): OnChainConfig {
  const parsed = onChainEnvSchema.safeParse({
    QUICKNODE_RPC_URL: env["QUICKNODE_RPC_URL"],
    USDC_MINT_ADDRESS: env["USDC_MINT_ADDRESS"],
    ADVERTEK_SETTLEMENT_WALLET: env["ADVERTEK_SETTLEMENT_WALLET"],
  });

  if (!parsed.success) {
    throw new Error(`Invalid on-chain configuration: ${formatIssues(parsed.error)}`);
  }

  return {
    quicknodeRpcUrl: parsed.data.QUICKNODE_RPC_URL,
    usdcMintAddress: parsed.data.USDC_MINT_ADDRESS,
    settlementWallet: parsed.data.ADVERTEK_SETTLEMENT_WALLET,
    usdcDecimals: 6,
  };
}

/**
 * Secret key that can move funds OUT of the settlement wallet (the on-chain
 * deposit-to-OKX leg of a sweep). Loaded separately from {@link OnChainConfig}
 * so that callers who only need to read balances/history never need this.
 */
const settlementSignerEnvSchema = z.object({
  SETTLEMENT_WALLET_SECRET_KEY: z
    .string()
    .min(1)
    .transform((raw, ctx) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "must be a JSON array of bytes" });
        return z.NEVER;
      }
      const bytes = z.array(z.number().int().min(0).max(255)).min(1).safeParse(parsed);
      if (!bytes.success) {
        ctx.addIssue({ code: "custom", message: "must be a JSON array of bytes" });
        return z.NEVER;
      }
      return Uint8Array.from(bytes.data);
    }),
});

export type SettlementSignerConfig = {
  readonly secretKey: Uint8Array;
};

export function loadSettlementSignerConfig(
  env: NodeJS.ProcessEnv = process.env,
): SettlementSignerConfig {
  const parsed = settlementSignerEnvSchema.safeParse({
    SETTLEMENT_WALLET_SECRET_KEY: env["SETTLEMENT_WALLET_SECRET_KEY"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid settlement signer configuration: ${formatIssues(parsed.error)}`,
    );
  }

  return { secretKey: parsed.data.SETTLEMENT_WALLET_SECRET_KEY };
}

/**
 * OKX credentials, kept as two disjoint sets so a compromised or misused
 * "trading" credential can never withdraw funds:
 *  - Trading: read balances + execute Convert (USDC -> CAD). Used by the
 *    automatic sweep.
 *  - Withdrawal: move fiat/crypto OUT of OKX. Intentionally never touched by
 *    the automatic sweep — withdrawal stays a deliberate, separate action.
 * The `kind` discriminant makes the two types structurally incompatible, so
 * passing one where the other is expected is a compile-time error, not just
 * an env-var convention.
 */
export interface OkxTradingCredentials {
  readonly kind: "okx-trading";
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly apiPassphrase: string;
  readonly baseUrl: string;
  readonly isDemo: boolean;
}

export interface OkxWithdrawalCredentials {
  readonly kind: "okx-withdrawal";
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly apiPassphrase: string;
  readonly baseUrl: string;
}

const okxTradingEnvSchema = z.object({
  OKX_API_KEY: z.string().min(1),
  OKX_API_SECRET: z.string().min(1),
  OKX_API_PASSPHRASE: z.string().min(1),
  OKX_API_BASE_URL: z.string().url().default("https://www.okx.com"),
  // OKX Demo Trading keys behave identically except every request must carry
  // an `x-simulated-trading: 1` header. Set this when OKX_API_KEY was
  // generated under Trade -> Demo Trading -> Personal Center.
  OKX_API_DEMO: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1"),
});

export function loadOkxTradingCredentials(
  env: NodeJS.ProcessEnv = process.env,
): OkxTradingCredentials {
  const parsed = okxTradingEnvSchema.safeParse({
    OKX_API_KEY: env["OKX_API_KEY"],
    OKX_API_SECRET: env["OKX_API_SECRET"],
    OKX_API_PASSPHRASE: env["OKX_API_PASSPHRASE"],
    OKX_API_BASE_URL: env["OKX_API_BASE_URL"],
    OKX_API_DEMO: env["OKX_API_DEMO"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid OKX trading credentials: ${formatIssues(parsed.error)}`,
    );
  }

  return {
    kind: "okx-trading",
    apiKey: parsed.data.OKX_API_KEY,
    apiSecret: parsed.data.OKX_API_SECRET,
    apiPassphrase: parsed.data.OKX_API_PASSPHRASE,
    baseUrl: parsed.data.OKX_API_BASE_URL,
    isDemo: parsed.data.OKX_API_DEMO,
  };
}

const okxWithdrawalEnvSchema = z.object({
  OKX_WITHDRAWAL_API_KEY: z.string().min(1),
  OKX_WITHDRAWAL_API_SECRET: z.string().min(1),
  OKX_WITHDRAWAL_API_PASSPHRASE: z.string().min(1),
  OKX_WITHDRAWAL_API_BASE_URL: z.string().url().default("https://www.okx.com"),
});

export function loadOkxWithdrawalCredentials(
  env: NodeJS.ProcessEnv = process.env,
): OkxWithdrawalCredentials {
  const parsed = okxWithdrawalEnvSchema.safeParse({
    OKX_WITHDRAWAL_API_KEY: env["OKX_WITHDRAWAL_API_KEY"],
    OKX_WITHDRAWAL_API_SECRET: env["OKX_WITHDRAWAL_API_SECRET"],
    OKX_WITHDRAWAL_API_PASSPHRASE: env["OKX_WITHDRAWAL_API_PASSPHRASE"],
    OKX_WITHDRAWAL_API_BASE_URL: env["OKX_WITHDRAWAL_API_BASE_URL"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid OKX withdrawal credentials: ${formatIssues(parsed.error)}`,
    );
  }

  return {
    kind: "okx-withdrawal",
    apiKey: parsed.data.OKX_WITHDRAWAL_API_KEY,
    apiSecret: parsed.data.OKX_WITHDRAWAL_API_SECRET,
    apiPassphrase: parsed.data.OKX_WITHDRAWAL_API_PASSPHRASE,
    baseUrl: parsed.data.OKX_WITHDRAWAL_API_BASE_URL,
  };
}

const sweepScheduleEnvSchema = z.object({
  SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(6 * 60 * 60 * 1000),
  SWEEP_MIN_USDC_BASE_UNITS: z.coerce.bigint().nonnegative().default(0n),
});

export type SweepScheduleConfig = {
  readonly intervalMs: number;
  readonly minSweepAmountBaseUnits: bigint;
};

export function loadSweepScheduleConfig(
  env: NodeJS.ProcessEnv = process.env,
): SweepScheduleConfig {
  const parsed = sweepScheduleEnvSchema.safeParse({
    SWEEP_INTERVAL_MS: env["SWEEP_INTERVAL_MS"],
    SWEEP_MIN_USDC_BASE_UNITS: env["SWEEP_MIN_USDC_BASE_UNITS"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid sweep schedule configuration: ${formatIssues(parsed.error)}`,
    );
  }

  return {
    intervalMs: parsed.data.SWEEP_INTERVAL_MS,
    minSweepAmountBaseUnits: parsed.data.SWEEP_MIN_USDC_BASE_UNITS,
  };
}

const reconciliationToleranceEnvSchema = z.object({
  RECONCILIATION_TOLERANCE_BPS: z.coerce.number().int().nonnegative().default(50),
  RECONCILIATION_TOLERANCE_FLOOR_CENTS: z.coerce.bigint().nonnegative().default(1n),
});

export type ReconciliationToleranceConfig = {
  readonly toleranceBps: number;
  readonly toleranceFloorMinorUnits: bigint;
};

export function loadReconciliationToleranceConfig(
  env: NodeJS.ProcessEnv = process.env,
): ReconciliationToleranceConfig {
  const parsed = reconciliationToleranceEnvSchema.safeParse({
    RECONCILIATION_TOLERANCE_BPS: env["RECONCILIATION_TOLERANCE_BPS"],
    RECONCILIATION_TOLERANCE_FLOOR_CENTS: env["RECONCILIATION_TOLERANCE_FLOOR_CENTS"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid reconciliation tolerance configuration: ${formatIssues(parsed.error)}`,
    );
  }

  return {
    toleranceBps: parsed.data.RECONCILIATION_TOLERANCE_BPS,
    toleranceFloorMinorUnits: parsed.data.RECONCILIATION_TOLERANCE_FLOOR_CENTS,
  };
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
