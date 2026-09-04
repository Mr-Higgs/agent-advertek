import { randomBytes } from "node:crypto";
import { z } from "zod";
import { tryLoadArtworkStorageConfig } from "@/lib/chat-config";
import { jsonResponse } from "@/lib/json";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Signed-upload-URL exchange for chat artwork (Supabase Storage). The
 * browser uploads directly to storage — serverless request bodies cap at
 * ~4.5MB, print files don't — and drops the resulting public URL into the
 * conversation, where the agent treats it like any pasted asset URL. The
 * bucket is public-read so Anthropic can fetch images for vision. Max file
 * size and allowed types are enforced at the bucket level.
 */

const ARTWORK_BUCKET = "artwork";

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "image/svg+xml",
  "application/pdf",
];

const bodySchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_CONTENT_TYPES as [string, ...string[]]),
});

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]/g, "_");
}

export async function POST(request: Request): Promise<Response> {
  const config = tryLoadArtworkStorageConfig();
  if (config === undefined) {
    return jsonResponse(
      { ok: false, error: "Artwork upload is not configured on this deployment" },
      { status: 503 },
    );
  }

  const decision = checkRateLimit(`artwork:ip:${clientIpAddress(request)}`);
  if (!decision.allowed) {
    return jsonResponse(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429, headers: { "retry-after": String(decision.retryAfterSeconds) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!body.success) {
    return jsonResponse({ ok: false, error: "Invalid upload request body" }, { status: 400 });
  }

  const path = `${randomBytes(6).toString("hex")}-${sanitizeFilename(body.data.filename)}`;
  try {
    const response = await fetch(
      `${config.url}/storage/v1/object/upload/sign/${ARTWORK_BUCKET}/${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: "{}",
      },
    );
    if (!response.ok) {
      return jsonResponse({ ok: false, error: "Could not create upload URL" }, { status: 502 });
    }
    const signed = (await response.json()) as { url?: string };
    if (typeof signed.url !== "string") {
      return jsonResponse({ ok: false, error: "Could not create upload URL" }, { status: 502 });
    }
    return jsonResponse({
      ok: true,
      uploadUrl: `${config.url}/storage/v1${signed.url}`,
      publicUrl: `${config.url}/storage/v1/object/public/${ARTWORK_BUCKET}/${path}`,
    });
  } catch {
    return jsonResponse({ ok: false, error: "Could not create upload URL" }, { status: 502 });
  }
}
