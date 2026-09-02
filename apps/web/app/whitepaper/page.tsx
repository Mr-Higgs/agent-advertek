import Link from "next/link";
import {
  PageShell,
  SectionLabel,
  FeatureStatusTable,
  InlineCallout,
  StatusBadge,
} from "@/components/site";
import { createMetadata, routes, whitepaperMeta } from "@/lib/site-config";

export const metadata = createMetadata("whitepaper");

export default function WhitepaperPage() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <PageShell className="max-w-4xl">
        <SectionLabel>WHITEPAPER</SectionLabel>
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] mt-4 mb-6">
          Advertek Agent Rail
        </h1>

        <div className="border border-ink/10 p-6 mb-12">
          <dl className="grid gap-3 md:grid-cols-2 text-[14px]">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-mid">Version</dt>
              <dd>{whitepaperMeta.version}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-mid">Last updated</dt>
              <dd>
                <time dateTime={whitepaperMeta.updatedAt}>{whitepaperMeta.updatedAt}</time>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-mid">Author</dt>
              <dd>{whitepaperMeta.author}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-mid">Contact</dt>
              <dd>{whitepaperMeta.contact}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-mid">Overall status</span>
            <StatusBadge status="pilot" />
          </div>
        </div>

        <article className="prose prose-lg max-w-none">
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Abstract</h2>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            Agent Rail is a machine-readable interface between software intent and physical production. It translates a
            structured request — product, quantity, material, finish, artwork, turnaround, destination — into a
            production-safe order model, then returns deterministic quotes, payment instructions, and normalized
            status events.
          </p>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            The current deployment is a controlled pilot. Catalog, quoting, order intake, payment-request generation, and
            status persistence are functional. Production pricing, spot-rate, and end-to-end production submission are
            deployment-gated: they run against real services when credentials are configured, otherwise they return
            clearly labeled demo values.
          </p>

          <InlineCallout title="Scope note">
            This paper describes architecture and current status. It does not claim successful automatic production,
            payment confirmation, or fiat conversion as present behavior without a verified end-to-end test.
          </InlineCallout>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">
            01. Complex production lacks a common machine interface
          </h2>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            Standardized products are already available through print and fulfillment APIs. The harder problem is
            complex commercial production, where specifications, materials, artwork, pricing, approvals, manufacturing
            constraints, shipping, and exception handling vary by product and supplier. Agent Rail is designed to translate
            structured software requests into production-safe workflows.
          </p>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">
            02. Agent protocols reduce integration friction
          </h2>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            Model Context Protocol (MCP) and emerging agent-communication patterns give an external agent a standard
            way to discover tools, submit arguments, and receive typed results. Agent Rail exposes catalog, quote, and
            order tools through MCP-over-HTTP and through a parallel REST surface. These protocols reduce integration
            friction; they do not create demand or guarantee category leadership.
          </p>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">03. System overview</h2>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            The web tier exposes public routes and authenticated API endpoints. The quote layer computes pricing and
            converts CAD to USDC base units. The order layer mints order ids, persists fulfillment payloads, and returns
            payment requests. The payment layer generates settlement instructions and listens for confirmation. The
            fulfillment layer maps product lines to production API calls and normalizes status events. The treasury layer
            sweeps and converts independently.
          </p>
          <FeatureStatusTable />

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">
            04. Order lifecycle: a structured path with explicit exception gates
          </h2>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            Orders move through validation, quoting, approval, settlement, production submission, and shipment. The
            system supports four paths:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[15px] leading-relaxed text-ink/80 mb-6">
            <li>
              <strong>Clean:</strong> spec validates and the order follows the automated workflow.
            </li>
            <li>
              <strong>Assisted:</strong> artwork, engineering, compliance, capacity, or commercial rules require named
              human review.
            </li>
            <li>
              <strong>Rejected:</strong> the system returns structured failure reasons and next actions.
            </li>
            <li>
              <strong>Failed:</strong> an unexpected error occurs and is logged for incident review.
            </li>
          </ul>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">05. Settlement architecture</h2>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            The rail is intentionally payment-rail agnostic. Today it generates a USDC payment request on Solana as a
            baseline integration: the order id is encoded in the memo, and the payer wallet authorizes the transfer.
            Alternative rails, fiat on-ramps, escrow, and marketplace routes are tracked as roadmap or planned work.
            Treasury sweep, OKX conversion, and fiat reconciliation are implemented in an independent worker and are not
            production-verified.
          </p>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">06. Security and engineering invariants</h2>
          <ul className="list-disc list-inside space-y-2 text-[15px] leading-relaxed text-ink/80 mb-6">
            <li>Money is stored and transmitted as integer minor units; floats never cross a trust boundary.</li>
            <li>Zod validates every API, MCP, webhook, and vendor payload.</li>
            <li>Secrets are separated: the web tier holds no money-moving keys.</li>
            <li>Webhook signatures are verified where the protocol supports it.</li>
            <li>Rate limiting and per-IP abuse controls are active on public mutation endpoints.</li>
            <li>Audit logs capture quote, order, payment, and status events without exposing PII.</li>
          </ul>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">07. Market context</h2>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            Agencies and creative operations are the strongest initial wedge. They manage repeat physical output across
            many clients, each with different brand rules, specs, and approval chains. Standardized print-on-demand and
            direct-mail APIs already exist; Agent Rail is not differentiated by API access alone. The intended
            difference is machine-readable access to broader and more complex commercial production.
          </p>
          <p className="text-[17px] leading-relaxed text-ink/80 mb-6">
            The defensibility goal is production ontology, pricing logic, job data, exception handling, workflow
            integration, and network performance — built against a real operating production floor.
          </p>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">08. Roadmap</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
            {[
              { phase: "Phase 1", body: "Verify catalog, specification, quote, and demo flows." },
              { phase: "Phase 2", body: "Complete a controlled end-to-end pilot with human exception review." },
              { phase: "Phase 3", body: "Add repeat ordering, webhooks, enterprise controls, and measured service levels." },
              { phase: "Phase 4", body: "Add qualified production endpoints after repeat demand and routing data exist." },
            ].map((item) => (
              <div key={item.phase} className="border border-ink/10 p-5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-mid">{item.phase}</span>
                <p className="text-[15px] leading-relaxed text-ink/80 mt-2">{item.body}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">
            09. Measurable product indicators
          </h2>
          <ul className="list-disc list-inside space-y-2 text-[15px] leading-relaxed text-ink/80 mb-6">
            <li>Quote response time</li>
            <li>Specification validation rate</li>
            <li>Human intervention rate</li>
            <li>Quote-to-order conversion</li>
            <li>Production error rate</li>
            <li>On-time shipment rate</li>
            <li>Reprint rate</li>
            <li>Repeat-order rate</li>
            <li>Integration activation rate</li>
          </ul>

          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4 mt-16">10. Changelog</h2>
          <dl className="border border-ink/10 divide-y divide-ink/10 text-[14px]">
            <div className="p-4 grid md:grid-cols-[10rem_1fr] gap-2">
              <dt className="font-mono text-[11px] text-mid">2026-09-02</dt>
              <dd>
                v{whitepaperMeta.version} — Repositioned site as agentic production infrastructure. Separated current
                product status from target architecture.
              </dd>
            </div>
            <div className="p-4 grid md:grid-cols-[10rem_1fr] gap-2">
              <dt className="font-mono text-[11px] text-mid">Earlier</dt>
              <dd>Initial technical whitepaper and API surface.</dd>
            </div>
          </dl>

          <div className="mt-16 p-6 border border-ink/10 bg-ink/[0.02]">
            <p className="text-[15px] leading-relaxed text-ink/80 mb-4">
              For questions or pilot access, use the form below.
            </p>
            <Link
              href={routes.access}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
            >
              Request Access
            </Link>
          </div>
        </article>
      </PageShell>
    </section>
  );
}
