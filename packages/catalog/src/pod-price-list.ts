import type { Sku } from "@advertek/types";
import { z } from "zod";
import type { CatalogRepository } from "./index.js";

/**
 * Advertek's print-on-demand (POD) product price list — transcribed from
 * "ADAM Sku Sample Price List August 5 2026.xlsx" (shared via Google
 * Sheets). Every amount is an integer count of cents (never a float), per
 * project convention.
 *
 * NOTE ON THE T-SHIRTS SECTION: in the source sheet, the SKU column for the
 * "Crewneck T-shirt" rows renders visually offset by one row from the
 * product-name/price columns (an artifact of the sheet's sub-header rows
 * for "(vertical image)" / "(horizontal image)" not having their own SKU
 * cell). The 8 t-shirt SKUs below were reconstructed by matching each
 * SKU's `-S`/`-M`/`-L`/`-XL` suffix to its corresponding size row in
 * top-to-bottom order — please double check this section against the
 * source spreadsheet directly before relying on it for real orders.
 */

export const podCategorySchema = z.enum([
  "blankets",
  "t-shirts",
  "mugs",
  "playing-cards",
  "puzzles",
  "towels",
  "canvas-gallery-wrap",
  "canvas-framed",
  "framed-prints",
  "photo-books",
  "calendars",
]);
export type PodCategory = z.infer<typeof podCategorySchema>;

export const podPriceListEntrySchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: podCategorySchema,
  wholesaleUsdCents: z.bigint().nonnegative(),
  msrpUsdCents: z.bigint().nonnegative(),
  wholesaleCadCents: z.bigint().nonnegative(),
  msrpCadCents: z.bigint().nonnegative(),
});
export type PodPriceListEntry = z.infer<typeof podPriceListEntrySchema>;

