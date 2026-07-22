import { z } from "zod";

const solanaAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Must be a base58 Solana address");

const paymentsEnvSchema = z.object({
  QUICKNODE_RPC_URL: z.string().url(),
  USDC_MINT_ADDRESS: solanaAddressSchema,
  ADVERTEK_SETTLEMENT_WALLET: solanaAddressSchema,
});

export type PaymentsConfig = {
  readonly quicknodeRpcUrl: string;
  readonly usdcMintAddress: string;
  readonly settlementWallet: string;
  /** USDC decimals; Solana USDC uses 6. */
  readonly usdcDecimals: number;
};

export function loadPaymentsConfig(
  env: NodeJS.ProcessEnv = process.env,
): PaymentsConfig {
  const parsed = paymentsEnvSchema.safeParse({
    QUICKNODE_RPC_URL: env["QUICKNODE_RPC_URL"],
    USDC_MINT_ADDRESS: env["USDC_MINT_ADDRESS"],
    ADVERTEK_SETTLEMENT_WALLET: env["ADVERTEK_SETTLEMENT_WALLET"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid payments configuration: ${details}`);
  }

  return {
    quicknodeRpcUrl: parsed.data.QUICKNODE_RPC_URL,
    usdcMintAddress: parsed.data.USDC_MINT_ADDRESS,
    settlementWallet: parsed.data.ADVERTEK_SETTLEMENT_WALLET,
    usdcDecimals: 6,
  };
}

const quickNodeWebhookEnvSchema = z.object({
  QUICKNODE_WEBHOOK_SECURITY_TOKEN: z.string().min(1),
});

export type QuickNodeWebhookConfig = {
  /** Shared secret (QuickNode Stream/Function "security token") used to
   *  verify the HMAC-SHA256 signature on incoming webhook deliveries. */
  readonly securityToken: string;
};

export function loadQuickNodeWebhookConfig(
  env: NodeJS.ProcessEnv = process.env,
): QuickNodeWebhookConfig {
  const parsed = quickNodeWebhookEnvSchema.safeParse({
    QUICKNODE_WEBHOOK_SECURITY_TOKEN: env["QUICKNODE_WEBHOOK_SECURITY_TOKEN"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid QuickNode webhook configuration: ${details}`);
  }

  return { securityToken: parsed.data.QUICKNODE_WEBHOOK_SECURITY_TOKEN };
}
