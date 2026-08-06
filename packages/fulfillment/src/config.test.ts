import { describe, expect, it } from "vitest";
import {
  ADVERTEK_STAGING_BASE_URL,
  buildBasicAuthHeader,
  loadAdvertekWebhookConfig,
  loadFulfillmentConfig,
} from "./config.js";

const validEnv: NodeJS.ProcessEnv = {
  ADVERTEK_API_USERNAME: "advertek-agent-rail",
  ADVERTEK_API_PASSWORD: "s3cret",
  ADVERTEK_API_BASE_URL: "https://api.advertek.example.com",
};

describe("loadFulfillmentConfig", () => {
  it("loads valid config from env", () => {
    expect(loadFulfillmentConfig(validEnv)).toEqual({
      username: "advertek-agent-rail",
      password: "s3cret",
      baseUrl: "https://api.advertek.example.com",
    });
  });

  it("defaults to the staging base URL outside production when unset", () => {
    const config = loadFulfillmentConfig({
      ...validEnv,
      ADVERTEK_API_BASE_URL: undefined,
      NODE_ENV: "development",
    });
    expect(config.baseUrl).toBe(ADVERTEK_STAGING_BASE_URL);
  });

  it("defaults to the staging base URL when NODE_ENV is unset", () => {
    const config = loadFulfillmentConfig({
      ...validEnv,
      ADVERTEK_API_BASE_URL: undefined,
      NODE_ENV: undefined,
    });
    expect(config.baseUrl).toBe(ADVERTEK_STAGING_BASE_URL);
  });

  it("fails fast when the base URL is missing in production", () => {
    expect(() =>
      loadFulfillmentConfig({
        ...validEnv,
        ADVERTEK_API_BASE_URL: undefined,
        NODE_ENV: "production",
      }),
    ).toThrow(/ADVERTEK_API_BASE_URL/);
  });

  it("accepts an explicit base URL in production", () => {
    const config = loadFulfillmentConfig({ ...validEnv, NODE_ENV: "production" });
    expect(config.baseUrl).toBe("https://api.advertek.example.com");
  });

  it("rejects a missing username when the base URL is a non-local host", () => {
    expect(() =>
      loadFulfillmentConfig({ ...validEnv, ADVERTEK_API_USERNAME: undefined }),
    ).toThrow(/ADVERTEK_API_USERNAME/);
  });

  it("rejects an empty password", () => {
    expect(() =>
      loadFulfillmentConfig({ ...validEnv, ADVERTEK_API_PASSWORD: "" }),
    ).toThrow(/ADVERTEK_API_PASSWORD/);
  });

  it("rejects credentials missing against the defaulted staging URL (a non-local host)", () => {
    expect(() =>
      loadFulfillmentConfig({
        ADVERTEK_API_USERNAME: undefined,
        ADVERTEK_API_PASSWORD: undefined,
        ADVERTEK_API_BASE_URL: undefined,
        NODE_ENV: "development",
      }),
    ).toThrow(/ADVERTEK_API_USERNAME/);
  });

  it("allows missing credentials when the base URL is a loopback host", () => {
    const config = loadFulfillmentConfig({
      ADVERTEK_API_USERNAME: undefined,
      ADVERTEK_API_PASSWORD: undefined,
      ADVERTEK_API_BASE_URL: "http://localhost:4000",
    });
    expect(config).toEqual({
      username: undefined,
      password: undefined,
      baseUrl: "http://localhost:4000",
    });
  });

  it("rejects a malformed base URL", () => {
    expect(() =>
      loadFulfillmentConfig({ ...validEnv, ADVERTEK_API_BASE_URL: "not-a-url" }),
    ).toThrow();
  });

  it("rejects a plain HTTP base URL for a non-local host — Basic Auth must never travel over plaintext", () => {
    expect(() =>
      loadFulfillmentConfig({
        ...validEnv,
        ADVERTEK_API_BASE_URL: "http://api.advertek.example.com",
      }),
    ).toThrow(/https/);
  });

  it("accepts a plain HTTP base URL for 127.0.0.1", () => {
    const config = loadFulfillmentConfig({
      ADVERTEK_API_USERNAME: undefined,
      ADVERTEK_API_PASSWORD: undefined,
      ADVERTEK_API_BASE_URL: "http://127.0.0.1:4000",
    });
    expect(config.baseUrl).toBe("http://127.0.0.1:4000");
  });
});

describe("buildBasicAuthHeader", () => {
  it("base64-encodes username:password", () => {
    const header = buildBasicAuthHeader({
      username: "advertek-agent-rail",
      password: "s3cret",
      baseUrl: "https://api.advertek.example.com",
    });

    expect(header).toBe(
      `Basic ${Buffer.from("advertek-agent-rail:s3cret", "utf8").toString("base64")}`,
    );
  });

  it("returns undefined when credentials are absent (loopback-only config)", () => {
    const header = buildBasicAuthHeader({
      username: undefined,
      password: undefined,
      baseUrl: "http://localhost:4000",
    });
    expect(header).toBeUndefined();
  });
});

const validWebhookEnv: NodeJS.ProcessEnv = {
  ADVERTEK_WEBHOOK_USERNAME: "advertek-webhook-caller",
  ADVERTEK_WEBHOOK_PASSWORD: "w3bhook-s3cret",
};

describe("loadAdvertekWebhookConfig", () => {
  it("loads valid webhook credentials from env", () => {
    expect(loadAdvertekWebhookConfig(validWebhookEnv)).toEqual({
      username: "advertek-webhook-caller",
      password: "w3bhook-s3cret",
    });
  });

  it("rejects a missing username", () => {
    expect(() =>
      loadAdvertekWebhookConfig({ ...validWebhookEnv, ADVERTEK_WEBHOOK_USERNAME: undefined }),
    ).toThrow(/ADVERTEK_WEBHOOK_USERNAME/);
  });

  it("rejects a missing password", () => {
    expect(() =>
      loadAdvertekWebhookConfig({ ...validWebhookEnv, ADVERTEK_WEBHOOK_PASSWORD: undefined }),
    ).toThrow(/ADVERTEK_WEBHOOK_PASSWORD/);
  });
});
