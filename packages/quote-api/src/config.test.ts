import { describe, expect, it } from "vitest";
import {
  loadAdvertekPricingConfig,
  loadSpotRateConfig,
  tryLoadAdvertekPricingConfig,
  tryLoadSpotRateConfig,
} from "./config.js";

describe("loadAdvertekPricingConfig", () => {
  it("loads the endpoint and credential", () => {
    expect(
      loadAdvertekPricingConfig({
        ADVERTEK_PRICING_API_URL: "https://pricing.example.com",
        ADVERTEK_PRICING_API_KEY: "key_1",
      }),
    ).toEqual({ baseUrl: "https://pricing.example.com", apiKey: "key_1" });
  });

  it("rejects a plaintext endpoint on a non-local host", () => {
    expect(() =>
      loadAdvertekPricingConfig({
        ADVERTEK_PRICING_API_URL: "http://pricing.example.com",
        ADVERTEK_PRICING_API_KEY: "key_1",
      }),
    ).toThrow(/ADVERTEK_PRICING_API_URL/);
  });

  it("allows a loopback http endpoint for local mock servers", () => {
    expect(() =>
      loadAdvertekPricingConfig({
        ADVERTEK_PRICING_API_URL: "http://localhost:8081",
        ADVERTEK_PRICING_API_KEY: "key_1",
      }),
    ).not.toThrow();
  });

  it("rejects a configured endpoint with no credential", () => {
    expect(() =>
      loadAdvertekPricingConfig({
        ADVERTEK_PRICING_API_URL: "https://pricing.example.com",
      }),
    ).toThrow(/ADVERTEK_PRICING_API_KEY/);
  });
});

describe("tryLoadAdvertekPricingConfig", () => {
  it("returns undefined when the integration is not provisioned", () => {
    expect(tryLoadAdvertekPricingConfig({})).toBeUndefined();
  });

  it("still throws for a half-configured integration", () => {
    expect(() =>
      tryLoadAdvertekPricingConfig({
        ADVERTEK_PRICING_API_URL: "https://pricing.example.com",
      }),
    ).toThrow(/ADVERTEK_PRICING_API_KEY/);
  });
});

describe("spot-rate config", () => {
  it("treats the API key as optional", () => {
    expect(loadSpotRateConfig({ SPOT_RATE_API_URL: "https://fx.example.com" })).toEqual({
      baseUrl: "https://fx.example.com",
      apiKey: undefined,
    });
  });

  it("returns undefined when unprovisioned", () => {
    expect(tryLoadSpotRateConfig({})).toBeUndefined();
  });

  it("rejects a plaintext endpoint on a non-local host", () => {
    expect(() =>
      loadSpotRateConfig({ SPOT_RATE_API_URL: "http://fx.example.com" }),
    ).toThrow(/SPOT_RATE_API_URL/);
  });
});
