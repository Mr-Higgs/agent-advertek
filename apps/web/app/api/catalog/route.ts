import { buildCatalogToolResult } from "@advertek/mcp-server";
import { jsonResponse } from "@/lib/json";
import { createQuoteExecutors } from "@/lib/quotes";

export const runtime = "nodejs";

/**
 * Keyless read-only view of the same catalog the MCP `get_catalog` tool
 * returns, so the landing page can render provider metadata,
 * specRequirements, productLines, and the POD skuCatalog without an agent.
 * Deliberately unauthenticated — it is public reference data.
 *
 * `demoPricing` reports whether the USDC figures came from the fallback
 * mocks (no pricing/spot-rate endpoints configured) so the UI can label them.
 */
export async function GET(): Promise<Response> {
  try {
    const { spotRateClient, isDemoPricing } = createQuoteExecutors();
    return jsonResponse({
      ...(await buildCatalogToolResult({ spotRateClient })),
      demoPricing: isDemoPricing,
    });
  } catch {
    return jsonResponse({ ok: false, error: "Catalog lookup failed" }, { status: 500 });
  }
}
