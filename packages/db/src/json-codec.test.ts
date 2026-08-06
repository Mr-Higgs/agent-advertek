import { describe, expect, it } from "vitest";
import { decodePersistedJson, encodePersistedJson } from "./json-codec.js";

describe("persisted JSON codec", () => {
  it("round-trips nested bigints and dates", () => {
    const value = {
      orderId: "ord_1",
      customsValueUsdCents: 19_990n,
      orderedAt: new Date("2026-08-01T12:00:00.000Z"),
      items: [{ amount: 5n, nested: { when: new Date("2026-08-02T00:00:00.000Z") } }],
      plain: "text",
      count: 3,
      flag: true,
      nothing: null,
    };

    const decoded = decodePersistedJson(encodePersistedJson(value));
    expect(decoded).toEqual(value);
    expect((decoded as typeof value).customsValueUsdCents).toBe(19_990n);
  });

  it("encodes bigints as base-10 tagged values, never floats", () => {
    const text = encodePersistedJson({ amount: 1_000_000n });
    expect(text).toBe('{"amount":{"$type":"bigint","value":"1000000"}}');
  });

  it("leaves plain JSON values untouched", () => {
    expect(decodePersistedJson('{"a":1,"b":[true,null,"x"]}')).toEqual({
      a: 1,
      b: [true, null, "x"],
    });
  });
});