const RAW_POD_PRICE_LIST: readonly PodPriceListEntry[] = [
  // Blankets / Sherpa Fleece Blankets
  {
    sku: "BLK-SHR-M-6050",
    name: "Medium Sherpa Fleece Blanket (60x50, horizontal)",
    category: "blankets",
    wholesaleUsdCents: 4510n,
    msrpUsdCents: 9299n,
    wholesaleCadCents: 5500n,
    msrpCadCents: 8250n,
  },
  {
    sku: "BLK-SHR-L-8060",
    name: "Large Sherpa Fleece Blanket (80x60, horizontal)",
    category: "blankets",
    wholesaleUsdCents: 4637n,
    msrpUsdCents: 9499n,
    wholesaleCadCents: 5655n,
    msrpCadCents: 8483n,
  },

  // T-Shirts — Crewneck T-shirt, white/pink/navy/black/sport grey (see
  // module doc comment above re: reconstructed SKU alignment).
  {
    sku: "TEE-CN-V-S",
    name: "Crewneck T-shirt (vertical image) - Adult Small",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },
  {
    sku: "TEE-CN-V-M",
    name: "Crewneck T-shirt (vertical image) - Adult Medium",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },
  {
    sku: "TEE-CN-V-L",
    name: "Crewneck T-shirt (vertical image) - Adult Large",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },
  {
    sku: "TEE-CN-V-XL",
    name: "Crewneck T-shirt (vertical image) - Adult Extra Large",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },
  {
    sku: "TEE-CN-H-S",
    name: "Crewneck T-shirt (horizontal image) - Adult Small",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },
  {
    sku: "TEE-CN-H-M",
    name: "Crewneck T-shirt (horizontal image) - Adult Medium",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },
  {
    sku: "TEE-CN-H-L",
    name: "Crewneck T-shirt (horizontal image) - Adult Large",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },
  {
    sku: "TEE-CN-H-XL",
    name: "Crewneck T-shirt (horizontal image) - Adult Extra Large",
    category: "t-shirts",
    wholesaleUsdCents: 1344n,
    msrpUsdCents: 2799n,
    wholesaleCadCents: 1639n,
    msrpCadCents: 2459n,
  },

  // Mugs
  {
    sku: "MUG-11-WHT",
    name: "11oz White Mug",
    category: "mugs",
    wholesaleUsdCents: 705n,
    msrpUsdCents: 1499n,
    wholesaleCadCents: 860n,
    msrpCadCents: 1290n,
  },
  {
    sku: "MUG-15-WHT",
    name: "15oz White Mug",
    category: "mugs",
    wholesaleUsdCents: 861n,
    msrpUsdCents: 1799n,
    wholesaleCadCents: 1050n,
    msrpCadCents: 1575n,
  },
  {
    sku: "MUG-20-WHT",
    name: "20oz White Mug",
    category: "mugs",
    wholesaleUsdCents: 1246n,
    msrpUsdCents: 2499n,
    wholesaleCadCents: 1520n,
    msrpCadCents: 2280n,
  },
  {
    sku: "MUG-17-LAT",
    name: "17oz White Latte Mug",
    category: "mugs",
    wholesaleUsdCents: 1128n,
    msrpUsdCents: 2199n,
    wholesaleCadCents: 1375n,
    msrpCadCents: 2063n,
  },

  // Playing Cards
  {
    sku: "CARD-POKER",
    name: "Playing Cards - High Quality Poker Cards",
    category: "playing-cards",
    wholesaleUsdCents: 1152n,
    msrpUsdCents: 3499n,
    wholesaleCadCents: 1405n,
    msrpCadCents: 2108n,
  },

  // Puzzles
  {
    sku: "PUZ-315-V",
    name: "Medium Puzzle, vertical - 315 pieces",
    category: "puzzles",
    wholesaleUsdCents: 1657n,
    msrpUsdCents: 3199n,
    wholesaleCadCents: 2021n,
    msrpCadCents: 3032n,
  },
  {
    sku: "PUZ-315-H",
    name: "Medium Puzzle, horizontal - 315 pieces",
    category: "puzzles",
    wholesaleUsdCents: 1657n,
    msrpUsdCents: 3199n,
    wholesaleCadCents: 2021n,
    msrpCadCents: 3032n,
  },
  {
    sku: "PUZ-1000-V",
    name: "Large Puzzle, vertical - 1000 pieces",
    category: "puzzles",
    wholesaleUsdCents: 2302n,
    msrpUsdCents: 4099n,
    wholesaleCadCents: 2807n,
    msrpCadCents: 4211n,
  },
  {
    sku: "PUZ-1000-H",
    name: "Large Puzzle, horizontal - 1000 pieces",
    category: "puzzles",
    wholesaleUsdCents: 2302n,
    msrpUsdCents: 4099n,
    wholesaleCadCents: 2807n,
    msrpCadCents: 4211n,
  },

  // Towels
  {
    sku: "TWL-3060-V",
    name: "Towel (30x60, vertical)",
    category: "towels",
    wholesaleUsdCents: 2870n,
    msrpUsdCents: 4399n,
    wholesaleCadCents: 3500n,
    msrpCadCents: 5250n,
  },
  {
    sku: "TWL-6030-H",
    name: "Towel (60x30, horizontal)",
    category: "towels",
    wholesaleUsdCents: 2870n,
    msrpUsdCents: 4399n,
    wholesaleCadCents: 3500n,
    msrpCadCents: 5250n,
  },

  // Gallery Wrapped Canvas without Frame
  {
    sku: "CANVAS-GW-0812",
    name: "Gallery Wrapped Canvas without Frame - 8X12",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 2198n,
    msrpUsdCents: 3297n,
    wholesaleCadCents: 2198n,
    msrpCadCents: 3297n,
  },
  {
    sku: "CANVAS-GW-1114",
    name: "Gallery Wrapped Canvas without Frame - 11X14",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 2844n,
    msrpUsdCents: 4266n,
    wholesaleCadCents: 2844n,
    msrpCadCents: 4266n,
  },
  {
    sku: "CANVAS-GW-1212",
    name: "Gallery Wrapped Canvas without Frame - 12X12",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 2781n,
    msrpUsdCents: 4172n,
    wholesaleCadCents: 2781n,
    msrpCadCents: 4172n,
  },
  {
    sku: "CANVAS-GW-1218",
    name: "Gallery Wrapped Canvas without Frame - 12X18",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 3046n,
    msrpUsdCents: 4569n,
    wholesaleCadCents: 3046n,
    msrpCadCents: 4569n,
  },
  {
    sku: "CANVAS-GW-1620",
    name: "Gallery Wrapped Canvas without Frame - 16X20",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 3632n,
    msrpUsdCents: 5448n,
    wholesaleCadCents: 3632n,
    msrpCadCents: 5448n,
  },
  {
    sku: "CANVAS-GW-2020",
    name: "Gallery Wrapped Canvas without Frame - 20X20",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 4153n,
    msrpUsdCents: 6230n,
    wholesaleCadCents: 4153n,
    msrpCadCents: 6230n,
  },
  {
    sku: "CANVAS-GW-2024",
    name: "Gallery Wrapped Canvas without Frame - 20X24",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 4474n,
    msrpUsdCents: 6711n,
    wholesaleCadCents: 4474n,
    msrpCadCents: 6711n,
  },
  {
    sku: "CANVAS-GW-2030",
    name: "Gallery Wrapped Canvas without Frame - 20X30",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 4955n,
    msrpUsdCents: 7433n,
    wholesaleCadCents: 4955n,
    msrpCadCents: 7433n,
  },
  {
    sku: "CANVAS-GW-2436",
    name: "Gallery Wrapped Canvas without Frame - 24X36",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 6272n,
    msrpUsdCents: 9408n,
    wholesaleCadCents: 6272n,
    msrpCadCents: 9408n,
  },
  {
    sku: "CANVAS-GW-3040",
    name: "Gallery Wrapped Canvas without Frame - 30X40",
    category: "canvas-gallery-wrap",
    wholesaleUsdCents: 7716n,
    msrpUsdCents: 11574n,
    wholesaleCadCents: 7716n,
    msrpCadCents: 11574n,
  },

  // Gallery Wrapped Canvas with Frame (Black/White)
  {
    sku: "CANVAS-FRM-BW-0812",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 8X12",
    category: "canvas-framed",
    wholesaleUsdCents: 4371n,
    msrpUsdCents: 6557n,
    wholesaleCadCents: 4371n,
    msrpCadCents: 6557n,
  },
  {
    sku: "CANVAS-FRM-BW-1114",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 11X14",
    category: "canvas-framed",
    wholesaleUsdCents: 5412n,
    msrpUsdCents: 8118n,
    wholesaleCadCents: 5412n,
    msrpCadCents: 8118n,
  },
  {
    sku: "CANVAS-FRM-BW-1212",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 12X12",
    category: "canvas-framed",
    wholesaleUsdCents: 5246n,
    msrpUsdCents: 7869n,
    wholesaleCadCents: 5246n,
    msrpCadCents: 7869n,
  },
  {
    sku: "CANVAS-FRM-BW-1218",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 12X18",
    category: "canvas-framed",
    wholesaleUsdCents: 5922n,
    msrpUsdCents: 8883n,
    wholesaleCadCents: 5922n,
    msrpCadCents: 8883n,
  },
  {
    sku: "CANVAS-FRM-BW-1620",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 16X20",
    category: "canvas-framed",
    wholesaleUsdCents: 7330n,
    msrpUsdCents: 10995n,
    wholesaleCadCents: 7330n,
    msrpCadCents: 10995n,
  },
  {
    sku: "CANVAS-FRM-BW-2020",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 20X20",
    category: "canvas-framed",
    wholesaleUsdCents: 8261n,
    msrpUsdCents: 12392n,
    wholesaleCadCents: 8261n,
    msrpCadCents: 12392n,
  },
  {
    sku: "CANVAS-FRM-BW-2024",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 20X24",
    category: "canvas-framed",
    wholesaleUsdCents: 8993n,
    msrpUsdCents: 13490n,
    wholesaleCadCents: 8993n,
    msrpCadCents: 13490n,
  },
  {
    sku: "CANVAS-FRM-BW-2030",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 20X30",
    category: "canvas-framed",
    wholesaleUsdCents: 10091n,
    msrpUsdCents: 15137n,
    wholesaleCadCents: 10091n,
    msrpCadCents: 15137n,
  },
  {
    sku: "CANVAS-FRM-BW-2436",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 24X36",
    category: "canvas-framed",
    wholesaleUsdCents: 12436n,
    msrpUsdCents: 18654n,
    wholesaleCadCents: 12436n,
    msrpCadCents: 18654n,
  },
  {
    sku: "CANVAS-FRM-BW-3040",
    name: "Gallery Wrapped Canvas with Frame (Blk/Wht) - 30X40",
    category: "canvas-framed",
    wholesaleUsdCents: 14906n,
    msrpUsdCents: 22359n,
    wholesaleCadCents: 14906n,
    msrpCadCents: 22359n,
  },

  // Framed Prints
  {
    sku: "FRAME-0810-BWM",
    name: "8x10 Print with Black Frame and White Mat",
    category: "framed-prints",
    wholesaleUsdCents: 2304n,
    msrpUsdCents: 4599n,
    wholesaleCadCents: 2810n,
    msrpCadCents: 4215n,
  },
  {
    sku: "FRAME-1114-BWM",
    name: "11x14 Print with Black Frame and White Mat",
    category: "framed-prints",
    wholesaleUsdCents: 3108n,
    msrpUsdCents: 6599n,
    wholesaleCadCents: 3790n,
    msrpCadCents: 5685n,
  },
  {
    sku: "FRAME-1620-BWM",
    name: "16x20 Print with Black Frame and White Mat",
    category: "framed-prints",
    wholesaleUsdCents: 3608n,
    msrpUsdCents: 7999n,
    wholesaleCadCents: 4400n,
    msrpCadCents: 6600n,
  },

  // Photo Books — Custom Hard Cover Books
  {
    sku: "BOOK-HC-1212",
    name: "12x12 Press Book with Custom Cover",
    category: "photo-books",
    wholesaleUsdCents: 1697n,
    msrpUsdCents: 3199n,
    wholesaleCadCents: 2070n,
    msrpCadCents: 3105n,
  },
  {
    sku: "BOOK-HC-11085",
    name: "11x8.5 Press Book with Custom Cover",
    category: "photo-books",
    wholesaleUsdCents: 1320n,
    msrpUsdCents: 2499n,
    wholesaleCadCents: 1610n,
    msrpCadCents: 2415n,
  },

  // Calendars
  {
    sku: "CAL-WALL-US",
    name: "11x8.5 12 Month Calendar 12x9 Wall (US Holidays, English)",
    category: "calendars",
    wholesaleUsdCents: 764n,
    msrpUsdCents: 1599n,
    wholesaleCadCents: 932n,
    msrpCadCents: 1398n,
  },
  {
    sku: "CAL-WALL-CA",
    name: "11x8.5 EN-CA 12-Month Calendar 12x9 Wall (Canadian Holidays, English)",
    category: "calendars",
    wholesaleUsdCents: 764n,
    msrpUsdCents: 1599n,
    wholesaleCadCents: 932n,
    msrpCadCents: 1398n,
  },
  {
    sku: "CAL-DESK-1005",
    name: "10x5 Desktop Flip Calendar",
    category: "calendars",
    wholesaleUsdCents: 877n,
    msrpUsdCents: 1999n,
    wholesaleCadCents: 1070n,
    msrpCadCents: 1605n,
  },
];

