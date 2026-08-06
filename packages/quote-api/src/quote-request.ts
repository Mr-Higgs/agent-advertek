import type { Quote, QuoteRequest } from "@advertek/types";
import { z } from "zod";

export const quoteRequestSchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().int().positive(),
  specification: z.record(z.unknown()),
}) satisfies z.ZodType<QuoteRequest>;

export type QuoteCalculator = (request: QuoteRequest) => Promise<Quote>;
