import { describe, expect, it, vi } from "vitest";
import type { AdvertekCreateOrderRequest } from "./advertek-api-types.js";
import {
  AdvertekApiError,
  createAdvertekFulfillmentClient,
  type AdvertekFetchLike,
} from "./advertek-client.js";
import type { FulfillmentConfig } from "./config.js";

const config: FulfillmentConfig = {
  username: "advertek-agent-rail",
  password: "s3cret",
  baseUrl: "https://api.advertek.example.com",
};

const expectedAuthHeader = `Basic ${Buffer.from(
  "advertek-agent-rail:s3cret",
  "utf8",
).toString("base64")}`;

const validCreateOrderRequest: AdvertekCreateOrderRequest = {
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
    postal_code: "M5J 2T3",
    country_code: "CA",
  },
  ship_to: {
    name: "Jane Customer",
    address1: "456 Main St",
    city: "Buffalo",
    postal_code: "14201",
    country_code: "US",
  },
  items: [
    {
      product_code: "BOOK8X8HARD",
      quantity: 2,
      customs_value: "19.99",
      assets: [{ url: "https://assets.example.com/order-123/cover.pdf" }],
      options: [],
      metadata: { internal_order_id: "order-123", internal_item_id: "item-1" },
    },
  ],
};

function fakeFetch(
  responder: (
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string },
  ) => { status: number; json: unknown },
): AdvertekFetchLike {
  return (url, init) => {
    const { status, json } = responder(url, init);
    return Promise.resolve({ status, json: () => Promise.resolve(json) });
  };
}

describe("createAdvertekFulfillmentClient", () => {
  describe("createOrder", () => {
    it("POSTs to /api/v2/orders with Basic Auth and the validated body", async () => {
      const calls: {
        url: string;
        init: { method: string; headers: Record<string, string>; body?: string };
      }[] = [];
      const fetchImpl = fakeFetch((url, init) => {
        calls.push({ url, init });
        return { status: 201, json: { id: "adv-order-1" } };
      });

      const client = createAdvertekFulfillmentClient(config, { fetchImpl });
      const result = await client.createOrder(validCreateOrderRequest);

      expect(result.id).toBe("adv-order-1");
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe("https://api.advertek.example.com/api/v2/orders");
      expect(calls[0]?.init.method).toBe("POST");
      expect(calls[0]?.init.headers["Authorization"]).toBe(expectedAuthHeader);
      expect(JSON.parse(calls[0]?.init.body ?? "{}")).toMatchObject({
        customer_order_number: "order-123",
      });
    });

    it("throws AdvertekApiError on a 4xx/5xx response", async () => {
      const fetchImpl = fakeFetch(() => ({
        status: 422,
        json: { error: "invalid product_code" },
      }));
      const client = createAdvertekFulfillmentClient(config, { fetchImpl });

      await expect(client.createOrder(validCreateOrderRequest)).rejects.toBeInstanceOf(
        AdvertekApiError,
      );
    });

    it("rejects a request that fails schema validation before sending it", async () => {
      const fetchImpl = vi.fn();
      const client = createAdvertekFulfillmentClient(config, { fetchImpl });

      await expect(
        client.createOrder({ ...validCreateOrderRequest, items: [] }),
      ).rejects.toThrow();
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe("getOrderStatus", () => {
    it("GETs /api/v1/orders/{id} (the intentional v1/v2 version mismatch)", async () => {
      const calls: string[] = [];
      const fetchImpl = fakeFetch((url) => {
        calls.push(url);
        return { status: 200, json: { id: "adv-order-1", status: "shipped" } };
      });

      const client = createAdvertekFulfillmentClient(config, { fetchImpl });
      const result = await client.getOrderStatus("adv-order-1");

      expect(result.status).toBe("shipped");
      expect(calls[0]).toBe(
        "https://api.advertek.example.com/api/v1/orders/adv-order-1",
      );
    });

    it("URL-encodes the vendor order id", async () => {
      const calls: string[] = [];
      const fetchImpl = fakeFetch((url) => {
        calls.push(url);
        return { status: 200, json: { id: "adv order/1", status: "accepted" } };
      });

      const client = createAdvertekFulfillmentClient(config, { fetchImpl });
      await client.getOrderStatus("adv order/1");

      expect(calls[0]).toBe(
        "https://api.advertek.example.com/api/v1/orders/adv%20order%2F1",
      );
    });
  });

  describe("updateShipping", () => {
    it("PUTs the new ship_to to /api/v1/orders/{id}", async () => {
      const calls: {
        url: string;
        init: { method: string; body?: string };
      }[] = [];
      const fetchImpl = fakeFetch((url, init) => {
        calls.push({ url, init });
        return { status: 200, json: { id: "adv-order-1" } };
      });

      const client = createAdvertekFulfillmentClient(config, { fetchImpl });
      await client.updateShipping("adv-order-1", validCreateOrderRequest.ship_to);

      expect(calls[0]?.url).toBe(
        "https://api.advertek.example.com/api/v1/orders/adv-order-1",
      );
      expect(calls[0]?.init.method).toBe("PUT");
      expect(JSON.parse(calls[0]?.init.body ?? "{}")).toEqual({
        ship_to: validCreateOrderRequest.ship_to,
      });
    });
  });

  describe("cancelOrder", () => {
    it("PUTs to /api/v1/orders/{id}/cancel with an optional reason", async () => {
      const calls: {
        url: string;
        init: { method: string; body?: string };
      }[] = [];
      const fetchImpl = fakeFetch((url, init) => {
        calls.push({ url, init });
        return { status: 200, json: { id: "adv-order-1" } };
      });

      const client = createAdvertekFulfillmentClient(config, { fetchImpl });
      await client.cancelOrder("adv-order-1", "customer requested cancellation");

      expect(calls[0]?.url).toBe(
        "https://api.advertek.example.com/api/v1/orders/adv-order-1/cancel",
      );
      expect(calls[0]?.init.method).toBe("PUT");
      expect(JSON.parse(calls[0]?.init.body ?? "{}")).toEqual({
        reason: "customer requested cancellation",
      });
    });

    it("omits reason from the body when not provided", async () => {
      const calls: { init: { body?: string } }[] = [];
      const fetchImpl = fakeFetch((_url, init) => {
        calls.push({ init });
        return { status: 200, json: { id: "adv-order-1" } };
      });

      const client = createAdvertekFulfillmentClient(config, { fetchImpl });
      await client.cancelOrder("adv-order-1");

      expect(JSON.parse(calls[0]?.init.body ?? "{}")).toEqual({});
    });
  });
});
