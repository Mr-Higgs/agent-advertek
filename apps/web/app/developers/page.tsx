import Link from "next/link";
import {
  PageShell,
  SectionLabel,
  EndpointTable,
  InlineCallout,
  StatusBadge,
  type EndpointRow,
} from "@/components/site";
import { CodeExample } from "@/components/site/code-example";
import { createMetadata, developersPage, routes } from "@/lib/site-config";

export const metadata = createMetadata("developers");

const endpoints: readonly EndpointRow[] = [
  { method: "GET", path: "/api/catalog", auth: "None", status: "pilot", effect: "Returns product lines and POD categories." },
  { method: "POST", path: "/api/quotes", auth: "API key", status: "pilot", effect: "Returns a priced, time-bound quote." },
  { method: "POST", path: "/api/orders", auth: "API key", status: "pilot", effect: "Mints a payable order request." },
  { method: "GET", path: "/api/orders/[id]", auth: "API key", status: "pilot", effect: "Returns order and status timeline." },
  { method: "POST", path: "/api/mcp", auth: "API key", status: "pilot", effect: "MCP-over-HTTP tool transport." },
  { method: "POST", path: "/api/chat", auth: "None (rate-limited)", status: "demo", effect: "Conversational demo; does not create orders." },
  { method: "POST", path: "/api/artwork", auth: "None (rate-limited)", status: "pilot", effect: "Vercel Blob upload token exchange for chat artwork." },
  { method: "POST", path: "/api/webhooks/advertek", auth: "Basic + HTTPS", status: "pilot", effect: "Inbound production status events." },
  { method: "POST", path: "/api/webhooks/quicknode", auth: "Signature", status: "planned", effect: "USDC confirmation stream." },
];

const mcpConfig = JSON.stringify(
  {
    mcpServers: {
      advertek: {
        url: "https://www.advertek.io/api/mcp",
        headers: {
          Authorization: "Bearer ADVERTEK_API_KEY",
        },
      },
    },
  },
  null,
  2,
);

const quoteRequest = `POST /api/quotes HTTP/1.1
Host: www.advertek.io
Authorization: Bearer ADVERTEK_API_KEY
Content-Type: application/json

{
  "specification": {
    "productLine": "printOnDemand",
    "dimensions": { "width": 10, "height": 8, "units": "in" },
    "stock": { "weight": "200gsm", "color": "white" },
    "finish": ["none"],
    "quantity": 25,
    "turnaround": "standard",
    "assets": { "front": { "url": "https://cdn.example.com/front.pdf" } }
  }
}`;

const quoteResponse = `HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "quote": {
    "id": "qt_4d2a...",
    "total": {
      "currency": "USDC",
      "amountBaseUnits": "187500000"
    },
    "expiresAt": "2026-09-02T20:19:00Z",
    "demoPricing": true
  }
}`;

const orderResponse = `HTTP/1.1 201 Created
Content-Type: application/json

{
  "ok": true,
  "orderId": "ord_9f3e...",
  "memo": "ord_9f3e...",
  "settlementWallet": "G...",
  "amountBaseUnits": "187500000",
  "usdcMint": "EPjFWdd5A..."
}`;

const statusVocab = `"pending-payment" | "paid" | "downloaded" | "printing" |
"printed" | "shipped" | "completed" | "held" |
"cancelled" | "failed"`;

