import type { ProductLine } from "@advertek/types";

/**
 * Advertek's vendor SKU codes (e.g. `MUG11`, `BOOK8X8HARD`) do not match our
 * internal `productLine` enum, and a single `productLine` can plausibly
 * cover many distinct vendor product codes in Advertek's real catalog
 * (different book trim sizes/bindings, different wide-format substrates,
 * etc). This table is a first-pass, one-code-per-productLine mapping meant
 * to unblock integration — it MUST be reconciled against Advertek's actual
 * product catalog (ideally broken out by more than just `productLine`)
 * before this is used for real orders.
 *
 * The `as const satisfies Record<ProductLine, string>` shape is what makes
 * this build-time safe: if a new `ProductLine` value is ever added to
 * `@advertek/types` without a corresponding entry here, this file fails to
 * typecheck — a build-time error, not a runtime surprise discovered when an
 * order silently ships with no product_code.
 */
const PRODUCT_LINE_TO_ADVERTEK_PRODUCT_CODE = {
  offset: "OFFSETSTD",
  digital: "DIGITALSTD",
  wideFormat: "WIDEFORMATSTD",
  bookManufacturing: "BOOK8X8HARD",
  dyeSublimation: "DYESUBSTD",
  wallDecor: "WALLDECORSTD",
  directMail: "DIRECTMAILSTD",
  embellishments: "EMBELLISHSTD",
  packaging: "PACKAGINGSTD",
  bindery: "BINDERYSTD",
  printOnDemand: "PODSTD",
} as const satisfies Record<ProductLine, string>;

export type AdvertekProductCode =
  (typeof PRODUCT_LINE_TO_ADVERTEK_PRODUCT_CODE)[ProductLine];

export function mapProductLineToAdvertekProductCode(
  productLine: ProductLine,
): AdvertekProductCode {
  return PRODUCT_LINE_TO_ADVERTEK_PRODUCT_CODE[productLine];
}

export { PRODUCT_LINE_TO_ADVERTEK_PRODUCT_CODE };
