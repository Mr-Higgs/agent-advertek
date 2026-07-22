import type { Sku } from "@advertek/types";
import { z } from "zod";

export const skuSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  process: z.enum([
    "offset",
    "digital",
    "wide-format",
    "packaging",
    "print-on-demand",
    "direct-mail",
  ]),
  active: z.boolean(),
}) satisfies z.ZodType<Sku>;

export interface CatalogRepository {
  list(): Promise<readonly Sku[]>;
  findById(id: string): Promise<Sku | undefined>;
}

export function parseSku(input: unknown): Sku {
  return skuSchema.parse(input);
}

export {
  PRODUCT_LINE_TO_PRINT_PROCESS,
  isKnownProductLine,
  mapProductLineToPrintProcess,
  mapSkuSpecToPrintProcess,
  resolvePrintProcessFromUnknown,
} from "./product-line-map.js";
