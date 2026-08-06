import type { IncomingMessage, ServerResponse } from "node:http";
import { gunzipSync } from "node:zlib";
import {
  AdvertekWebhookAuthError,
  AdvertekWebhookPayloadValidationError,
  handleAdvertekWebhook,
  type HandleAdvertekWebhookDeps,
} from "./advertek-webhook.js";

export type AdvertekWebhookRequestListener = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void>;

/**
 * Builds a plain Node `http` request listener around
 * {@link handleAdvertekWebhook}. Mount it with `http.createServer(handler)`
 * behind a TLS-terminating reverse proxy (or directly on `https.createServer`)
 * — this endpoint is HTTPS-only, per Advertek's contract. Requests that
 * don't prove they arrived over TLS (either a `TLSSocket`, or an
 * `x-forwarded-proto: https` header from a trusted proxy in front) are
 * rejected before any auth/payload work happens.
 *
 * Acknowledges as soon as `handleAdvertekWebhook` returns — which never
 * awaits the slow downstream dispatch — so Advertek's 10-second, 5-retry
 * delivery contract is satisfied regardless of how long agent-facing
 * dispatch takes or whether it fails.
 */
export function createAdvertekWebhookRequestHandler(
  deps: HandleAdvertekWebhookDeps,
): AdvertekWebhookRequestListener {
  return async (req, res) => {
    if (!isHttps(req)) {
      sendJson(res, 400, {
        ok: false,
        error: "Advertek webhook endpoint must be served over HTTPS",
      });
      return;
    }

    let rawBody: string;
    try {
      rawBody = await readRawBody(req);
    } catch {
      sendJson(res, 400, { ok: false, error: "Failed to read request body" });
      return;
    }

    try {
      const event = handleAdvertekWebhook(deps, {
        authorizationHeader: headerValue(req.headers.authorization),
        rawBody,
      });
      sendJson(res, 200, {
        ok: true,
        vendorOrderId: event.vendorOrderId,
        internalOrderId: event.internalOrderId,
      });
    } catch (error) {
      if (error instanceof AdvertekWebhookAuthError) {
        sendJson(res, 401, { ok: false, error: error.message });
        return;
      }
      if (error instanceof AdvertekWebhookPayloadValidationError) {
        sendJson(res, 400, { ok: false, error: error.message });
        return;
      }
      sendJson(res, 500, { ok: false, error: "Internal error processing webhook" });
    }
  };
}

/**
 * `node:http` sockets are never TLS themselves — TLS is expected to be
 * terminated either directly (mounting this handler on an
 * `https.createServer`, where the socket is a real `TLSSocket`) or by a
 * reverse proxy in front that forwards the original scheme via
 * `x-forwarded-proto`.
 */
function isHttps(req: IncomingMessage): boolean {
  const forwardedProto = headerValue(req.headers["x-forwarded-proto"]);
  if (forwardedProto !== undefined) {
    return forwardedProto.toLowerCase() === "https";
  }
  const socket = req.socket as { encrypted?: boolean };
  return socket.encrypted === true;
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);
  const isGzipped = req.headers["content-encoding"] === "gzip";
  return (isGzipped ? gunzipSync(body) : body).toString("utf8");
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(text);
}
