import type { IncomingMessage, ServerResponse } from "node:http";
import { gunzipSync } from "node:zlib";
import {
  handleQuickNodeWebhook,
  WebhookPayloadValidationError,
  WebhookSignatureVerificationError,
  type HandleQuickNodeWebhookDeps,
} from "./quicknode-webhook.js";

export type QuickNodeWebhookRequestListener = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void>;

/**
 * Builds a plain Node `http` request listener around
 * {@link handleQuickNodeWebhook}. Mount it with `http.createServer(handler)`
 * or adapt it into Express/Fastify/etc. Reads the raw body itself (rather
 * than relying on framework body-parsing) so the exact bytes QuickNode
 * signed are what get hashed — gzip'd deliveries (`Content-Encoding: gzip`)
 * are decompressed first, per QuickNode's Streams signing contract.
 */
export function createQuickNodeWebhookRequestHandler(
  deps: HandleQuickNodeWebhookDeps,
): QuickNodeWebhookRequestListener {
  return async (req, res) => {
    try {
      const rawBody = await readRawBody(req);
      const result = await handleQuickNodeWebhook(deps, {
        headers: {
          "x-qn-nonce": headerValue(req.headers["x-qn-nonce"]),
          "x-qn-timestamp": headerValue(req.headers["x-qn-timestamp"]),
          "x-qn-signature": headerValue(req.headers["x-qn-signature"]),
        },
        rawBody,
      });

      sendJson(res, 200, { ok: true, processedOrderIds: result.processedOrderIds });
    } catch (error) {
      if (error instanceof WebhookSignatureVerificationError) {
        sendJson(res, 401, { ok: false, error: error.message });
        return;
      }
      if (error instanceof WebhookPayloadValidationError) {
        sendJson(res, 400, { ok: false, error: error.message });
        return;
      }
      sendJson(res, 500, { ok: false, error: "Internal error processing webhook" });
    }
  };
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
