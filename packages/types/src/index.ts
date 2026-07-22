export type PrintProcess =
  | "offset"
  | "digital"
  | "wide-format"
  | "packaging"
  | "print-on-demand"
  | "direct-mail";

export {
  dimensionsSchema,
  finishSchema,
  productLineSchema,
  skuSpecSchema,
  stockSchema,
  turnaroundSchema,
} from "./sku-spec.js";
export type {
  Dimensions,
  Finish,
  ProductLine,
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

export type OrderStatus =
  | "pending-payment"
  | "paid"
  | "in-production"
  | "shipped"
  | "completed"
  | "cancelled";

export interface OrderStatusEvent {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly occurredAt: Date;
}
