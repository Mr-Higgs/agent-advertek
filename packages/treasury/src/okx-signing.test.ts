import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createOkxAuthHeaders, signOkxRequest } from "./okx-signing.js";

const secretKey = "test-okx-secret";

function referenceSign(timestamp: string, method: string, requestPath: string, body: string): string {
  return createHmac("sha256", secretKey)
    .update(timestamp + method + requestPath + body, "utf8")
    .digest("base64");
}

describe("signOkxRequest", () => {
  it("matches a HMAC-SHA256+base64 signature computed independently", () => {
    const timestamp = "2020-12-08T09:08:57.715Z";
    const signature = signOkxRequest({
      timestamp,
      method: "GET",
      requestPath: "/api/v5/account/balance?ccy=BTC",
      body: "",
      secretKey,
    });
    expect(signature).toBe(referenceSign(timestamp, "GET", "/api/v5/account/balance?ccy=BTC", ""));
  });

  it("includes the request body in the signature for POST requests", () => {
    const timestamp = "2024-01-01T00:00:00.000Z";
    const body = JSON.stringify({ ccy: "USDC", amt: "100" });
    const signature = signOkxRequest({
      timestamp,
      method: "POST",
      requestPath: "/api/v5/asset/convert/trade",
      body,
      secretKey,
    });
    expect(signature).toBe(referenceSign(timestamp, "POST", "/api/v5/asset/convert/trade", body));
  });

  it("produces a different signature if the secret key differs", () => {
    const timestamp = "2024-01-01T00:00:00.000Z";
    const a = signOkxRequest({
      timestamp,
      method: "GET",
      requestPath: "/api/v5/asset/balances",
      body: "",
      secretKey: "secret-a",
    });
    const b = signOkxRequest({
      timestamp,
      method: "GET",
      requestPath: "/api/v5/asset/balances",
      body: "",
      secretKey: "secret-b",
    });
    expect(a).not.toBe(b);
  });

  it("produces a different signature if the body is tampered with", () => {
    const timestamp = "2024-01-01T00:00:00.000Z";
    const a = signOkxRequest({
      timestamp,
      method: "POST",
      requestPath: "/api/v5/asset/convert/trade",
      body: '{"amt":"100"}',
      secretKey,
    });
    const b = signOkxRequest({
      timestamp,
      method: "POST",
      requestPath: "/api/v5/asset/convert/trade",
      body: '{"amt":"999999"}',
      secretKey,
    });
    expect(a).not.toBe(b);
  });
});

describe("createOkxAuthHeaders", () => {
  it("builds all four required OKX auth headers plus content-type", () => {
    const now = () => new Date("2024-06-01T12:00:00.000Z");
    const headers = createOkxAuthHeaders({
      credentials: { apiKey: "key-1", apiSecret: secretKey, apiPassphrase: "pass-1" },
      method: "GET",
      requestPath: "/api/v5/asset/balances",
      body: "",
      now,
    });

    expect(headers["OK-ACCESS-KEY"]).toBe("key-1");
    expect(headers["OK-ACCESS-PASSPHRASE"]).toBe("pass-1");
    expect(headers["OK-ACCESS-TIMESTAMP"]).toBe("2024-06-01T12:00:00.000Z");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["OK-ACCESS-SIGN"]).toBe(
      referenceSign("2024-06-01T12:00:00.000Z", "GET", "/api/v5/asset/balances", ""),
    );
  });
});
