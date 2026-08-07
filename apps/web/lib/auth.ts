import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * API-key authentication for the agent-facing surface (`/api/quotes`,
 * `/api/orders`, `/api/mcp`). `/api/catalog` stays public — it is read-only
 * reference data.
 *
 * These keys authorize *requests*; they are not settlement or OKX
 * credentials, so requiring them here does not weaken the invariant that
 * `apps/web` holds no money-moving secrets.
 *
 * This is the app's config module for auth, per the repo convention that env
 * access lives in exactly one Zod-validated loader per concern.
 */

const authEnvSchema = z.object({
  /** Comma- or whitespace-separated list of accepted keys. */
  ADVERTEK_API_KEYS: z.string().optional(),
  ADVERTEK_API_AUTH_REQUIRED: z.enum(["true", "false"]).optional(),
});

export interface ApiAuthConfig {
  readonly apiKeys: ReadonlySet<string>;
  /**
   * Whether a valid key is mandatory. Defaults to `true` as soon as any key
   * is configured, so provisioning keys is the only step needed to close the
   * surface; set `ADVERTEK_API_AUTH_REQUIRED` explicitly to override (for
   * example `false` on a keyless public demo deployment).
   */
  readonly authRequired: boolean;
}

/** `Record` rather than `NodeJS.ProcessEnv` so tests can pass bare fixtures. */
export function loadApiAuthConfig(
  env: Record<string, string | undefined> = process.env,
): ApiAuthConfig {
  const parsed = authEnvSchema.safeParse({
    ADVERTEK_API_KEYS: env["ADVERTEK_API_KEYS"],
    ADVERTEK_API_AUTH_REQUIRED: env["ADVERTEK_API_AUTH_REQUIRED"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid API auth configuration: ${details}`);
  }

  const apiKeys = new Set(
    (parsed.data.ADVERTEK_API_KEYS ?? "")
      .split(/[\s,]+/)
      .map((key) => key.trim())
      .filter((key) => key.length > 0),
  );

  return {
    apiKeys,
    authRequired:
      parsed.data.ADVERTEK_API_AUTH_REQUIRED === undefined
        ? apiKeys.size > 0
        : parsed.data.ADVERTEK_API_AUTH_REQUIRED === "true",
  };
}

export type ApiAuthResult =
  | { readonly ok: true; readonly keyId: string }
  | { readonly ok: false; readonly status: 401 | 503; readonly error: string };

/** Stable, non-reversible id for a key — safe to use as a rate-limit bucket. */
export function apiKeyId(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function isAcceptedKey(candidate: string, config: ApiAuthConfig): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  let matched = false;
  for (const key of config.apiKeys) {
    const keyDigest = createHash("sha256").update(key).digest();
    if (timingSafeEqual(candidateDigest, keyDigest)) {
      matched = true;
    }
  }
  return matched;
}

function readPresentedKey(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  if (authorization !== null) {
    const bearer = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (bearer?.[1] !== undefined) {
      return bearer[1].trim();
    }
  }
  return request.headers.get("x-api-key")?.trim() ?? undefined;
}

/**
 * Authorizes a request against the configured keys. Returns the caller's
 * rate-limit identity on success (the key id, or `anonymous` when auth is
 * disabled) and a status + message on failure.
 */
export function authorizeApiRequest(
  request: Request,
  config: ApiAuthConfig = loadApiAuthConfig(),
): ApiAuthResult {
  if (!config.authRequired) {
    return { ok: true, keyId: "anonymous" };
  }
  if (config.apiKeys.size === 0) {
    return {
      ok: false,
      status: 503,
      error: "API authentication is required but no API keys are configured",
    };
  }

  const presented = readPresentedKey(request);
  if (presented === undefined || presented.length === 0) {
    return {
      ok: false,
      status: 401,
      error: "Missing API key: send Authorization: Bearer <key> or X-API-Key",
    };
  }
  if (!isAcceptedKey(presented, config)) {
    return { ok: false, status: 401, error: "Invalid API key" };
  }

  return { ok: true, keyId: apiKeyId(presented) };
}
