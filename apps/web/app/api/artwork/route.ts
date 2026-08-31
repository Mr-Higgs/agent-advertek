import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { tryLoadBlobToken } from "@/lib/chat-config";
import { jsonResponse } from "@/lib/json";
import { checkRateLimit, clientIpAddress } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Client-upload token exchange for chat artwork (Vercel Blob). The browser
 * uploads directly to the blob store — serverless request bodies cap at
 * ~4.5MB, print files don't — and drops the resulting public URL into the
 * conversation, where the agent treats it like any pasted asset URL.
 */

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "image/svg+xml",
  "application/pdf",
];

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  const token = tryLoadBlobToken();
  if (token === undefined) {
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

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid upload request body" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: () =>
        Promise.resolve({
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        }),
    });
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
