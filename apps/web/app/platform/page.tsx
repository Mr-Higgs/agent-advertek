import Link from "next/link";
import {
  PageShell,
  SectionLabel,
  SystemFlow,
  OrderLifecycle,
  FeatureStatusTable,
  InlineCallout,
  StatusBadge,
} from "@/components/site";
import { platformPage, routes } from "@/lib/site-config";
import { createMetadata } from "@/lib/site-config";

export const metadata = createMetadata("platform");

const workflowSteps = [
  { label: "Specification", body: "Product, dimensions, stock, finish, artwork, turnaround, and ship-to are validated into a production-safe model." },
  { label: "Quote", body: "Pricing logic returns a deterministic quote in CAD, then converts to the requested settlement unit." },
  { label: "Approval", body: "Buyer confirms the quote. Exception rules route custom, high-value, or risky jobs to human review." },
  { label: "Settlement", body: "A payment request is generated with a memo-matched order id. The payer wallet authorizes the transfer." },
  { label: "Production", body: "The order maps to a product code and POSTs to the production API; status events flow back." },
];

const ontologyFields = [
  { field: "Product family", note: "Mapped to a validated product line." },
  { field: "Finished dimensions", note: "Width, height, depth, and tolerances." },
  { field: "Quantity", note: "Integer unit count." },
  { field: "Material / stock", note: "Substrate, weight, color, and grade." },
  { field: "Print process", note: "Offset, digital, wide-format, dye-sub, etc." },
  { field: "Color", note: "Color mode and profile requirements." },
  { field: "Finishes", note: "Matte, gloss, soft-touch, foil, emboss, spot UV, etc." },
  { field: "Artwork files", note: "URL, SHA-256, type, bleed/safe rules." },
  { field: "Turnaround", note: "Standard, expedited, rush." },
  { field: "Ship-to destination", note: "Address, postal code, country, service level." },
  { field: "Compliance fields", note: "Customs value, hazardous materials, postal rules." },
  { field: "Exception flags", note: "New SKU, oversized, manual preflight required." },
];

const roadmap = [
  { phase: "Phase 1", body: "Verify catalog, specification, quote, and demo flows." },
  { phase: "Phase 2", body: "Complete a controlled end-to-end pilot with human exception review." },
  { phase: "Phase 3", body: "Add repeat ordering, webhooks, enterprise controls, and measured service levels." },
  { phase: "Phase 4", body: "Add qualified production endpoints after repeat demand and routing data exist." },
];

export default function PlatformPage() {
  return (
    <>
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <PageShell>
          <SectionLabel>{platformPage.eyebrow}</SectionLabel>
          <h1 className="font-serif text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.05] mt-4 mb-6 max-w-4xl">
            {platformPage.headline}
          </h1>
          <p className="text-[17px] md:text-[18px] leading-relaxed max-w-3xl mb-8 text-ink/80">
            {platformPage.body}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={platformPage.primaryCta.href}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
            >
              {platformPage.primaryCta.label}
            </Link>
            <Link
              href={platformPage.secondaryCta.href}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-6 py-3 hover:border-ink"
            >
              {platformPage.secondaryCta.label}
            </Link>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Product overview</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-10">
            The core system translates software intent into production-safe specifications. It validates required fields,
            maps products and finishes to manufacturing rules, returns system-priced quotes, records approvals, routes
            orders, and normalizes status.
          </p>
          <SystemFlow steps={workflowSteps} />
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Structured production ontology</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-8">
            A valid spec is the foundation of every downstream step. Missing or incompatible fields fail fast instead of
            becoming production errors.
          </p>
          <div className="border border-ink/10 overflow-hidden">
            <table className="min-w-full text-left text-[14px]">
              <thead className="border-b border-ink/10 bg-ink/[0.02]">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Field</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Rule</th>
                </tr>
              </thead>
              <tbody>
                {ontologyFields.map((row) => (
                  <tr key={row.field} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 font-medium">{row.field}</td>
                    <td className="px-4 py-3 text-ink/80">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Deterministic quoting</h2>
              <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
                Prices come from configured production-pricing and spot-rate sources, not from a language model. The
                quote is bound to a validated spec, carries an expiry, and is always returned in integer minor units.
              </p>
              <InlineCallout title="Agent rule">
                Agents must never invent prices, SKU codes, settlement amounts, order ids, or success states.
              </InlineCallout>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Artwork and preflight controls</h2>
              <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
                Artwork URLs, SHA-256 digests, and file types are validated at intake. Unsupported resolutions, missing
                bleeds, or mismatched color modes trigger an assisted path.
              </p>
            </div>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Payment and settlement</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-8">
            Orders are priced in CAD and converted to a settlement amount. USDC on Solana is the baseline integration.
            Card, invoice, and bank-transfer settlement are evaluated for enterprise pilots.
          </p>
          <div className="flex items-center gap-3 mb-6">
            <StatusBadge status="pilot" />
            <span className="text-[15px] text-ink/80">Payment requests are generated server-side; the payer wallet controls the transfer.</span>
          </div>
          <OrderLifecycle />
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Production routing and exception handling</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-8">
            The system handles three paths. The exception model makes assisted review explicit, rather than implying fully autonomous production.
          </p>
          <div className="grid gap-6 md:grid-cols-3 mb-10">
            <div className="border border-ink/10 p-6">
              <h3 className="font-display text-lg font-medium mb-2">Clean path</h3>
              <p className="text-[15px] leading-relaxed text-ink/80">
                Specification validates and the order follows the automated workflow.
              </p>
            </div>
            <div className="border border-ink/10 p-6">
              <h3 className="font-display text-lg font-medium mb-2">Assisted path</h3>
              <p className="text-[15px] leading-relaxed text-ink/80">
                Artwork, engineering, compliance, capacity, or commercial rules require named human review.
              </p>
            </div>
            <div className="border border-ink/10 p-6">
              <h3 className="font-display text-lg font-medium mb-2">Rejected path</h3>
              <p className="text-[15px] leading-relaxed text-ink/80">
                The system returns structured failure reasons and next actions.
              </p>
            </div>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Security and approval controls</h2>
          <ul className="grid gap-3 md:grid-cols-2 text-[15px] leading-relaxed text-ink/80">
            {[
              "Zod validation at every trust boundary",
              "API-key auth with per-IP rate limiting",
              "Bigint money in integer minor units only",
              "Webhook signature verification hooks",
              "Secret separation between web tier and treasury worker",
              "Audit logs and structured error responses",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-signal" aria-hidden="true">—</span>
                {item}
              </li>
            ))}
          </ul>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Current product status</h2>
          <FeatureStatusTable />
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Roadmap</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roadmap.map((item) => (
              <div key={item.phase} className="border border-ink/10 p-5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-mid">{item.phase}</span>
                <p className="text-[15px] leading-relaxed text-ink/80 mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink text-paper">
        <PageShell>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mb-6">Request pilot access</h2>
          <p className="text-[17px] leading-relaxed max-w-2xl mb-8 text-paper/80">
            Tell us what your agent or platform needs to produce. We will assess product fit, workflow, volume,
            integration, and pilot scope.
          </p>
          <Link
            href={routes.access}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
          >
            Request Agent Rail Access
          </Link>
        </PageShell>
      </section>
    </>
  );
}