export default function DevelopersPage() {
  return (
    <>
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <PageShell>
          <SectionLabel>{developersPage.eyebrow}</SectionLabel>
          <h1 className="font-serif text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.05] mt-4 mb-6">
            {developersPage.headline}
          </h1>
          <p className="text-[17px] md:text-[18px] leading-relaxed max-w-3xl mb-8 text-ink/80">
            {developersPage.body}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={developersPage.primaryCta.href}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
            >
              {developersPage.primaryCta.label}
            </Link>
            <Link
              href={developersPage.secondaryCta.href}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-6 py-3 hover:border-ink"
            >
              {developersPage.secondaryCta.label}
            </Link>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Quick start</h2>
          <ol className="list-decimal list-inside space-y-2 text-[15px] leading-relaxed text-ink/80 max-w-3xl">
            <li>Call <code className="font-mono text-[13px] bg-ink/5 px-1">GET /api/catalog</code> to see available product lines and POD categories.</li>
            <li>Build a spec and call <code className="font-mono text-[13px] bg-ink/5 px-1">POST /api/quotes</code> for a deterministic quote.</li>
            <li>When ready, call <code className="font-mono text-[13px] bg-ink/5 px-1">POST /api/orders</code> to mint a payable order.</li>
            <li>Poll <code className="font-mono text-[13px] bg-ink/5 px-1">GET /api/orders/ord_...</code> or register a webhook for status events.</li>
          </ol>
          <div className="mt-6 flex items-center gap-3">
            <StatusBadge status="demo" />
            <span className="text-[14px] text-ink/80">
              Unauthenticated endpoints use demo pricing unless production credentials are configured.
            </span>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Authentication</h2>
              <p className="text-[15px] leading-relaxed text-ink/80 mb-4">
                Authenticated routes require an API key in the <code className="font-mono text-[13px] bg-ink/5 px-1">Authorization</code>{" "}
                header. Contact Advertek to request a pilot key.
              </p>
              <p className="text-[15px] leading-relaxed text-ink/80">
                <strong>Never</strong> expose an API key in browser code. Use it from a server or trusted agent process.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Base URLs and versioning</h2>
              <p className="text-[15px] leading-relaxed text-ink/80 mb-2">
                Production: <code className="font-mono text-[13px] bg-ink/5 px-1">https://www.advertek.io</code>
              </p>
              <p className="text-[15px] leading-relaxed text-ink/80 mb-2">
                API paths are versioned by prefix. The current public surface is under <code className="font-mono text-[13px] bg-ink/5 px-1">/api</code>.
              </p>
              <p className="text-[15px] leading-relaxed text-ink/80">
                Backward-compatible changes are additive. Breaking changes will be announced with a migration window.
              </p>
            </div>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Endpoint overview</h2>
          <EndpointTable endpoints={endpoints} />
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">MCP connection</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-8">
            Agent Rail is an MCP server over HTTP. Your agent calls the same tools the REST API exposes, but through the
            Model Context Protocol.
          </p>
          <CodeExample title="mcp_config.json" language="JSON" code={mcpConfig} event="mcp_snippet_copied" />
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Quote example</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <CodeExample title="Request" language="HTTP" code={quoteRequest} event="rest_snippet_copied" />
            <CodeExample title="Response" language="JSON" code={quoteResponse} event="rest_snippet_copied" />
          </div>
          <InlineCallout title="Non-binding demo">
            The response above shows demo pricing. Real quotes require a production pricing and spot-rate configuration.
          </InlineCallout>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Order and settlement</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-8">
            <code className="font-mono text-[13px] bg-ink/5 px-1">POST /api/orders</code> validates the full order, prices each line, and
            returns payment instructions. The agent supplies the payer wallet; the rail supplies the order id, memo, and
            amount. No funds move until the wallet authorizes the transfer.
          </p>
          <CodeExample title="Order response" language="JSON" code={orderResponse} event="rest_snippet_copied" />
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Status and webhooks</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-6">
            Orders move through a normalized status vocabulary. You can poll or register a callback URL to receive
            signed webhooks.
          </p>
          <div className="border border-ink/10 p-4 font-mono text-[13px] leading-relaxed bg-ink/[0.02] overflow-x-auto mb-6">
            {statusVocab}
          </div>
          <p className="text-[15px] leading-relaxed text-ink/80">
            Webhook bodies are signed and include the order id so you can correlate events without parsing memo fields.
          </p>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Error model</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-6">
            Errors follow a consistent shape with a machine-readable code, human message, and optional field-level
            issues.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-[15px] leading-relaxed text-ink/80">
            {[
              "validation: spec does not match the schema",
              "unavailable: production pricing or spot-rate not configured",
              "pricing_failure: upstream pricing could not be fetched",
              "unsupported_product: product line not yet available",
              "payment_mismatch: amount does not match the quote",
              "production_exception: job rejected or requires human review",
            ].map((item) => (
              <div key={item} className="border border-ink/10 p-4">{item}</div>
            ))}
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Rate limits and sandbox</h2>
          <p className="text-[15px] leading-relaxed text-ink/80 mb-4">
            Public endpoints are rate-limited per IP. Authenticated endpoints use key-based limits. Limits are returned
            in <code className="font-mono text-[13px] bg-ink/5 px-1">RateLimit-*</code> headers where applicable.
          </p>
          <p className="text-[15px] leading-relaxed text-ink/80">
            The demo environment returns mocked figures and does not create production orders or move funds. A separate
            sandbox is available for controlled pilot integrations.
          </p>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Changelog and support</h2>
          <p className="text-[15px] leading-relaxed text-ink/80 mb-6">
            Last updated: <time dateTime="2026-09-02">September 2, 2026</time>. For access, questions, or integration
            support, use the form below.
          </p>
          <Link
            href={routes.access}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
          >
            Request Credentials
          </Link>
        </PageShell>
      </section>
    </>
  );
}
