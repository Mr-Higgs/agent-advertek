import { createHmac } from "node:crypto";

/**
 * OKX REST API v5 request signing.
 * https://www.okx.com/docs-v5/en/#overview-rest-authentication
 *
 * sign = base64(HMAC-SHA256(timestamp + METHOD + requestPath + body, secretKey))
 * where `timestamp` is ISO-8601 with millisecond precision, `requestPath`
 * includes the query string for GET requests, and `body` is the exact JSON
 * text sent (empty string when there is no body).
 */

export type OkxHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface OkxSignatureInput {
  readonly timestamp: string;
  readonly method: OkxHttpMethod;
  readonly requestPath: string;
  readonly body: string;
  readonly secretKey: string;
}

export function signOkxRequest(input: OkxSignatureInput): string {
  const prehash = input.timestamp + input.method + input.requestPath + input.body;
  return createHmac("sha256", input.secretKey).update(prehash, "utf8").digest("base64");
}

export interface OkxAuthHeadersInput {
  readonly credentials: {
    readonly apiKey: string;
    readonly apiSecret: string;
    readonly apiPassphrase: string;
  };
  readonly method: OkxHttpMethod;
  readonly requestPath: string;
  readonly body: string;
  readonly now?: () => Date;
}

export function createOkxAuthHeaders(input: OkxAuthHeadersInput): Record<string, string> {
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  const sign = signOkxRequest({
    timestamp,
    method: input.method,
    requestPath: input.requestPath,
    body: input.body,
    secretKey: input.credentials.apiSecret,
  });

  return {
    "OK-ACCESS-KEY": input.credentials.apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": input.credentials.apiPassphrase,
    "Content-Type": "application/json",
  };
}
