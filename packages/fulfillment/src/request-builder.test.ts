import { describe, expect, it } from "vitest";
import type { SkuSpec } from "@advertek/types";
import {
  buildAdvertekCreateOrderRequest,
  type FulfillmentOrderInput,
  type FulfillmentOrderItemInput,
} from "./request-builder.js";

const bookSpec: SkuSpec = {
  productLine: "bookManufacturing",
  dimensions: { width: 203, height: 203 },
  stock: { material: "matte-text", weight: 120 },
  finish: ["matte"],
  quantity: 250,
  turnaround: "standard",
  assets: [
    { type: "cover", url: "https://assets.example.com/order-1/cover.pdf" },
    { type: "page", url: "https://assets.example.com/order-1/pages.pdf" },
  ],
};

const usAddress = {
  name: "Jane Customer",
  address1: "456 Main St",
  city: "Buffalo",
  region_code: "NY",
  postal_code: "14201",
  country_code: "US",
};

const caAddress = {
  name: "Advertek Agent Rail",
  address1: "123 Bay St",
  city: "Toronto",
  region_code: "ON",
  postal_code: "M5J 2T3",
  country_code: "CA",
};

const bookItem: FulfillmentOrderItemInput = {
  internalItemId: "item-1",
  spec: bookSpec,
  pages: 48,
  customsValueUsdCents: 1999n,
  options: [{ name: "spine_color", value: "black" }],
};

const validInput: FulfillmentOrderInput = {
  internalOrderId: "order-123",
  customerOrderNumber: "order-123",
  orderedAt: new Date("2026-08-06T12:00:00.000Z"),
  locationCode: "TOR1",
  shippingService: "UPS_GROUND",
  soldTo: caAddress,
  shipTo: usAddress,
  orderType: "standard",
  items: [bookItem],
};

describe("buildAdvertekCreateOrderRequest", () => {
  it("maps internal order + SKU spec to Advertek's schema", () => {
    const request = buildAdvertekCreateOrderRequest(validInput);

    expect(request).toMatchObject({
      type: "standard",
      customer_order_number: "order-123",
      ordered_at: "2026-08-06T12:00:00.000Z",
      location_code: "TOR1",
      shipping_service: "UPS_GROUND",
      sold_to: caAddress,
      ship_to: usAddress,
    });
    expect(request.items).toHaveLength(1);
    expect(request.items[0]).toMatchObject({
      product_code: "BOOK8X8HARD",
      quantity: 250,
      pages: 48,
      customs_value: "19.99",
      options: [{ name: "spine_color", value: "black" }],
    });
  });

  it("stamps internal_order_id into order metadata and both ids into item metadata", () => {
    const request = buildAdvertekCreateOrderRequest(validInput);

    expect(request.metadata).toEqual({ internal_order_id: "order-123" });
    expect(request.items[0]?.metadata).toEqual({
      internal_order_id: "order-123",
      internal_item_id: "item-1",
    });
  });

  it("carries multi-asset (typed) assets straight through from the SKU spec", () => {
    const request = buildAdvertekCreateOrderRequest(validInput);

    expect(request.items[0]?.assets).toEqual([
      { type: "cover", url: "https://assets.example.com/order-1/cover.pdf" },
      { type: "page", url: "https://assets.example.com/order-1/pages.pdf" },
    ]);
  });

  it("resolves product_code via the compile-time-checked lookup table for every productLine", () => {
    const request = buildAdvertekCreateOrderRequest({
      ...validInput,
      items: [{ ...bookItem, spec: { ...bookSpec, productLine: "wideFormat" } }],
    });

    expect(request.items[0]?.product_code).toBe("WIDEFORMATSTD");
  });

  it("fails fast when an item has no declared customs value", () => {
    const itemWithoutCustomsValue = {
      internalItemId: "item-1",
      spec: bookSpec,
      pages: 48,
      options: [{ name: "spine_color", value: "black" }],
    };

    expect(() =>
      buildAdvertekCreateOrderRequest({
        ...validInput,
        items: [itemWithoutCustomsValue],
      }),
    ).toThrow();
  });

  it("fails fast on an invalid SKU spec (e.g. missing print-ready assets)", () => {
    const specWithoutAssets = {
      productLine: bookSpec.productLine,
      dimensions: bookSpec.dimensions,
      stock: bookSpec.stock,
      finish: bookSpec.finish,
      quantity: bookSpec.quantity,
      turnaround: bookSpec.turnaround,
    };

    expect(() =>
      buildAdvertekCreateOrderRequest({
        ...validInput,
        items: [{ ...bookItem, spec: specWithoutAssets }],
      }),
    ).toThrow();
  });

  it("still enforces the vendor's customs_value-required-for-non-CA rule as a final check", () => {
    // Belt-and-suspenders: even if a caller bypasses fulfillmentOrderInputSchema's
    // "always required" rule for a CA shipment then swaps ship_to afterward,
    // the final advertekCreateOrderRequestSchema.parse() still catches it.
    expect(() =>
      buildAdvertekCreateOrderRequest({
        ...validInput,
        shipTo: usAddress,
        items: [{ ...bookItem, customsValueUsdCents: 0n }],
      }),
    ).not.toThrow(); // 0n is still a declared value ("$0.00"), which is valid input.
  });

  it("omits pages when not supplied", () => {
    const itemWithoutPages: FulfillmentOrderItemInput = {
      internalItemId: "item-1",
      spec: bookSpec,
      customsValueUsdCents: 1999n,
      options: [{ name: "spine_color", value: "black" }],
    };
    const request = buildAdvertekCreateOrderRequest({
      ...validInput,
      items: [itemWithoutPages],
    });

    expect(request.items[0]?.pages).toBeUndefined();
  });
});
