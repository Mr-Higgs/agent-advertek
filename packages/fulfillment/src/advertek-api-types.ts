import { z } from "zod";

/**
 * Zod schemas for Advertek's order-fulfillment REST API request/response
 * bodies (not to be confused with our own agent-facing `SkuSpec`/`Money`
 * types in `@advertek/types`). These describe exactly what goes over the
 * wire to Advertek, independent of how we model orders internally.
 *
 * Response schemas use `.passthrough()` — we only have Advertek's docs, not
 * their full API contract, so we validate the fields we depend on and
 * tolerate unknown extra fields rather than rejecting a response outright.
 */

export const advertekAssetTypeSchema = z.enum(["cover", "page", "brand", "insert"]);
export type AdvertekAssetType = z.infer<typeof advertekAssetTypeSchema>;

export const advertekAssetSchema = z.object({
  url: z.string().url(),
  type: advertekAssetTypeSchema.optional(),
  sha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "must be a 64-character hex sha256 digest")
    .optional(),
  md5: z
    .string()
    .regex(/^[a-fA-F0-9]{32}$/, "must be a 32-character hex md5 digest")
    .optional(),
});
export type AdvertekAsset = z.infer<typeof advertekAssetSchema>;

export const advertekOptionSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});
export type AdvertekOption = z.infer<typeof advertekOptionSchema>;

/**
 * Free-form string map. We always populate `internal_order_id` (order- and
 * item-level) and `internal_item_id` (item-level) here — see
 * `request-builder.ts` — because it's our only correlation key back to
 * Advertek's own order id.
 */
export const advertekMetadataSchema = z.record(z.string(), z.string());
export type AdvertekMetadata = z.infer<typeof advertekMetadataSchema>;

/** ISO 3166-1 alpha-2 country code, e.g. "CA", "US". */
const countryCodeSchema = z.string().length(2).toUpperCase();

export const advertekAddressSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1).optional(),
  address1: z.string().min(1),
  address2: z.string().min(1).optional(),
  city: z.string().min(1),
  region_code: z.string().min(1).optional(),
  postal_code: z.string().min(1),
  country_code: countryCodeSchema,
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
});
export type AdvertekAddress = z.infer<typeof advertekAddressSchema>;

/**
 * `customs_value` is a decimal-string monetary amount (e.g. "19.99"), never
 * a float, per project convention — see `money.ts` for the bigint-cents to
 * decimal-string conversion used when building this.
 */
const decimalMoneyStringSchema = z
  .string()
  .regex(/^\d+\.\d{2}$/, "must be a decimal string with exactly two fraction digits");

export const advertekOrderItemSchema = z.object({
  product_code: z.string().min(1),
  quantity: z.number().int().positive(),
  /** Page count — only meaningful for paginated products (books, booklets). */
  pages: z.number().int().positive().optional(),
  /**
   * Required whenever the order's `ship_to.country_code` isn't `CA` —
   * enforced by `advertekCreateOrderRequestSchema`'s cross-field check
   * below, not per-item, since a single item's schema can't see its
   * parent order's `ship_to`.
   */
  customs_value: decimalMoneyStringSchema.optional(),
  assets: z.array(advertekAssetSchema).min(1),
  options: z.array(advertekOptionSchema).default([]),
  metadata: advertekMetadataSchema,
});
export type AdvertekOrderItem = z.infer<typeof advertekOrderItemSchema>;

/**
 * Advertek's documented order `type` values aren't fully specified to us —
 * keep this a validated non-empty string rather than fabricating an enum of
 * guessed values. `"standard"` is the only value this codebase currently
 * sends (see `request-builder.ts`).
 */
const advertekOrderTypeSchema = z.string().min(1);

export const advertekCreateOrderRequestSchema = z
  .object({
    type: advertekOrderTypeSchema,
    metadata: advertekMetadataSchema,
    customer_order_number: z.string().min(1),
    /** ISO 8601 timestamp. */
    ordered_at: z.string().datetime(),
    location_code: z.string().min(1),
    shipping_service: z.string().min(1),
    sold_to: advertekAddressSchema,
    ship_to: advertekAddressSchema,
    items: z.array(advertekOrderItemSchema).min(1),
  })
  .superRefine((order, ctx) => {
    if (order.ship_to.country_code === "CA") {
      return;
    }
    order.items.forEach((item, index) => {
      if (item.customs_value === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "customs_value"],
          message:
            "customs_value is required on every item when ship_to.country_code is not CA",
        });
      }
    });
  });
export type AdvertekCreateOrderRequest = z.infer<
  typeof advertekCreateOrderRequestSchema
>;

/** `POST /api/v2/orders` response. */
export const advertekCreateOrderResponseSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough();
export type AdvertekCreateOrderResponse = z.infer<
  typeof advertekCreateOrderResponseSchema
>;

/**
 * Advertek's full raw status vocabulary. Deliberately NOT mapped to our own
 * four-stage `OrderStatus` here — see `status-bridge.ts` for why, and for
 * the TODO covering the missing middle states.
 */
export const advertekOrderStatusSchema = z.enum([
  "accepted",
  "shipped",
  "cancelled",
  "cancelled_after_printing",
]);
export type AdvertekOrderStatus = z.infer<typeof advertekOrderStatusSchema>;

/** `GET /api/v1/orders/{id}` response. */
export const advertekOrderDetailResponseSchema = z
  .object({
    id: z.string().min(1),
    status: advertekOrderStatusSchema,
  })
  .passthrough();
export type AdvertekOrderDetailResponse = z.infer<
  typeof advertekOrderDetailResponseSchema
>;

/** `PUT /api/v1/orders/{id}` request body — shipping-info update only. */
export const advertekUpdateShippingRequestSchema = z.object({
  ship_to: advertekAddressSchema,
});
export type AdvertekUpdateShippingRequest = z.infer<
  typeof advertekUpdateShippingRequestSchema
>;

/** `PUT /api/v1/orders/{id}/cancel` request body. */
export const advertekCancelOrderRequestSchema = z.object({
  reason: z.string().min(1).optional(),
});
export type AdvertekCancelOrderRequest = z.infer<
  typeof advertekCancelOrderRequestSchema
>;

/** Generic response envelope shared by update-shipping / cancel calls. */
export const advertekOrderMutationResponseSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough();
export type AdvertekOrderMutationResponse = z.infer<
  typeof advertekOrderMutationResponseSchema
>;
