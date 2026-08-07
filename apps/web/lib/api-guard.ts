import { authorizeApiRequest } from "@/lib/auth";
import { jsonResponse } from "@/lib/json";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";

/**
 * Single entry gate for the agent-facing API surface: API-key auth followed
 * by per-caller rate limiting. Returns a `Response` to send when the request
 * is rejected, or `undefined` when the handler should proceed.
 *
 * `/api/catalog` deliberately does not use this — it is public read-only
 * reference data.
 */
export function guardApiRequest(request: Request, route: string): Response | undefined {
  const auth = authorizeApiRequest(request);
  if (!auth.ok) {
    return jsonResponse({ ok: false, error: auth.error }, { status: auth.status });
  }

  const identity =
    auth.keyId === "anonymous" ? `ip:${clientIpAddress(request)}` : `key:${auth.keyId}`;
  const decision = checkRateLimit(`${route}:${identity}`);
  if (!decision.allowed) {
    return jsonResponse(
      { ok: false, error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "retry-after": String(decision.retryAfterSeconds) },
      },
    );
  }

  return undefined;
}
