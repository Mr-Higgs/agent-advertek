import { accessRequestSchema } from "@/lib/access-schema";
import { loadAccessConfig } from "@/lib/access-config";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";
import { jsonResponse } from "@/lib/json";

export async function POST(request: Request): Promise<Response> {
  const ip = clientIpAddress(request);
  const decision = checkRateLimit(`access-request:${ip}`);
  if (!decision.allowed) {
    return jsonResponse(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429, headers: { "retry-after": String(decision.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const honeypot = typeof body === "object" && body !== null && "websiteHp" in body ? String(body.websiteHp) : "";
  if (honeypot.length > 0) {
    return jsonResponse({ ok: true, message: "Received" }, { status: 202 });
  }

  const parsed = accessRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return jsonResponse(
      { ok: false, error: "Validation failed", issues: fieldErrors },
      { status: 422 },
    );
  }

  const submission = {
    ...parsed.data,
    source: "advertek.io",
    landingPage: "/access",
    referrer: request.headers.get("referer") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    submittedAt: new Date().toISOString(),
    ip,
  };

  const config = loadAccessConfig();
  if (config.forwardEndpoint !== undefined) {
    try {
      const forward = await fetch(config.forwardEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(submission),
      });
      if (!forward.ok) {
        console.error("Access request forwarding failed", forward.status);
      }
    } catch (error) {
      console.error("Access request forwarding error", error);
    }
  }

  return jsonResponse(
    { ok: true, message: "Request received" },
    { status: 201 },
  );
}
