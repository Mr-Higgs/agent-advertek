import { describe, expect, it } from "vitest";
import {
  fulfillmentOrderIntakeSchema,
  toFulfillmentOrderInput,
} from "./order-intake.js";

const address = {
  name: "Ada Lovelace",
  address1: "1 Print Way",
  city: "Toronto",
  postal_code: "M1M 1M1",
  country_code: "CA",
};

function intakeJson(overrides: Record<string, unknown> = {}): unknown {
  return {
    customerOrderNumber: "CUST-1",
    locationCode: "NYK",
    shippingService: "ground",
    soldTo: address,
    shipTo: address,
    items: [
      {
        internalItemId: "item_1",
        customsValueUsdCents: "19990",
        spec: {
          productLine: "wideFormat",
          dimensions: { width: 610, height: 914 },
          stock: { material: "13oz matte vinyl", weight: 450 },
          finish: ["matte"],
          quantity: 40,
          turnaround: "standard",
          assets: [{ url: "https://assets.example.com/banner.pdf" }],
        },
      },
    ],
    ...overrides,
  };
}

describe("fulfillmentOrderIntakeSchema", () => {
  it("converts a decimal-string customs value to integer bigint cents", () => {
    const parsed = fulfillmentOrderIntakeSchema.parse(intakeJson());

    expect(parsed.items[0]?.customsValueUsdCents).toBe(19_990n);
  });

  it("preserves cent values beyond Number.MAX_SAFE_INTEGER", () => {
    const parsed = fulfillmentOrderIntakeSchema.parse(
      intakeJson({
        items: [
          {
            ...(intakeJson() as { items: Record<string, unknown>[] }).items[0],
            customsValueUsdCents: "9007199254740993",
          },
        ],
      }),
    );

    expect(parsed.items[0]?.customsValueUsdCents).toBe(9_007_199_254_740_993n);
  });

  it("rejects a fractional customs value rather than rounding it", () => {
    expect(() =>
      fulfillmentOrderIntakeSchema.parse(
        intakeJson({
          items: [
            {
              ...(intakeJson() as { items: Record<string, unknown>[] }).items[0],
              customsValueUsdCents: "199.90",
            },
          ],
        }),
      ),
    ).toThrow();
  });

  it("rejects a client-supplied internal order id by ignoring it", () => {
    const parsed = fulfillmentOrderIntakeSchema.parse(
      intakeJson({ internalOrderId: "ord_client_chosen" }),
    );

    expect(parsed).not.toHaveProperty("internalOrderId");
  });
});

describe("toFulfillmentOrderInput", () => {
  it("stamps the server-minted order id and defaults orderedAt to now", () => {
    const now = new Date("2026-08-07T00:00:00.000Z");
    const input = toFulfillmentOrderInput(
      fulfillmentOrderIntakeSchema.parse(intakeJson()),
      "ord_server",
      now,
    );

    expect(input.internalOrderId).toBe("ord_server");
    expect(input.orderedAt).toEqual(now);
    expect(input.items[0]?.customsValueUsdCents).toBe(19_990n);
  });

  it("keeps an explicitly supplied orderedAt", () => {
    const orderedAt = "2026-08-01T12:00:00.000Z";
    const input = toFulfillmentOrderInput(
      fulfillmentOrderIntakeSchema.parse(intakeJson({ orderedAt })),
      "ord_server",
      new Date("2026-08-07T00:00:00.000Z"),
    );

    expect(input.orderedAt).toEqual(new Date(orderedAt));
  });
});
