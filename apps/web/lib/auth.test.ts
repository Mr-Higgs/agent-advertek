import { describe, expect, it } from "vitest";
import { apiKeyId, authorizeApiRequest, loadApiAuthConfig } from "./auth";

const config = loadApiAuthConfig({ ADVERTEK_API_KEYS: "key_alpha, key_beta" });

function requestWith(headers: Record<string, string>): Request {
  return new Request("https://rail.example.com/api/orders", {
    method: "POST",
    headers,
  });
}

describe("loadApiAuthConfig", () => {
  it("parses a comma-separated key list and turns auth on", () => {
    expect(config.apiKeys).toEqual(new Set(["key_alpha", "key_beta"]));
    expect(config.authRequired).toBe(true);
  });

  it("leaves auth off when no keys are provisioned", () => {
    expect(loadApiAuthConfig({}).authRequired).toBe(false);
  });

  it("honours an explicit override", () => {
    expect(
      loadApiAuthConfig({
        ADVERTEK_API_KEYS: "key_alpha",
        ADVERTEK_API_AUTH_REQUIRED: "false",
      }).authRequired,
    ).toBe(false);
  });

  it("rejects a non-boolean override rather than guessing", () => {
    expect(() => loadApiAuthConfig({ ADVERTEK_API_AUTH_REQUIRED: "yes" })).toThrow(
      /ADVERTEK_API_AUTH_REQUIRED/,
    );
  });
});

describe("authorizeApiRequest", () => {
  it("accepts a bearer token and identifies the caller by key id, not the key", () => {
    const result = authorizeApiRequest(
      requestWith({ authorization: "Bearer key_alpha" }),
      config,
    );

    expect(result).toEqual({ ok: true, keyId: apiKeyId("key_alpha") });
    expect(JSON.stringify(result)).not.toContain("key_alpha");
  });

  it("accepts the X-API-Key header", () => {
    expect(authorizeApiRequest(requestWith({ "x-api-key": "key_beta" }), config).ok).toBe(
      true,
    );
  });

  it("rejects a missing key with 401", () => {
    expect(authorizeApiRequest(requestWith({}), config)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("rejects an unknown key with 401", () => {
    expect(
      authorizeApiRequest(requestWith({ authorization: "Bearer nope" }), config),
    ).toMatchObject({ ok: false, status: 401 });
  });

  it("fails closed with 503 when auth is required but no keys are configured", () => {
    const misconfigured = loadApiAuthConfig({ ADVERTEK_API_AUTH_REQUIRED: "true" });

    expect(
      authorizeApiRequest(requestWith({ authorization: "Bearer key_alpha" }), misconfigured),
    ).toMatchObject({ ok: false, status: 503 });
  });

  it("allows anonymous access when auth is disabled", () => {
    expect(authorizeApiRequest(requestWith({}), loadApiAuthConfig({}))).toEqual({
      ok: true,
      keyId: "anonymous",
    });
  });
});
