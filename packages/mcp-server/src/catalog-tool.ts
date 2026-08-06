import { PRODUCT_LINE_TO_PRINT_PROCESS } from "@advertek/catalog";
import {
  assetTypeSchema,
  finishSchema,
  productLineSchema,
  turnaroundSchema,
  type ProductLine,
} from "@advertek/types";
import { z } from "zod";

const PRODUCT_LINE_GUIDES: Record<
  ProductLine,
  { readonly title: string; readonly summary: string }
> = {
  offset: {
    title: "Offset printing",
    summary:
      "High-volume commercial lithography for brochures, catalogs, and marketing collateral.",
  },
  digital: {
    title: "Digital printing",
    summary:
      "Short-run and variable-data digital presses for fast turnaround print jobs.",
  },
  wideFormat: {
    title: "Wide-format printing",
    summary:
      "Large-format graphics such as posters, banners, signage, and display panels.",
  },
  bookManufacturing: {
    title: "Book manufacturing",
    summary:
      "Book and booklet production including text, covers, and binding workflows.",
  },
  dyeSublimation: {
    title: "Dye sublimation",
    summary:
      "Sublimation transfers for textiles, soft signage, and coated hard substrates.",
  },
  wallDecor: {
    title: "Wall décor",
    summary:
      "Wall graphics, murals, canvas wraps, and interior décor print products.",
  },
  directMail: {
    title: "Direct mail",
    summary:
      "Addressed mail pieces, letter packages, and postal-ready marketing campaigns.",
  },
  embellishments: {
    title: "Embellishments",
    summary:
      "Specialty finishing effects such as foil, embossing, and decorative coatings.",
  },
  packaging: {
    title: "Packaging",
    summary:
      "Folders, cartons, sleeves, and other packaging structures for product and retail use.",
  },
  bindery: {
    title: "Bindery",
    summary:
      "Cutting, folding, stitching, perfect binding, and other post-press assembly.",
  },
  printOnDemand: {
    title: "Print on demand",
    summary:
      "On-demand reprints and low-quantity fulfillment without large inventory runs.",
  },
};

export const fieldRequirementSchema = z.object({
  name: z.string(),
  required: z.boolean(),
  type: z.string(),
  description: z.string(),
  allowedValues: z.array(z.string()).optional(),
  unit: z.string().optional(),
});

export const productLineInfoSchema = z.object({
  id: productLineSchema,
  title: z.string(),
  summary: z.string(),
  advertekPrintProcess: z.string(),
});

export const catalogToolResultSchema = z.object({
  provider: z.literal("Advertek"),
  service: z.literal("Advertek Agent Rail"),
  summary: z.string(),
  currencyNotes: z.object({
    quoteCurrency: z.literal("CAD"),
    settlementCurrency: z.literal("USDC"),
    amountEncoding: z.string(),
  }),
  specRequirements: z.array(fieldRequirementSchema),
  productLines: z.array(productLineInfoSchema),
});

export type CatalogToolResult = z.infer<typeof catalogToolResultSchema>;

export function buildCatalogToolResult(): CatalogToolResult {
  return {
    provider: "Advertek",
    service: "Advertek Agent Rail",
    summary:
      "Advertek is a commercial printer. Use this catalog to discover which product lines you can order, what fields a SKU specification must include, and which Advertek print process each product line maps to before requesting a quote.",
    currencyNotes: {
      quoteCurrency: "CAD",
      settlementCurrency: "USDC",
      amountEncoding:
        "CAD amounts are integer cents. USDC amounts are integer base units where 1 USDC = 1_000_000 base units.",
    },
    specRequirements: [
      {
        name: "productLine",
        required: true,
        type: "enum",
        description:
          "Which Advertek product line to price. Must be one of the catalog productLine ids.",
        allowedValues: [...productLineSchema.options],
      },
      {
        name: "dimensions.width",
        required: true,
        type: "number",
        description: "Finished width of the piece.",
        unit: "mm",
      },
      {
        name: "dimensions.height",
        required: true,
        type: "number",
        description: "Finished height of the piece.",
        unit: "mm",
      },
      {
        name: "dimensions.depth",
        required: false,
        type: "number",
        description:
          "Optional finished depth for dimensional or packaging products.",
        unit: "mm",
      },
      {
        name: "stock.material",
        required: true,
        type: "string",
        description:
          "Substrate or paper/material name requested for the job (non-empty).",
      },
      {
        name: "stock.weight",
        required: true,
        type: "number",
        description: "Stock weight as a positive number.",
        unit: "gsm",
      },
      {
        name: "finish",
        required: true,
        type: "enum[]",
        description:
          "Zero or more finishing treatments to apply. Use an empty array when no finish is required.",
        allowedValues: [...finishSchema.options],
      },
      {
        name: "quantity",
        required: true,
        type: "integer",
        description: "Order quantity. Must be a positive integer.",
      },
      {
        name: "turnaround",
        required: true,
        type: "enum",
        description: "Requested production speed.",
        allowedValues: [...turnaroundSchema.options],
      },
      {
        name: "assets",
        required: true,
        type: "array",
        description:
          "One or more print-ready files for the job, each with a URL and optional sha256/md5 checksum. Multi-asset products (e.g. book manufacturing) require a `type` on each asset; single-asset products can supply one untyped entry.",
        allowedValues: [...assetTypeSchema.options],
      },
    ],
    productLines: productLineSchema.options.map((id) => {
      const guide = PRODUCT_LINE_GUIDES[id];
      return {
        id,
        title: guide.title,
        summary: guide.summary,
        advertekPrintProcess: PRODUCT_LINE_TO_PRINT_PROCESS[id],
      };
    }),
  };
}
