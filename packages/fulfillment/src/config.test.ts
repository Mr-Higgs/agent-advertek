import { describe, expect, it } from "vitest";
import { buildBasicAuthHeader, loadFulfillmentConfig } from "./config.js";

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

  it("rejects a missing username", () => {
    expect(() =>
      loadFulfillmentConfig({ ...validEnv, ADVERTEK_API_USERNAME: undefined }),
    ).toThrow(/ADVERTEK_API_USERNAME/);
  });

  it("rejects an empty password", () => {
    expect(() =>
      loadFulfillmentConfig({ ...validEnv, ADVERTEK_API_PASSWORD: "" }),
    ).toThrow(/ADVERTEK_API_PASSWORD/);
  });

  it("rejects a missing base URL", () => {
    expect(() =>
      loadFulfillmentConfig({ ...validEnv, ADVERTEK_API_BASE_URL: undefined }),
    ).toThrow(/ADVERTEK_API_BASE_URL/);
  });

  it("rejects a malformed base URL", () => {
    expect(() =>
      loadFulfillmentConfig({ ...validEnv, ADVERTEK_API_BASE_URL: "not-a-url" }),
    ).toThrow();
  });

  it("rejects a plain HTTP base URL — Basic Auth must never travel over plaintext", () => {
    expect(() =>
      loadFulfillmentConfig({
        ...validEnv,
        ADVERTEK_API_BASE_URL: "http://api.advertek.example.com",
      }),
    ).toThrow(/https/);
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
});
