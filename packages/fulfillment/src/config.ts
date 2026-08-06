import { z } from "zod";

/**
 * Centralized config loader for the Advertek order-fulfillment API.
 *
 * Auth is HTTP Basic over HTTPS only — credentials come from
 * `ADVERTEK_API_USERNAME` / `ADVERTEK_API_PASSWORD` and are never
 * hardcoded. `ADVERTEK_API_BASE_URL` must be an `https://` origin;
 * `loadFulfillmentConfig` fails fast on anything else so Basic Auth
 * credentials can never be sent over plaintext HTTP.
 */

const fulfillmentEnvSchema = z.object({
  ADVERTEK_API_USERNAME: z.string().min(1),
  ADVERTEK_API_PASSWORD: z.string().min(1),
  ADVERTEK_API_BASE_URL: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === "https:", {
      message: "must use https:// — HTTP Basic Auth is only permitted over HTTPS",
    }),
});

export interface FulfillmentConfig {
  readonly username: string;
  readonly password: string;
  readonly baseUrl: string;
}

export function loadFulfillmentConfig(
  env: NodeJS.ProcessEnv = process.env,
): FulfillmentConfig {
  const parsed = fulfillmentEnvSchema.safeParse({
    ADVERTEK_API_USERNAME: env["ADVERTEK_API_USERNAME"],
    ADVERTEK_API_PASSWORD: env["ADVERTEK_API_PASSWORD"],
    ADVERTEK_API_BASE_URL: env["ADVERTEK_API_BASE_URL"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Advertek fulfillment configuration: ${details}`);
  }

  return {
    username: parsed.data.ADVERTEK_API_USERNAME,
    password: parsed.data.ADVERTEK_API_PASSWORD,
    baseUrl: parsed.data.ADVERTEK_API_BASE_URL,
  };
}

/** Builds the `Authorization: Basic ...` header value for a config. */
export function buildBasicAuthHeader(config: FulfillmentConfig): string {
  const token = Buffer.from(`${config.username}:${config.password}`, "utf8").toString(
    "base64",
  );
  return `Basic ${token}`;
}
