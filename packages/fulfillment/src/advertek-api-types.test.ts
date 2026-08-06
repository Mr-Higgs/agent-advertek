import { describe, expect, it } from "vitest";
import {
  advertekAssetSchema,
  advertekCreateOrderRequestSchema,
  advertekOrderDetailResponseSchema,
  advertekOrderItemSchema,
  type AdvertekCreateOrderRequest,
} from "./advertek-api-types.js";

/**
 * NOTE ON `options`: Advertek's own API docs show a malformed JSON example
 * here — a bare array literal with no key immediately before "pages" (a
 * syntax error in their own sample payload). The fixtures below use the
 * corrected, valid structure instead: `options` is always a proper keyed
 * array of `{ name, value }` objects.
 */
const validOrder: AdvertekCreateOrderRequest = {
  type: "standard",
  metadata: { internal_order_id: "order-123" },
  customer_order_number: "order-123",
  ordered_at: "2026-08-06T00:00:00.000Z",
  location_code: "TOR1",
  shipping_service: "UPS_GROUND",
  sold_to: {
    name: "Advertek Agent Rail",
    address1: "123 Bay St",
    city: "Toronto",
    region_code: "ON",
    postal_code: "M5J 2T3",
    country_code: "CA",
  },
  ship_to: {
    name: "Jane Customer",
    address1: "456 Main St",
    city: "Buffalo",
    region_code: "NY",
    postal_code: "14201",
    country_code: "US",
  },
  items: [
    {
      product_code: "BOOK8X8HARD",
      quantity: 2,
      pages: 48,
      customs_value: "19.99",
      assets: [{ url: "https://assets.example.com/order-123/item-1/cover.pdf" }],
      options: [{ name: "spine_color", value: "black" }],
      metadata: { internal_order_id: "order-123", internal_item_id: "item-1" },
    },
  ],
};

describe("advertekOrderItemSchema", () => {
  it("accepts a corrected, validly-keyed options array", () => {
    expect(() => advertekOrderItemSchema.parse(validOrder.items[0])).not.toThrow();
    expect(advertekOrderItemSchema.parse(validOrder.items[0]).options).toEqual([
      { name: "spine_color", value: "black" },
    ]);
  });

  it("defaults options to an empty array when omitted", () => {
    const itemWithoutOptions = {
      product_code: "BOOK8X8HARD",
      quantity: 2,
      customs_value: "19.99",
      assets: [{ url: "https://assets.example.com/order-123/item-1/cover.pdf" }],
      metadata: { internal_order_id: "order-123", internal_item_id: "item-1" },
    };
    expect(advertekOrderItemSchema.parse(itemWithoutOptions).options).toEqual([]);
  });

  it("rejects an options entry missing its name/value keys", () => {
    // Guards against ever regressing toward the docs' malformed shape: every
    // options entry must be a proper `{ name, value }` object, not a bare
    // array or scalar sitting where a keyed field belongs.
    expect(() =>
      advertekOrderItemSchema.parse({
        ...validOrder.items[0],
        options: [["black"]],
      }),
    ).toThrow();
  });
});

describe("advertekCreateOrderRequestSchema", () => {
  it("accepts a fully valid order", () => {
    expect(() => advertekCreateOrderRequestSchema.parse(validOrder)).not.toThrow();
  });

  const itemWithoutCustomsValue = {
    product_code: "BOOK8X8HARD",
    quantity: 2,
    pages: 48,
    assets: [{ url: "https://assets.example.com/order-123/item-1/cover.pdf" }],
    options: [{ name: "spine_color", value: "black" }],
    metadata: { internal_order_id: "order-123", internal_item_id: "item-1" },
  };

  it("requires customs_value on every item when ship_to.country_code is not CA", () => {
    const order = { ...validOrder, items: [itemWithoutCustomsValue] };

    expect(() => advertekCreateOrderRequestSchema.parse(order)).toThrow(
      /customs_value is required/,
    );
  });

  it("does not require customs_value when ship_to.country_code is CA", () => {
    const order = {
      ...validOrder,
      ship_to: { ...validOrder.ship_to, country_code: "CA" },
      items: [itemWithoutCustomsValue],
    };

    expect(() => advertekCreateOrderRequestSchema.parse(order)).not.toThrow();
  });

  it("rejects a malformed customs_value (float-looking but not a valid decimal string)", () => {
    const order = {
      ...validOrder,
      items: [{ ...validOrder.items[0], customs_value: "19.9" }],
    };

    expect(() => advertekCreateOrderRequestSchema.parse(order)).toThrow();
  });

  it("rejects an order with no items", () => {
    expect(() =>
      advertekCreateOrderRequestSchema.parse({ ...validOrder, items: [] }),
    ).toThrow();
  });

  it("rejects a country_code that isn't 2 letters", () => {
    expect(() =>
      advertekCreateOrderRequestSchema.parse({
        ...validOrder,
        ship_to: { ...validOrder.ship_to, country_code: "USA" },
      }),
    ).toThrow();
  });
});

describe("advertekAssetSchema", () => {
  it("accepts an untyped single asset", () => {
    expect(() =>
      advertekAssetSchema.parse({ url: "https://assets.example.com/file.pdf" }),
    ).not.toThrow();
  });

  it("accepts a typed multi-asset entry with checksums", () => {
    expect(() =>
      advertekAssetSchema.parse({
        type: "cover",
        url: "https://assets.example.com/cover.pdf",
        sha256: "a".repeat(64),
        md5: "b".repeat(32),
      }),
    ).not.toThrow();
  });

  it("rejects an unknown asset type", () => {
    expect(() =>
      advertekAssetSchema.parse({
        type: "watermark",
        url: "https://assets.example.com/file.pdf",
      }),
    ).toThrow();
  });
});

describe("advertekOrderDetailResponseSchema", () => {
  it("passes through unknown vendor fields", () => {
    const parsed = advertekOrderDetailResponseSchema.parse({
      id: "adv-order-1",
      status: "shipped",
      tracking_number: "1Z999",
      some_future_field: { nested: true },
    });

    expect(parsed).toMatchObject({
      id: "adv-order-1",
      status: "shipped",
      tracking_number: "1Z999",
    });
  });

  it("rejects an unrecognized status value", () => {
    expect(() =>
      advertekOrderDetailResponseSchema.parse({ id: "adv-order-1", status: "in_production" }),
    ).toThrow();
  });
});
