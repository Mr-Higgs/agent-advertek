"use client";

import { useCallback, useState } from "react";
import { z } from "zod";
import { ACCENT, type Theme } from "./theme";

/**
 * Mirrors `catalogToolResultSchema` in `@advertek/mcp-server` for the fields
 * this explorer renders. Kept local so the client bundle does not pull the
 * server-side catalog module in.
 */
const catalogResponseSchema = z.object({
  provider: z.string(),
  service: z.string(),
  summary: z.string(),
  currencyNotes: z.object({
    quoteCurrency: z.string(),
    settlementCurrency: z.string(),
    amountEncoding: z.string(),
  }),
  productLines: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      advertekPrintProcess: z.string(),
    }),
  ),
  skuCatalogNote: z.string(),
  skuCatalog: z.array(
    z.object({
      sku: z.string(),
      name: z.string(),
      category: z.string(),
      priceCad: z.object({ amountCents: z.string() }),
      estimatedPriceUsdc: z.object({ amountBaseUnits: z.string() }),
    }),
  ),
});

type CatalogResponse = z.infer<typeof catalogResponseSchema>;

const quoteResponseSchema = z.object({
  id: z.string(),
  total: z.object({
    currency: z.string(),
    amountBaseUnits: z.string(),
  }),
  expiresAt: z.string(),
});

const TURNAROUNDS = ["standard", "expedited", "rush"] as const;

const quoteFormSchema = z.object({
  sku: z.string().min(1, "Pick a SKU"),
  quantity: z.coerce.number().int("Whole units only").positive("Quantity must be at least 1"),
  turnaround: z.enum(TURNAROUNDS),
  assetUrl: z.string().trim().url("Enter a valid https URL to a print-ready file"),
});

type QuoteForm = z.infer<typeof quoteFormSchema>;
type FieldErrors = Partial<Record<keyof QuoteForm, string>>;

const DEMO_ASSET_URL = "https://example.com/print-ready/demo-artwork.pdf";

/** Mirrors the tool descriptions in `packages/mcp-server/src/create-server.ts`. */
const MCP_TOOLS: ReadonlyArray<{
  readonly name: string;
  readonly title: string;
  readonly description: string;
}> = [
  {
    name: "get_catalog",
    title: "Get Advertek catalog",
    description:
      "Returns the available print product lines, the exact SKU specification fields required to request a quote, and every fixed-price print-on-demand SKU with its CAD price and a non-binding USDC estimate. Call it first when you do not already know the valid productLine values, units, or enums.",
  },
  {
    name: "get_quote",
    title: "Get Advertek print quote",
    description:
      "Validates a complete SKU specification (productLine, dimensions in mm, stock, finish[], quantity, turnaround, assets) and returns a real-time production quote in CAD cents and USDC base units. On validation or pricing failure it returns structured errors with ok=false — agents must never invent prices.",
  },
  {
    name: "get_sku_quote",
    title: "Get Advertek print-on-demand SKU quote (beta)",
    description:
      "Shortcut for the print-on-demand catalog: pass a raw SKU code (e.g. \"MUG-11-WHT\") and a quantity, no full specification needed. Returns MSRP in CAD cents plus the USDC-equivalent settlement amount.",
  },
];

const MCP_CONNECT_SNIPPET = `{
  "mcpServers": {
    "advertek": {
      "type": "streamable-http",
      "url": "https://<this-host>/api/mcp"
    }
  }
}`;

function formatCad(amountCents: string): string {
  const cents = Number(amountCents);
  return Number.isFinite(cents) ? `$${(cents / 100).toFixed(2)} CAD` : "—";
}

function formatUsdc(amountBaseUnits: string): string {
  const baseUnits = Number(amountBaseUnits);
  return Number.isFinite(baseUnits) ? `${(baseUnits / 1_000_000).toFixed(2)} USDC` : "—";
}

type CatalogState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly catalog: CatalogResponse }
  | { readonly status: "error"; readonly message: string };

type QuoteState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "ready"; readonly amountUsdc: string; readonly expiresAt: string }
  | { readonly status: "error"; readonly message: string };

interface IntegrationExplorerProps {
  readonly theme: Theme;
}

/**
 * Read-only tour of the agent rail: fetches the same catalog the MCP
 * `get_catalog` tool returns and prices a sample job through `POST
 * /api/quotes`. No payment, order intake, or settlement runs here.
 *
 * @blocker STEP_11 — quote pricing uses the mocked pricing / spot-rate
 * clients in `lib/quotes.ts`, so every figure shown is a demo value.
 */
