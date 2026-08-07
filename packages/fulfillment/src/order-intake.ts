import { skuSpecSchema } from "@advertek/types";
import { z } from "zod";
import { advertekAddressSchema, advertekOptionSchema } from "./advertek-api-types.js";
import {
  fulfillmentOrderInputSchema,
  type FulfillmentOrderInput,
} from "./request-builder.js";

/**
 * The JSON wire form of {@link FulfillmentOrderInput}, used at agent-facing
 * order-intake boundaries (`POST /api/orders`, the `create_order` MCP tool).
 *
 * Two deliberate differences from `fulfillmentOrderInputSchema`:
 *
 * - No `internalOrderId`. The order id is minted server-side at intake; an
 *   agent must never choose (or be able to collide with) one.
 * - JSON-native encodings for values TypeScript models as `bigint`/`Date`:
 *   `customsValueUsdCents` arrives as an integer-valued string (or safe
 *   integer number) and is converted to `bigint` here, never through a
 *   float; `orderedAt` arrives as an ISO-8601 timestamp.
 */

/** Integer USD cents on the wire — a decimal string is the canonical form. */
const usdCentsSchema = z
  .union([
    z.bigint(),
    z.number().int().safe(),
    z.string().regex(/^\d+$/, "must be an integer number of cents"),
  ])
  .transform((value) => BigInt(value))
  .refine((value) => value >= 0n, "must be non-negative");

export const fulfillmentOrderIntakeItemSchema = z.object({
  internalItemId: z.string().min(1),
  spec: skuSpecSchema,
  pages: z.number().int().positive().optional(),
  customsValueUsdCents: usdCentsSchema,
  options: z.array(advertekOptionSchema).default([]),
});

export const fulfillmentOrderIntakeSchema = z.object({
  customerOrderNumber: z.string().min(1),
  orderedAt: z.coerce.date().optional(),
  locationCode: z.string().min(1),
  shippingService: z.string().min(1),
  soldTo: advertekAddressSchema,
  shipTo: advertekAddressSchema,
  orderType: z.string().min(1).default("standard"),
  items: z.array(fulfillmentOrderIntakeItemSchema).min(1),
});

export type FulfillmentOrderIntake = z.infer<typeof fulfillmentOrderIntakeSchema>;

/**
 * Stamps the server-minted order id onto a validated intake payload and
 * re-validates the result as a full {@link FulfillmentOrderInput}, so the
 * value persisted at intake is exactly what the fulfillment request builder
 * will later accept.
 */
export function toFulfillmentOrderInput(
  intake: FulfillmentOrderIntake,
  internalOrderId: string,
  orderedAt: Date,
): FulfillmentOrderInput {
  return fulfillmentOrderInputSchema.parse({
    ...intake,
    internalOrderId,
    orderedAt: intake.orderedAt ?? orderedAt,
  });
}
