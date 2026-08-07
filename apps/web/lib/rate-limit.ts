import { z } from "zod";

/**
 * Fixed-window rate limiter for the agent-facing API surface.
 *
 * TODO: this counts requests **per serverless instance**, which is enough to
 * blunt a single hot client but is not a global limit — Vercel may run many
 * instances concurrently and recycle them freely. Move the counter to a
 * shared store (Upstash Redis via `@upstash/ratelimit`) when a true global
 * limit is required.
 */

const rateLimitEnvSchema = z.object({
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().optional(),
});

export interface RateLimitConfig {
  readonly requestsPerWindow: number;
  readonly windowMs: number;
}

const DEFAULT_REQUESTS_PER_MINUTE = 60;
const WINDOW_MS = 60_000;

/** `Record` rather than `NodeJS.ProcessEnv` so tests can pass bare fixtures. */
export function loadRateLimitConfig(
  env: Record<string, string | undefined> = process.env,
): RateLimitConfig {
  const parsed = rateLimitEnvSchema.safeParse({
    RATE_LIMIT_REQUESTS_PER_MINUTE: env["RATE_LIMIT_REQUESTS_PER_MINUTE"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid rate limit configuration: ${details}`);
  }

  return {
    requestsPerWindow:
      parsed.data.RATE_LIMIT_REQUESTS_PER_MINUTE ?? DEFAULT_REQUESTS_PER_MINUTE,
    windowMs: WINDOW_MS,
  };
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  /** Seconds until the current window resets. */
  readonly retryAfterSeconds: number;
}

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export function checkRateLimit(
  identity: string,
  config: RateLimitConfig = loadRateLimitConfig(),
  now: () => number = () => Date.now(),
): RateLimitDecision {
  const timestamp = now();
  const existing = windows.get(identity);
  const window: Window =
    existing === undefined || existing.resetAt <= timestamp
      ? { count: 0, resetAt: timestamp + config.windowMs }
      : existing;

  window.count += 1;
  windows.set(identity, window);
  pruneExpired(timestamp);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((window.resetAt - timestamp) / 1000),
  );
  return {
    allowed: window.count <= config.requestsPerWindow,
    remaining: Math.max(0, config.requestsPerWindow - window.count),
    retryAfterSeconds,
  };
}

/** Keeps the per-instance map from growing without bound. */
function pruneExpired(timestamp: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= timestamp) {
      windows.delete(key);
    }
  }
}

/** Best-effort caller identity for anonymous (unkeyed) traffic. */
export function clientIpAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first !== undefined && first.length > 0) {
    return first;
  }
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}
