import { z } from "zod";

export const productLineSchema = z.enum([
  "offset",
  "digital",
  "wideFormat",
  "bookManufacturing",
  "dyeSublimation",
  "wallDecor",
  "directMail",
  "embellishments",
  "packaging",
  "bindery",
  "printOnDemand",
]);

export const finishSchema = z.enum([
  "none",
  "matte",
  "gloss",
  "softTouch",
  "uv",
  "aqueous",
  "laminate",
  "varnish",
  "foil",
  "emboss",
  "deboss",
  "spotUv",
]);

export const turnaroundSchema = z.enum(["standard", "expedited", "rush"]);

export const dimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive().optional(),
});

export const stockSchema = z.object({
  material: z.string().min(1),
  weight: z.number().positive(),
});

/**
 * `type` only matters for multi-asset products (e.g. book manufacturing,
 * which needs a separate cover file vs. interior page file vs. dust-jacket
 * brand asset vs. a loose insert). Single-asset products can omit it and
 * supply one array element.
 */
export const assetTypeSchema = z.enum(["cover", "page", "brand", "insert"]);

const sha256HexSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{64}$/, "must be a 64-character hex sha256 digest");
const md5HexSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{32}$/, "must be a 32-character hex md5 digest");

export const skuAssetSchema = z.object({
  url: z.string().url(),
  type: assetTypeSchema.optional(),
  sha256: sha256HexSchema.optional(),
  md5: md5HexSchema.optional(),
});

/**
 * Print-ready file(s) for the job. Required — Advertek can't produce a job
 * with no asset. A single-element array with no `type` covers the common
 * one-file-per-item case; multi-asset products (books) supply one element
 * per required `type`.
 */
export const skuAssetsSchema = z
  .array(skuAssetSchema)
  .min(1, "at least one print-ready asset is required");

export const skuSpecSchema = z.object({
  productLine: productLineSchema,
  dimensions: dimensionsSchema,
  stock: stockSchema,
  finish: z.array(finishSchema),
  quantity: z.number().int().positive(),
  turnaround: turnaroundSchema,
  assets: skuAssetsSchema,
});

export type ProductLine = z.infer<typeof productLineSchema>;
export type Finish = z.infer<typeof finishSchema>;
export type Turnaround = z.infer<typeof turnaroundSchema>;
export type Dimensions = z.infer<typeof dimensionsSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type AssetType = z.infer<typeof assetTypeSchema>;
export type SkuAsset = z.infer<typeof skuAssetSchema>;
export type SkuAssets = z.infer<typeof skuAssetsSchema>;
export type SkuSpec = z.infer<typeof skuSpecSchema>;