/**
 * Validated at module load: fails fast (rather than at first lookup) if a
 * transcription mistake ever produces a malformed entry.
 */
export const POD_PRICE_LIST: readonly PodPriceListEntry[] =
  z.array(podPriceListEntrySchema).parse(RAW_POD_PRICE_LIST);

const seenSkus = new Set<string>();
const POD_PRICE_LIST_BY_SKU: ReadonlyMap<string, PodPriceListEntry> = new Map(
  POD_PRICE_LIST.map((entry) => {
    if (seenSkus.has(entry.sku)) {
      throw new Error(`Duplicate POD price list SKU: ${entry.sku}`);
    }
    seenSkus.add(entry.sku);
    return [entry.sku, entry];
  }),
);

/** Looks up a single POD price list entry by its exact SKU code. */
export function getPodPriceListEntry(sku: string): PodPriceListEntry | undefined {
  return POD_PRICE_LIST_BY_SKU.get(sku);
}

/** Returns every POD price list entry in a given category. */
export function listPodPriceListEntriesByCategory(
  category: PodCategory,
): readonly PodPriceListEntry[] {
  return POD_PRICE_LIST.filter((entry) => entry.category === category);
}

function podPriceListEntryToSku(entry: PodPriceListEntry): Sku {
  return { id: entry.sku, name: entry.name, process: "print-on-demand", active: true };
}

/**
 * An in-memory `CatalogRepository` backed by the POD price list — the first
 * concrete implementation of that interface in this codebase.
 */
export function createPodPriceListCatalogRepository(): CatalogRepository {
  return {
    list(): Promise<readonly Sku[]> {
      return Promise.resolve(POD_PRICE_LIST.map(podPriceListEntryToSku));
    },
    findById(id: string): Promise<Sku | undefined> {
      const entry = getPodPriceListEntry(id);
      return Promise.resolve(entry ? podPriceListEntryToSku(entry) : undefined);
    },
  };
}
