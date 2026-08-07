import { z } from "zod";

/**
 * Centralized config for the two upstreams this package talks to: Advertek's
 * pricing system and the CAD->USDC spot-rate provider. Both are optional at
 * the process level — hosts that have not provisioned them yet fall back to
 * mocks via the `try*` loaders — but whenever an endpoint *is* configured its
 * credentials are required and the URL must be https (loopback may use plain
 * http for local mock servers).
 */

function isAllowedEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === "https:") {
    return true;
  }
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  return url.protocol === "http:" && isLocal;
}

const endpointSchema = z
  .string()
  .min(1)
  .refine(
    isAllowedEndpoint,
    "must be an https:// URL (http:// is only permitted for localhost/127.0.0.1/::1)",
  );

const pricingEnvSchema = z.object({
  ADVERTEK_PRICING_API_URL: endpointSchema,
  ADVERTEK_PRICING_API_KEY: z.string().min(1),
});

export interface AdvertekPricingConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function loadAdvertekPricingConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdvertekPricingConfig {
  const parsed = pricingEnvSchema.safeParse({
    ADVERTEK_PRICING_API_URL: env["ADVERTEK_PRICING_API_URL"],
    ADVERTEK_PRICING_API_KEY: env["ADVERTEK_PRICING_API_KEY"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid Advertek pricing configuration: ${formatIssues(parsed.error)}`,
    );
  }

  return {
    baseUrl: parsed.data.ADVERTEK_PRICING_API_URL,
    apiKey: parsed.data.ADVERTEK_PRICING_API_KEY,
  };
}

/**
 * `undefined` when no pricing endpoint is configured at all; still throws
 * when an endpoint is configured but its credentials are missing or invalid
 * — a half-configured integration is a deployment error, not a fallback.
 */
export function tryLoadAdvertekPricingConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdvertekPricingConfig | undefined {
  if (env["ADVERTEK_PRICING_API_URL"] === undefined) {
    return undefined;
  }
  return loadAdvertekPricingConfig(env);
}

const spotRateEnvSchema = z.object({
  SPOT_RATE_API_URL: endpointSchema,
  SPOT_RATE_API_KEY: z.string().min(1).optional(),
});

export interface SpotRateConfig {
  readonly baseUrl: string;
  /** Optional: some FX providers publish reference rates unauthenticated. */
  readonly apiKey: string | undefined;
}

export function loadSpotRateConfig(
  env: NodeJS.ProcessEnv = process.env,
): SpotRateConfig {
  const parsed = spotRateEnvSchema.safeParse({
    SPOT_RATE_API_URL: env["SPOT_RATE_API_URL"],
    SPOT_RATE_API_KEY: env["SPOT_RATE_API_KEY"],
  });

  if (!parsed.success) {
    throw new Error(`Invalid spot-rate configuration: ${formatIssues(parsed.error)}`);
  }

  return {
    baseUrl: parsed.data.SPOT_RATE_API_URL,
    apiKey: parsed.data.SPOT_RATE_API_KEY,
  };
}

/** See {@link tryLoadAdvertekPricingConfig}. */
export function tryLoadSpotRateConfig(
  env: NodeJS.ProcessEnv = process.env,
): SpotRateConfig | undefined {
  if (env["SPOT_RATE_API_URL"] === undefined) {
    return undefined;
  }
  return loadSpotRateConfig(env);
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}
