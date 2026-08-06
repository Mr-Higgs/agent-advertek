import { buildBasicAuthHeader, type FulfillmentConfig } from "./config.js";
import {
  advertekCancelOrderRequestSchema,
  advertekCreateOrderRequestSchema,
  advertekCreateOrderResponseSchema,
  advertekOrderDetailResponseSchema,
  advertekOrderMutationResponseSchema,
  advertekUpdateShippingRequestSchema,
  type AdvertekAddress,
  type AdvertekCreateOrderRequest,
  type AdvertekCreateOrderResponse,
  type AdvertekOrderDetailResponse,
  type AdvertekOrderMutationResponse,
} from "./advertek-api-types.js";

/**
 * Thin, injectable-fetch HTTP transport for Advertek's order-fulfillment
 * API. Deliberately does NOT build request bodies itself — see
 * `request-builder.ts` for that — this module's only job is auth + the
 * exact endpoints/paths, including the intentional `/api/v2/orders` vs.
 * `/api/v1/orders/{id}` version mismatch (do not "fix" it to be
 * consistent; that mismatch is how Advertek's real API is versioned).
 */

export class AdvertekApiError extends Error {
  override readonly name = "AdvertekApiError";
  readonly httpStatus: number;
  readonly body: unknown;

  constructor(message: string, httpStatus: number, body: unknown) {
    super(message);
    this.httpStatus = httpStatus;
    this.body = body;
  }
}

export type AdvertekFetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; json(): Promise<unknown> }>;

export interface AdvertekFulfillmentClient {
  createOrder(request: AdvertekCreateOrderRequest): Promise<AdvertekCreateOrderResponse>;
  getOrderStatus(vendorOrderId: string): Promise<AdvertekOrderDetailResponse>;
  updateShipping(
    vendorOrderId: string,
    shipTo: AdvertekAddress,
  ): Promise<AdvertekOrderMutationResponse>;
  cancelOrder(
    vendorOrderId: string,
    reason?: string,
  ): Promise<AdvertekOrderMutationResponse>;
}

export interface CreateAdvertekFulfillmentClientOptions {
  readonly fetchImpl?: AdvertekFetchLike;
}

export function createAdvertekFulfillmentClient(
  config: FulfillmentConfig,
  options: CreateAdvertekFulfillmentClientOptions = {},
): AdvertekFulfillmentClient {
  const fetchImpl: AdvertekFetchLike = options.fetchImpl ?? fetch;
  const authorization = buildBasicAuthHeader(config);

  async function request(
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const json = await response.json();
    if (response.status >= 400) {
      throw new AdvertekApiError(
        `Advertek fulfillment API request failed: ${method} ${path} -> HTTP ${String(response.status)}`,
        response.status,
        json,
      );
    }
    return json;
  }

  return {
    async createOrder(orderRequest) {
      const validated = advertekCreateOrderRequestSchema.parse(orderRequest);
      const json = await request("POST", "/api/v2/orders", validated);
      return advertekCreateOrderResponseSchema.parse(json);
    },

    async getOrderStatus(vendorOrderId) {
      const json = await request(
        "GET",
        `/api/v1/orders/${encodeURIComponent(vendorOrderId)}`,
      );
      return advertekOrderDetailResponseSchema.parse(json);
    },

    async updateShipping(vendorOrderId, shipTo) {
      const validated = advertekUpdateShippingRequestSchema.parse({ ship_to: shipTo });
      const json = await request(
        "PUT",
        `/api/v1/orders/${encodeURIComponent(vendorOrderId)}`,
        validated,
      );
      return advertekOrderMutationResponseSchema.parse(json);
    },

    async cancelOrder(vendorOrderId, reason) {
      const validated = advertekCancelOrderRequestSchema.parse(
        reason !== undefined ? { reason } : {},
      );
      const json = await request(
        "PUT",
        `/api/v1/orders/${encodeURIComponent(vendorOrderId)}/cancel`,
        validated,
      );
      return advertekOrderMutationResponseSchema.parse(json);
    },
  };
}
