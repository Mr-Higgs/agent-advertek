import type { OrderStatusEvent } from "@advertek/types";
import { z } from "zod";

export const orderStatusWebhookSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "pending-payment",
    "paid",
    "downloaded",
    "printing",
    "printed",
    "shipped",
    "completed",
    "held",
    "cancelled",
    "failed",
  ]),
  occurredAt: z.coerce.date(),
}) satisfies z.ZodType<OrderStatusEvent>;

export interface WebhookSubscription {
  readonly id: string;
  readonly targetUrl: URL;
  readonly signingSecretReference: string;
}

export interface WebhookDispatcher {
  dispatch(
    subscription: WebhookSubscription,
    event: OrderStatusEvent,
  ): Promise<void>;
}
