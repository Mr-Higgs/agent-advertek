import { quoteRequestSchema, type QuoteCalculator } from "@advertek/quote-api";
import { skuSpecSchema, type Quote } from "@advertek/types";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { jsonResponse } from "@/lib/json";
import { createQuoteExecutors } from "@/lib/quotes";

export const runtime = "nodejs";

const QUOTE_TTL_MS = 15 * 60 * 1000;

/**
 * Pricing core behind the REST boundary — the same mocked STEP_11 wiring the
 * MCP tools use. Interprets `specification` as a full `SkuSpec`.
 */
const calculateQuote: QuoteCalculator = async (request) => {
  const { executeQuote } = createQuoteExecutors();
  const realtime = await executeQuote(skuSpecSchema.parse(request.specification));
  return {
    id: randomUUID(),
    request,
    total: {
      currency: "USDC",
      amountBaseUnits: realtime.priceUsdc.amountBaseUnits,
    },
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
  };
};

export async function POST(request: Request): Promise<Response> {
  try {
    const quoteRequest = quoteRequestSchema.parse(await request.json());
    const quote: Quote = await calculateQuote(quoteRequest);
    return jsonResponse(quote);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          ok: false,
          error: "Invalid quote request",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    return jsonResponse(
      { ok: false, error: "Quote generation failed" },
      { status: 500 },
    );
  }
}
