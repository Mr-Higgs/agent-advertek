import { buildCatalogToolResult } from "@advertek/mcp-server";
import { jsonResponse } from "@/lib/json";
import { createQuoteExecutors } from "@/lib/quotes";

export const runtime = "nodejs";

/**
 * Keyless read-only view of the same catalog the MCP `get_catalog` tool
 * returns, so the landing page can render provider metadata,
 * specRequirements, productLines, and the POD skuCatalog without an agent.
 *
 * @blocker STEP_11 — the USDC estimates come from the stubbed SpotRateClient
 * in `lib/quotes.ts`; they are non-binding demo values.
 */
export async function GET(): Promise<Response> {
  try {
    const { spotRateClient } = createQuoteExecutors();
    return jsonResponse(await buildCatalogToolResult({ spotRateClient }));
  } catch {
    return jsonResponse({ ok: false, error: "Catalog lookup failed" }, { status: 500 });
  }
}
