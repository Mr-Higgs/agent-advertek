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

export const skuSpecSchema = z.object({
  productLine: productLineSchema,
  dimensions: dimensionsSchema,
  stock: stockSchema,
  finish: z.array(finishSchema),
  quantity: z.number().int().positive(),
  turnaround: turnaroundSchema,
});

export type ProductLine = z.infer<typeof productLineSchema>;
export type Finish = z.infer<typeof finishSchema>;
export type Turnaround = z.infer<typeof turnaroundSchema>;
export type Dimensions = z.infer<typeof dimensionsSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type SkuSpec = z.infer<typeof skuSpecSchema>;
