import type { SkuSpec } from "@advertek/types";
import { describe, expect, it, vi } from "vitest";
import {
  createHttpAdvertekPricingClient,
  createHttpSpotRateClient,
  PricingUpstreamError,
  type QuoteApiFetchLike,
} from "./http-clients.js";

const spec: SkuSpec = {
  productLine: "wideFormat",
  dimensions: { width: 610, height: 914 },
  stock: { material: "13oz matte vinyl", weight: 450 },
  finish: ["matte"],
  quantity: 40,
  turnaround: "standard",
  assets: [{ url: "https://assets.example.com/banner.pdf" }],
};

function fakeFetch(
  status: number,
  body: unknown,
): { readonly impl: QuoteApiFetchLike; readonly calls: unknown[][] } {
  const calls: unknown[][] = [];
  const impl: QuoteApiFetchLike = (url, init) => {
    calls.push([url, init]);
    return Promise.resolve({ status, json: () => Promise.resolve(body) });
  };
  return { impl, calls };
}

describe("createHttpAdvertekPricingClient", () => {
  it("posts the spec and returns integer CAD cents as bigint", async () => {
    const { impl, calls } = fakeFetch(200, { priceCadCents: "12500" });
    const client = createHttpAdvertekPricingClient(
      { baseUrl: "https://pricing.example.com", apiKey: "key_1" },
      { fetchImpl: impl },
    );

    await expect(client.quoteCadCents({ spec, printProcess: "wide-format" })).resolves.toBe(
      12_500n,
    );
    expect(calls[0]?.[0]).toBe("https://pricing.example.com/pricing/quotes");
    const init = calls[0]?.[1] as { headers: Record<string, string>; body: string };
    expect(init.headers["Authorization"]).toBe("Bearer key_1");
    expect(JSON.parse(init.body)).toEqual({ spec, printProcess: "wide-format" });
  });

  it("preserves cent amounts beyond Number.MAX_SAFE_INTEGER", async () => {
    const { impl } = fakeFetch(200, { priceCadCents: "9007199254740993" });
    const client = createHttpAdvertekPricingClient(
      { baseUrl: "https://pricing.example.com", apiKey: "key_1" },
      { fetchImpl: impl },
    );

    await expect(
      client.quoteCadCents({ spec, printProcess: "wide-format" }),
    ).resolves.toBe(9_007_199_254_740_993n);
  });

  it("rejects a fractional price rather than rounding it", async () => {
    const { impl } = fakeFetch(200, { priceCadCents: 125.5 });
    const client = createHttpAdvertekPricingClient(
      { baseUrl: "https://pricing.example.com", apiKey: "key_1" },
      { fetchImpl: impl },
    );

    await expect(
      client.quoteCadCents({ spec, printProcess: "wide-format" }),
    ).rejects.toThrow();
  });

  it("throws PricingUpstreamError on an error status", async () => {
    const { impl } = fakeFetch(503, { error: "unavailable" });
    const client = createHttpAdvertekPricingClient(
      { baseUrl: "https://pricing.example.com", apiKey: "key_1" },
      { fetchImpl: impl },
    );

    await expect(
      client.quoteCadCents({ spec, printProcess: "wide-format" }),
    ).rejects.toBeInstanceOf(PricingUpstreamError);
  });
});

describe("createHttpSpotRateClient", () => {
  it("converts the decimal rate to integer USDC base units per CAD dollar", async () => {
    const { impl, calls } = fakeFetch(200, { rate: "0.7312" });
    const client = createHttpSpotRateClient(
      { baseUrl: "https://fx.example.com/cad-usd", apiKey: "fx_key" },
      { fetchImpl: impl },
    );

    await expect(client.getUsdcBaseUnitsPerCadDollar()).resolves.toBe(731_200n);
    const init = calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers["Authorization"]).toBe("Bearer fx_key");
  });

  it("omits the Authorization header when no key is configured", async () => {
    const { impl, calls } = fakeFetch(200, { rate: "0.73" });
    const client = createHttpSpotRateClient(
      { baseUrl: "https://fx.example.com/cad-usd", apiKey: undefined },
      { fetchImpl: impl },
    );

    await client.getUsdcBaseUnitsPerCadDollar();
    const init = calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers["Authorization"]).toBeUndefined();
  });

  it("caches the rate for the configured ttl and refetches after it", async () => {
    const { impl, calls } = fakeFetch(200, { rate: "0.73" });
    const now = vi.fn<[], number>();
    now.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(30_000);
    const client = createHttpSpotRateClient(
      { baseUrl: "https://fx.example.com/cad-usd", apiKey: undefined },
      { fetchImpl: impl, cacheTtlMs: 60_000, now },
    );

    await client.getUsdcBaseUnitsPerCadDollar();
    await client.getUsdcBaseUnitsPerCadDollar();

    expect(calls).toHaveLength(1);
  });

  it("rejects a non-positive rate", async () => {
    const { impl } = fakeFetch(200, { rate: "0" });
    const client = createHttpSpotRateClient(
      { baseUrl: "https://fx.example.com/cad-usd", apiKey: undefined },
      { fetchImpl: impl },
    );

    await expect(client.getUsdcBaseUnitsPerCadDollar()).rejects.toBeInstanceOf(
      PricingUpstreamError,
    );
  });
});
