import { z } from "zod";

/**
 * Centralized config loader for the Advertek order-fulfillment API.
 *
 * Auth is HTTP Basic over HTTPS only — credentials come from
 * `ADVERTEK_API_USERNAME` / `ADVERTEK_API_PASSWORD` and are never
 * hardcoded or given a default/fallback value.
 *
 * `ADVERTEK_API_BASE_URL` is configurable, not hardcoded:
 *   - If unset outside production, it defaults to Advertek's staging
 *     origin ({@link ADVERTEK_STAGING_BASE_URL}).
 *   - If unset in production (`NODE_ENV=production`), config loading fails
 *     fast — production must always set this explicitly.
 *   - Whenever set, it must be `https://`, except for a loopback host
 *     (`localhost` / `127.0.0.1` / `::1`), which may use plain `http://`
 *     for local mock-server testing.
 *
 * Credentials are required — and config loading fails fast if either is
 * missing — whenever the *effective* base URL (explicit or defaulted)
 * points at a non-local host. They're optional only when pointed at a
 * loopback host, so local tests can run against a mock server with no
 * auth configured at all.
 */

export const ADVERTEK_STAGING_BASE_URL = "https://phoenix-staging.advertekprinting.com";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isAllowedBaseUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === "https:") {
    return true;
  }
  // Plain http:// is only ever acceptable against a loopback host (a local
  // mock server in dev/test) — Basic Auth must never travel over
  // plaintext to a real network destination.
  return url.protocol === "http:" && isLocalHostname(url.hostname);
}

const fulfillmentEnvSchema = z
  .object({
    ADVERTEK_API_USERNAME: z.string().min(1).optional(),
    ADVERTEK_API_PASSWORD: z.string().min(1).optional(),
    ADVERTEK_API_BASE_URL: z.string().min(1).optional(),
    NODE_ENV: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const isProduction = value.NODE_ENV === "production";
    const rawBaseUrl = value.ADVERTEK_API_BASE_URL;

    if (rawBaseUrl === undefined) {
      if (isProduction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ADVERTEK_API_BASE_URL"],
          message:
            "is required when NODE_ENV=production — the staging default is only used outside production",
        });
        return;
      }
      // Falls through: the effective base URL is the staging default
      // below, which is a non-local host, so credentials are still
      // required (checked after this branch).
    } else if (!isAllowedBaseUrl(rawBaseUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADVERTEK_API_BASE_URL"],
        message:
          "must be an https:// URL (http:// is only permitted for localhost/127.0.0.1/::1)",
      });
      return;
    }

    const effectiveBaseUrl = rawBaseUrl ?? ADVERTEK_STAGING_BASE_URL;
    const hostname = new URL(effectiveBaseUrl).hostname;

    if (!isLocalHostname(hostname)) {
      if (value.ADVERTEK_API_USERNAME === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ADVERTEK_API_USERNAME"],
          message:
            "is required when ADVERTEK_API_BASE_URL points at a non-local host",
        });
      }
      if (value.ADVERTEK_API_PASSWORD === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ADVERTEK_API_PASSWORD"],
          message:
            "is required when ADVERTEK_API_BASE_URL points at a non-local host",
        });
      }
    }
  });

export interface FulfillmentConfig {
  /** `undefined` only when the effective base URL is a loopback host. */
  readonly username: string | undefined;
  /** `undefined` only when the effective base URL is a loopback host. */
  readonly password: string | undefined;
  readonly baseUrl: string;
}

export function loadFulfillmentConfig(
  env: NodeJS.ProcessEnv = process.env,
): FulfillmentConfig {
  const parsed = fulfillmentEnvSchema.safeParse({
    ADVERTEK_API_USERNAME: env["ADVERTEK_API_USERNAME"],
    ADVERTEK_API_PASSWORD: env["ADVERTEK_API_PASSWORD"],
    ADVERTEK_API_BASE_URL: env["ADVERTEK_API_BASE_URL"],
    NODE_ENV: env["NODE_ENV"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid Advertek fulfillment configuration: ${formatIssues(parsed.error)}`,
    );
  }

  return {
    username: parsed.data.ADVERTEK_API_USERNAME,
    password: parsed.data.ADVERTEK_API_PASSWORD,
    baseUrl: parsed.data.ADVERTEK_API_BASE_URL ?? ADVERTEK_STAGING_BASE_URL,
  };
}

/**
 * Builds the `Authorization: Basic ...` header value for a config, or
 * `undefined` when no credentials are configured (only valid for a
 * loopback `baseUrl` — see {@link loadFulfillmentConfig}).
 */
export function buildBasicAuthHeader(config: FulfillmentConfig): string | undefined {
  if (config.username === undefined || config.password === undefined) {
    return undefined;
  }
  const token = Buffer.from(`${config.username}:${config.password}`, "utf8").toString(
    "base64",
  );
  return `Basic ${token}`;
}

/**
 * Credentials Advertek sends back to us via HTTP Basic Auth on inbound
 * order-status webhook deliveries. Deliberately a separate credential set
 * from {@link FulfillmentConfig}'s `ADVERTEK_API_USERNAME`/`PASSWORD` —
 * those authenticate outbound calls we make *to* Advertek, these
 * authenticate inbound calls Advertek makes *to* us, and the two
 * directions should never share a credential.
 */
export interface AdvertekWebhookConfig {
  readonly username: string;
  readonly password: string;
}

const advertekWebhookEnvSchema = z.object({
  ADVERTEK_WEBHOOK_USERNAME: z.string().min(1),
  ADVERTEK_WEBHOOK_PASSWORD: z.string().min(1),
});

export function loadAdvertekWebhookConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdvertekWebhookConfig {
  const parsed = advertekWebhookEnvSchema.safeParse({
    ADVERTEK_WEBHOOK_USERNAME: env["ADVERTEK_WEBHOOK_USERNAME"],
    ADVERTEK_WEBHOOK_PASSWORD: env["ADVERTEK_WEBHOOK_PASSWORD"],
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid Advertek webhook configuration: ${formatIssues(parsed.error)}`,
    );
  }

  return {
    username: parsed.data.ADVERTEK_WEBHOOK_USERNAME,
    password: parsed.data.ADVERTEK_WEBHOOK_PASSWORD,
  };
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
