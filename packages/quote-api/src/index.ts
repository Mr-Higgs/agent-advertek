import type { Quote, QuoteRequest } from "@advertek/types";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";

export const quoteRequestSchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().int().positive(),
  specification: z.record(z.unknown()),
}) satisfies z.ZodType<QuoteRequest>;

export type QuoteCalculator = (request: QuoteRequest) => Promise<Quote>;

export function buildQuoteApi(calculateQuote: QuoteCalculator): FastifyInstance {
  const app = Fastify();

  app.post("/quotes", async (request, reply) => {
    const quoteRequest = quoteRequestSchema.parse(request.body);
    const quote = await calculateQuote(quoteRequest);

    return reply.send({
      ...quote,
      total: {
        ...quote.total,
        amountBaseUnits: quote.total.amountBaseUnits.toString(),
      },
      expiresAt: quote.expiresAt.toISOString(),
    });
  });

  return app;
}
