import { skuSpecSchema } from "@advertek/types";
import { z } from "zod";
import {
  advertekAddressSchema,
  advertekCreateOrderRequestSchema,
  advertekOptionSchema,
  type AdvertekCreateOrderRequest,
} from "./advertek-api-types.js";
import { formatUsdCentsAsDecimalString } from "./money.js";
import { mapProductLineToAdvertekProductCode } from "./product-code-map.js";

/**
 * Our internal representation of one order line, mapped 1:1 to a single
 * agent-facing `SkuSpec`. `customsValueUsdCents` is required unconditionally
 * here even though Advertek only *requires* it when `ship_to.country_code`
 * isn't `CA` — most target orders are U.S.-based, so we treat it as
 * effectively always-required and fail fast (a `ZodError` right here) if
 * the upstream quote/order didn't carry a declared value through, rather
 * than silently omitting it and finding out from customs later.
 */
export const fulfillmentOrderItemInputSchema = z.object({
  internalItemId: z.string().min(1),
  spec: skuSpecSchema,
  /** Page count — only meaningful for paginated products (books, booklets). */
  pages: z.number().int().positive().optional(),
  /** Declared value for customs, in integer USD cents (never a float). */
  customsValueUsdCents: z.bigint().nonnegative(),
  options: z.array(advertekOptionSchema).default([]),
});
export type FulfillmentOrderItemInput = z.infer<
  typeof fulfillmentOrderItemInputSchema
>;

export const fulfillmentOrderInputSchema = z.object({
  internalOrderId: z.string().min(1),
  customerOrderNumber: z.string().min(1),
  orderedAt: z.date(),
  locationCode: z.string().min(1),
  shippingService: z.string().min(1),
  soldTo: advertekAddressSchema,
  shipTo: advertekAddressSchema,
  /**
   * Advertek's documented `type` values aren't fully specified to us; see
   * the note on `advertekOrderTypeSchema` in `advertek-api-types.ts`.
   */
  orderType: z.string().min(1).default("standard"),
  items: z.array(fulfillmentOrderItemInputSchema).min(1),
});
export type FulfillmentOrderInput = z.infer<typeof fulfillmentOrderInputSchema>;

/**
 * Maps our internal order + SKU specs onto Advertek's `POST /api/v2/orders`
 * request schema.
 *
 * - Validates `input` against `fulfillmentOrderInputSchema` first (fails
 *   fast on, e.g., a missing declared customs value or an invalid SKU
 *   spec) before any vendor-shaped object is constructed.
 * - Resolves each item's vendor `product_code` via the compile-time-checked
 *   product-code lookup table — never inline conditionals, never a runtime
 *   "no mapping found" case.
 * - Stamps `internal_order_id` into the order's `metadata` and both
 *   `internal_order_id` + `internal_item_id` into every item's `metadata`
 *   — our only correlation key back to Advertek's order id.
 * - Re-validates the assembled request against
 *   `advertekCreateOrderRequestSchema`, which enforces the real
 *   `customs_value` cross-field rule (required whenever
 *   `ship_to.country_code !== "CA"`) as a final defense-in-depth check.
 */
export function buildAdvertekCreateOrderRequest(
  rawInput: unknown,
): AdvertekCreateOrderRequest {
  const input = fulfillmentOrderInputSchema.parse(rawInput);

  const request = {
    type: input.orderType,
    metadata: { internal_order_id: input.internalOrderId },
    customer_order_number: input.customerOrderNumber,
    ordered_at: input.orderedAt.toISOString(),
    location_code: input.locationCode,
    shipping_service: input.shippingService,
    sold_to: input.soldTo,
    ship_to: input.shipTo,
    items: input.items.map((item) => ({
      product_code: mapProductLineToAdvertekProductCode(item.spec.productLine),
      quantity: item.spec.quantity,
      ...(item.pages !== undefined ? { pages: item.pages } : {}),
      customs_value: formatUsdCentsAsDecimalString(item.customsValueUsdCents),
      assets: item.spec.assets,
      options: item.options,
      metadata: {
        internal_order_id: input.internalOrderId,
        internal_item_id: item.internalItemId,
      },
    })),
  };

  return advertekCreateOrderRequestSchema.parse(request);
}
