import type { SkuQuote } from "@advertek/quote-api";
import { UnknownSkuError } from "@advertek/quote-api";
import { ZodError, z } from "zod";

/**
 * Beta shortcut tool: request a quote for one of Advertek's print-on-demand
 * catalog SKUs directly by code (see `get_catalog`'s `skuCatalog`), instead
 * of building a full SKU specification for `get_quote`.
 */

export const skuQuoteToolInputSchema = z.object({
  sku: z
    .string()
    .min(1)
    .describe("A raw POD SKU code from get_catalog's skuCatalog, e.g. \"MUG-11-WHT\"."),
  quantity: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe("Number of units to quote. Defaults to 1."),
});

export const skuQuoteMoneyCadSchema = z.object({
  currency: z.literal("CAD"),
  amountCents: z.string(),
});

export const skuQuoteMoneyUsdcSchema = z.object({
  currency: z.literal("USDC"),
  amountBaseUnits: z.string(),
});

/** MCP SDK outputSchema must be a Zod object — see quote-tool.ts for why success/error share one shape. */
export const skuQuoteToolResultSchema = z.object({
  ok: z.boolean(),
  quote: z
    .object({
      sku: z.string(),
      name: z.string(),
      category: z.string(),
      quantity: z.number(),
      unitPriceCad: skuQuoteMoneyCadSchema,
      priceCad: skuQuoteMoneyCadSchema,
      priceUsdc: skuQuoteMoneyUsdcSchema,
      quotedAt: z.string().datetime(),
    })
    .optional(),
  error: z
    .object({
      code: z.enum(["invalid_input", "unknown_sku", "quote_failed"]),
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

export type SkuQuoteToolResult = z.infer<typeof skuQuoteToolResultSchema>;

export type SkuQuoteExecutor = (input: unknown) => Promise<SkuQuote>;

function serializeSkuQuote(quote: SkuQuote): SkuQuoteToolResult {
  return {
    ok: true,
    quote: {
      sku: quote.sku,
      name: quote.name,
      category: quote.category,
      quantity: quote.quantity,
      unitPriceCad: {
        currency: "CAD",
        amountCents: quote.unitPriceCad.amountCents.toString(),
      },
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

export async function buildSkuQuoteToolResult(
  executeSkuQuote: SkuQuoteExecutor,
  input: unknown,
): Promise<SkuQuoteToolResult> {
  const parsed = skuQuoteToolInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message:
          "The sku/quantity input failed validation. Fix the listed fields and call get_sku_quote again.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        })),
      },
    };
  }

  try {
    const quote = await executeSkuQuote(parsed.data);
    return serializeSkuQuote(quote);
  } catch (error) {
    if (error instanceof UnknownSkuError) {
      return {
        ok: false,
        error: {
          code: "unknown_sku",
          message:
            "That SKU is not in Advertek's print-on-demand catalog. Call get_catalog and use one of the codes in skuCatalog.",
        },
      };
    }
    if (error instanceof ZodError) {
      return {
        ok: false,
        error: {
          code: "invalid_input",
          message:
            "The sku/quantity input failed validation. Fix the listed fields and call get_sku_quote again.",
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
