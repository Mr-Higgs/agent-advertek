import {
  productLineSchema,
  skuSpecSchema,
  type PrintProcess,
  type ProductLine,
  type SkuSpec,
} from "@advertek/types";

/**
 * Maps agent-facing SKU product lines onto Advertek's existing catalog
 * print processes.
 */
const PRODUCT_LINE_TO_PRINT_PROCESS = {
  offset: "offset",
  digital: "digital",
  wideFormat: "wide-format",
  bookManufacturing: "offset",
  dyeSublimation: "wide-format",
  wallDecor: "wide-format",
  directMail: "direct-mail",
  embellishments: "digital",
  packaging: "packaging",
  bindery: "offset",
  printOnDemand: "print-on-demand",
} as const satisfies Record<ProductLine, PrintProcess>;

export function mapProductLineToPrintProcess(
  productLine: ProductLine,
): PrintProcess {
  return PRODUCT_LINE_TO_PRINT_PROCESS[productLine];
}

export function mapSkuSpecToPrintProcess(spec: SkuSpec): PrintProcess {
  const parsed = skuSpecSchema.parse(spec);
  return mapProductLineToPrintProcess(parsed.productLine);
}

export function resolvePrintProcessFromUnknown(
  input: unknown,
): { spec: SkuSpec; printProcess: PrintProcess } {
  const spec = skuSpecSchema.parse(input);
  return {
    spec,
    printProcess: mapProductLineToPrintProcess(spec.productLine),
  };
}

export function isKnownProductLine(value: unknown): value is ProductLine {
  return productLineSchema.safeParse(value).success;
}

export { PRODUCT_LINE_TO_PRINT_PROCESS };