export function IntegrationExplorer({ theme: t }: IntegrationExplorerProps) {
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: "idle" });
  const [form, setForm] = useState<Record<keyof QuoteForm, string>>({
    sku: "",
    quantity: "100",
    turnaround: "standard",
    assetUrl: DEMO_ASSET_URL,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  const fetchCatalog = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/catalog");
      if (!response.ok) {
        throw new Error(`Catalog request failed with status ${String(response.status)}`);
      }
      const catalog = catalogResponseSchema.parse(await response.json());
      setCatalogState({ status: "ready", catalog });
      setForm((prev) => ({
        ...prev,
        sku: prev.sku || (catalog.skuCatalog[0]?.sku ?? ""),
      }));
    } catch (error) {
      setCatalogState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not reach the rail.",
      });
    }
  }, []);

  /**
   * Catalog load is explicitly visitor-triggered rather than run on mount so
   * the page never fires a request nobody asked for.
   */
  const loadCatalog = useCallback((): void => {
    setCatalogState({ status: "loading" });
    void fetchCatalog();
  }, [fetchCatalog]);

  async function handleQuote(event: React.SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = quoteFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as keyof QuoteForm] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setQuoteState({ status: "submitting" });
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skuId: parsed.data.sku,
          quantity: parsed.data.quantity,
          specification: {
            productLine: "printOnDemand",
            dimensions: { width: 210, height: 297 },
            stock: { material: "demo stock", weight: 170 },
            finish: [],
            quantity: parsed.data.quantity,
            turnaround: parsed.data.turnaround,
            assets: [{ url: parsed.data.assetUrl }],
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`Quote request failed with status ${String(response.status)}`);
      }
      const quote = quoteResponseSchema.parse(await response.json());
      setQuoteState({
        status: "ready",
        amountUsdc: formatUsdc(quote.total.amountBaseUnits),
        expiresAt: quote.expiresAt,
      });
    } catch (error) {
      setQuoteState({
        status: "error",
        message: error instanceof Error ? error.message : "Quote failed.",
      });
    }
  }

  function copySnippet(): void {
    void navigator.clipboard.writeText(MCP_CONNECT_SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }

  const catalog = catalogState.status === "ready" ? catalogState.catalog : undefined;
  const inputStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    border: `1px solid ${t.line}`,
    color: t.text,
  };

  return (
    <div>
      <div
        className="font-mono text-xs leading-relaxed p-4 mb-8"
        style={{ border: `1px solid ${ACCENT}`, color: t.text }}
      >
        <span style={{ color: ACCENT }}>DEMO PRICING —</span> every CAD and USDC figure
        below is non-binding. Quote pricing runs on mocked pricing and spot-rate wiring
        (STEP_11). Nothing here creates an order, takes payment, or settles funds.
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <button
          type="button"
          onClick={loadCatalog}
          disabled={catalogState.status === "loading"}
          className="font-mono text-xs tracking-widest uppercase px-6 py-3 disabled:opacity-50"
          style={{ backgroundColor: ACCENT, color: "#FFFFFF" }}
        >
          {catalogState.status === "loading"
            ? "Connecting…"
            : catalogState.status === "idle"
              ? "Run test connection"
              : "Re-run test connection"}
        </button>
        <span className="font-mono text-xs" style={{ color: t.mid }}>
          GET /api/catalog — read-only, keyless
        </span>
      </div>

      {catalogState.status === "error" && (
        <p className="text-sm mb-8" style={{ color: ACCENT }}>
          {catalogState.message}
        </p>
      )}

      {catalog && (
        <div className="mb-12">
          <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: t.mid }}>
            {catalog.provider} · {catalog.service}
          </div>
          <p className="text-sm leading-relaxed max-w-3xl mb-8" style={{ color: t.mid }}>
            {catalog.summary}
          </p>

          <div className="font-mono text-xs tracking-widest uppercase mb-4">Product lines</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6 mb-12">
            {catalog.productLines.map((line) => (
              <div key={line.id} className="pt-4" style={{ borderTop: `1px solid ${t.line}` }}>
                <div className="font-mono text-sm mb-1">{line.id}</div>
                <div className="text-sm mb-1">{line.title}</div>
                <div className="text-xs" style={{ color: t.mid }}>
                  {line.summary}
                </div>
                <div className="font-mono text-xs mt-2" style={{ color: t.mid }}>
                  process: {line.advertekPrintProcess}
                </div>
              </div>
            ))}
          </div>

          <div className="font-mono text-xs tracking-widest uppercase mb-4">
            Print-on-demand SKUs
          </div>
          <p className="text-xs leading-relaxed max-w-3xl mb-4" style={{ color: t.mid }}>
            {catalog.skuCatalogNote}
          </p>
          <div className="overflow-x-auto" style={{ border: `1px solid ${t.line}` }}>
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.line}`, color: t.mid }}>
                  <th className="px-4 py-3 font-normal uppercase tracking-widest">SKU</th>
                  <th className="px-4 py-3 font-normal uppercase tracking-widest">Product</th>
                  <th className="px-4 py-3 font-normal uppercase tracking-widest">Price</th>
                  <th className="px-4 py-3 font-normal uppercase tracking-widest">Est. USDC</th>
                </tr>
              </thead>
              <tbody>
                {catalog.skuCatalog.map((entry) => (
                  <tr key={entry.sku} style={{ borderTop: `1px solid ${t.line}` }}>
                    <td className="px-4 py-3">{entry.sku}</td>
                    <td className="px-4 py-3" style={{ color: t.mid }}>
                      {entry.name}
                    </td>
                    <td className="px-4 py-3">{formatCad(entry.priceCad.amountCents)}</td>
                    <td className="px-4 py-3" style={{ color: t.mid }}>
                      {formatUsdc(entry.estimatedPriceUsdc.amountBaseUnits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase mb-4">Try a quote</div>
          <form
            onSubmit={(event) => {
              void handleQuote(event);
            }}
            noValidate
          >
            <div className="grid grid-cols-1 gap-5">
              <Field label="SKU" htmlFor="explorer-sku" error={fieldErrors.sku}>
                <select
                  id="explorer-sku"
                  value={form.sku}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, sku: event.target.value }));
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                >
                  <option value="">Select a SKU</option>
                  {catalog?.skuCatalog.map((entry) => (
                    <option key={entry.sku} value={entry.sku}>
                      {entry.sku} — {entry.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Quantity"
                htmlFor="explorer-quantity"
                error={fieldErrors.quantity}
              >
                <input
                  id="explorer-quantity"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, quantity: event.target.value }));
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                />
              </Field>

              <Field
                label="Turnaround"
                htmlFor="explorer-turnaround"
                error={fieldErrors.turnaround}
              >
                <select
                  id="explorer-turnaround"
                  value={form.turnaround}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, turnaround: event.target.value }));
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                >
                  {TURNAROUNDS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Print-ready asset URL"
                htmlFor="explorer-asset"
                error={fieldErrors.assetUrl}
              >
                <input
                  id="explorer-asset"
                  type="url"
                  value={form.assetUrl}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, assetUrl: event.target.value }));
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={quoteState.status === "submitting"}
              className="font-mono text-xs tracking-widest uppercase px-6 py-3 mt-6 disabled:opacity-50"
              style={{ border: `1px solid ${ACCENT}`, color: t.text }}
            >
              {quoteState.status === "submitting" ? "Pricing…" : "Get demo quote"}
            </button>
          </form>

          {quoteState.status === "ready" && (
            <div className="mt-6 p-4 font-mono text-xs" style={{ border: `1px solid ${t.line}` }}>
              <div className="text-sm mb-1">{quoteState.amountUsdc}</div>
              <div style={{ color: t.mid }}>
                settlement estimate · expires {quoteState.expiresAt} · non-binding demo value
              </div>
            </div>
          )}
          {quoteState.status === "error" && (
            <p className="text-sm mt-6" style={{ color: ACCENT }}>
              {quoteState.message}
            </p>
          )}
        </div>

        <div>
          <div className="font-mono text-xs tracking-widest uppercase mb-4">
            Open MCP tool documentation
          </div>
          <div className="grid grid-cols-1 gap-6 mb-10">
            {MCP_TOOLS.map((tool) => (
              <div key={tool.name} className="pt-4" style={{ borderTop: `1px solid ${t.line}` }}>
                <div className="font-mono text-sm mb-1" style={{ color: ACCENT }}>
                  {tool.name}
                </div>
                <div className="text-sm mb-1">{tool.title}</div>
                <p className="text-xs leading-relaxed" style={{ color: t.mid }}>
                  {tool.description}
                </p>
              </div>
            ))}
          </div>

          <div className="font-mono text-xs tracking-widest uppercase mb-2">
            Remote endpoint — /api/mcp (Streamable HTTP)
          </div>
          <pre
            className="font-mono text-xs p-4 overflow-x-auto"
            style={{ backgroundColor: t.payloadBg, color: t.payloadText }}
          >
            {MCP_CONNECT_SNIPPET}
          </pre>
          <button
            type="button"
            onClick={copySnippet}
            className="font-mono text-xs tracking-widest uppercase px-6 py-3 mt-4"
            style={{ border: `1px solid ${t.line}`, color: t.text }}
          >
            {copied ? "Copied" : "Copy snippet"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly error?: string | undefined;
  readonly children: React.ReactNode;
}

function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-mono text-xs tracking-widest uppercase mb-2">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1.5" style={{ color: ACCENT }}>
          {error}
        </p>
      )}
    </div>
  );
}
