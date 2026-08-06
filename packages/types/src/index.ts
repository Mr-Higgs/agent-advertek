export type PrintProcess =
  | "offset"
  | "digital"
  | "wide-format"
  | "packaging"
  | "print-on-demand"
  | "direct-mail";

export {
  assetTypeSchema,
  dimensionsSchema,
  finishSchema,
  productLineSchema,
  skuAssetSchema,
  skuAssetsSchema,
  skuSpecSchema,
  stockSchema,
  turnaroundSchema,
} from "./sku-spec.js";
export type {
  AssetType,
  Dimensions,
  Finish,
  ProductLine,
  SkuAsset,
  SkuAssets,
  SkuSpec,
  Stock,
  Turnaround,
} from "./sku-spec.js";

export type BaseUnitAmount = bigint;

export interface Money {
  readonly currency: "USDC";
  readonly amountBaseUnits: BaseUnitAmount;
}

export interface Sku {
  readonly id: string;
  readonly name: string;
  readonly process: PrintProcess;
  readonly active: boolean;
}

export interface QuoteRequest {
  readonly skuId: string;
  readonly quantity: number;
  readonly specification: Readonly<Record<string, unknown>>;
}

export interface Quote {
  readonly id: string;
  readonly request: QuoteRequest;
  readonly total: Money;
  readonly expiresAt: Date;
}

/**
 * Agent-facing order lifecycle status. `downloaded` / `printing` / `printed`
 * are deliberately kept as distinct stages (not collapsed into a single
 * "in-production" bucket) because Advertek's fulfillment webhook actually
 * distinguishes them — see `@advertek/fulfillment`'s `status-bridge.ts`.
 * `held` and `failed` are likewise their own statuses rather than being
 * folded into `cancelled`: a held or failed order is not the same outcome
 * as a deliberate cancellation, and agents need to be able to tell them
 * apart.
 */
export type OrderStatus =
  | "pending-payment"
  | "paid"
  | "downloaded"
  | "printing"
  | "printed"
  | "shipped"
  | "completed"
  | "held"
  | "cancelled"
  | "failed";

export interface OrderStatusEvent {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly occurredAt: Date;
}
