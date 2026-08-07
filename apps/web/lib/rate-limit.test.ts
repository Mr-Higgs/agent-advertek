import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  clientIpAddress,
  loadRateLimitConfig,
} from "./rate-limit";

const config = { requestsPerWindow: 3, windowMs: 60_000 };

describe("loadRateLimitConfig", () => {
  it("defaults to 60 requests per minute", () => {
    expect(loadRateLimitConfig({})).toEqual({
      requestsPerWindow: 60,
      windowMs: 60_000,
    });
  });

  it("rejects a non-positive limit", () => {
    expect(() => loadRateLimitConfig({ RATE_LIMIT_REQUESTS_PER_MINUTE: "0" })).toThrow(
      /RATE_LIMIT_REQUESTS_PER_MINUTE/,
    );
  });
});

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks within the window", () => {
    const now = (): number => 1_000;
    const decisions = [1, 2, 3, 4].map(() =>
      checkRateLimit("orders:key:a", config, now),
    );

    expect(decisions.map((decision) => decision.allowed)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(decisions[3]?.retryAfterSeconds).toBe(60);
  });

  it("counts identities independently", () => {
    const now = (): number => 1_000;
    checkRateLimit("orders:key:b", config, now);
    checkRateLimit("orders:key:b", config, now);
    checkRateLimit("orders:key:b", config, now);

    expect(checkRateLimit("orders:key:c", config, now).allowed).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    let clock = 1_000;
    const now = (): number => clock;
    for (let i = 0; i < 4; i += 1) {
      checkRateLimit("orders:key:d", config, now);
    }
    expect(checkRateLimit("orders:key:d", config, now).allowed).toBe(false);

    clock += 61_000;
    expect(checkRateLimit("orders:key:d", config, now).allowed).toBe(true);
  });
});

describe("clientIpAddress", () => {
  it("uses the first x-forwarded-for hop", () => {
    const request = new Request("https://rail.example.com/api/quotes", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });

    expect(clientIpAddress(request)).toBe("203.0.113.7");
  });

  it("falls back to a constant when no forwarding header is present", () => {
    expect(clientIpAddress(new Request("https://rail.example.com/api/quotes"))).toBe(
      "unknown",
    );
  });
});
