import {
  skuSpecSchema,
  type SkuSpec,
} from "@advertek/types";
import type { RealtimeQuote } from "@advertek/quote-api";
import { ZodError, z } from "zod";

export const quoteToolInputSchema = skuSpecSchema;

export const quoteMoneyCadSchema = z.object({
  currency: z.literal("CAD"),
  amountCents: z.string(),
});

export const quoteMoneyUsdcSchema = z.object({
  currency: z.literal("USDC"),
  amountBaseUnits: z.string(),
});

/**
 * MCP SDK outputSchema must be a Zod object (unions are dropped by
 * normalizeObjectSchema). Success and failure share one object shape.
 */
export const quoteToolResultSchema = z.object({
  ok: z.boolean(),
  quote: z
    .object({
      printProcess: z.string(),
      spec: skuSpecSchema,
      priceCad: quoteMoneyCadSchema,
      priceUsdc: quoteMoneyUsdcSchema,
      quotedAt: z.string().datetime(),
    })
    .optional(),
  error: z
    .object({
      code: z.enum(["invalid_sku_spec", "quote_failed"]),
      message: z.string(),
      issues: z
        .array(
          z.object({
            path: z.string(),
            code: z.string(),
            message: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type QuoteToolResult = z.infer<typeof quoteToolResultSchema>;

export type QuoteExecutor = (spec: SkuSpec) => Promise<RealtimeQuote>;

function serializeQuote(quote: RealtimeQuote): QuoteToolResult {
  return {
    ok: true,
    quote: {
      printProcess: quote.printProcess,
      spec: quote.spec,
      priceCad: {
        currency: "CAD",
        amountCents: quote.priceCad.amountCents.toString(),
      },
      priceUsdc: {
        currency: "USDC",
        amountBaseUnits: quote.priceUsdc.amountBaseUnits.toString(),
      },
      quotedAt: quote.quotedAt.toISOString(),
    },
  };
}

export async function buildQuoteToolResult(
  executeQuote: QuoteExecutor,
  input: unknown,
): Promise<QuoteToolResult> {
  const parsed = skuSpecSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "invalid_sku_spec",
        message:
          "The SKU specification failed validation. Fix the listed fields and call get_quote again.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        })),
      },
    };
  }

  try {
    const quote = await executeQuote(parsed.data);
    return serializeQuote(quote);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        error: {
          code: "invalid_sku_spec",
          message:
            "The SKU specification failed validation. Fix the listed fields and call get_quote again.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "quote_failed",
        message:
          error instanceof Error
            ? error.message
            : "Quote generation failed for an unknown reason.",
      },
    };
  }
}
