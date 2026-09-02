import Link from "next/link";
import {
  PageShell,
  SectionLabel,
  ProofStrip,
  CapabilityCard,
  JobTicket,
  SystemFlow,
  StatusBadge,
} from "@/components/site";
import { CodeExample } from "@/components/site/code-example";
import { homepage, productionCapabilities, routes, useCases, createMetadata } from "@/lib/site-config";

export const metadata = createMetadata("home");

const productSteps = [
  { label: "Spec", body: "Submit product, quantity, dimensions, material, finish, deadline, destination, and artwork through MCP or REST." },
  { label: "Quote", body: "Validate the specification and return a system-priced response. Never invent a price or SKU." },
  { label: "Approve and pay", body: "Approve the order and receive settlement instructions through the supported payment rail." },
  { label: "Produce", body: "Route the approved job into the correct production workflow, with human review for exceptions." },
  { label: "Track", body: "Return normalized status events from confirmation through production and shipment." },
];

const problemCards = [
  { title: "Unstructured specifications", body: "Every product carries different sizes, stocks, finishes, tolerances, artwork rules, and turnaround constraints." },
  { title: "Manual commercial workflows", body: "Complex jobs often require quote threads, purchase orders, preflight checks, approvals, and vendor coordination." },
  { title: "Disconnected production status", body: "Software platforms lack one normalized view of quote, approval, production, shipment, and exception states." },
];

const catalogRequest = `GET /api/catalog HTTP/1.1
Host: www.advertek.io
Accept: application/json`;

const catalogResponse = `HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "productLines": ["offset", "digital", "wideFormat", ...],
  "podCategories": [...],
  "demoPricing": true
}`;

export default function HomePage() {
  return (
    <>
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <PageShell>
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            <div>
              <SectionLabel>{homepage.eyebrow}</SectionLabel>
              <h1 className="font-serif text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.05] mt-4 mb-6">
                {homepage.headline}
              </h1>
              <p className="text-[17px] md:text-[18px] leading-relaxed max-w-xl mb-6 text-ink/80">
                {homepage.body}
              </p>
              <p className="font-mono text-[13px] md:text-[14px] tracking-widest mb-8">{homepage.workflow}</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={homepage.primaryCta.href}
                  className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
                >
                  {homepage.primaryCta.label}
                </Link>
                <Link
                  href={homepage.secondaryCta.href}
                  className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-6 py-3 hover:border-ink"
                >
                  {homepage.secondaryCta.label}
                </Link>
              </div>
              <p className="mt-6 text-[13px] text-mid">{homepage.proof}</p>
            </div>
            <div className="hidden lg:block">
              <JobTicket title="Sample job ticket">
                <pre className="text-[12px]">{`order:  ord_9f3e...
status: QUOTED
spec:
  productLine: printOnDemand
  sku:         blankets/50x60-fleece
  quantity:    25
  finish:      [none]
  turnaround:  standard
  shipTo:      Toronto, ON
quote:
  total:  187.50 USDC
  expiry: 2026-09-02T20:19:00Z`}</pre>
              </JobTicket>
            </div>
          </div>
        </PageShell>
      </section>

      <ProofStrip />

      <section className="py-16 md:py-24 border-b border-ink/10">
        <PageShell>
          <SectionLabel>THE PROBLEM</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mt-4 mb-10 max-w-3xl">
            Software is structured. Physical production is not.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {problemCards.map((card) => (
              <div key={card.title} className="border border-ink/10 p-6">
                <h3 className="font-display text-lg font-medium mb-3">{card.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink/80">{card.body}</p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <SectionLabel>THE PRODUCT</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mt-4 mb-10">
            One interface from request to shipment.
          </h2>
          <SystemFlow steps={productSteps} />
          <div className="mt-10">
            <Link
              href={routes.platform}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-5 py-2.5 hover:border-ink"
            >
              Explore the Platform <span aria-hidden="true">→</span>
            </Link>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink/[0.02]">
        <PageShell>
          <SectionLabel>PRODUCTION CATEGORIES</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mt-4 mb-10">
            Commercial capability behind the API.
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {productionCapabilities.map((cap) => (
              <CapabilityCard key={cap.id} capability={cap} />
            ))}
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <SectionLabel>RIGHT TO WIN</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mt-4 mb-6 max-w-3xl">
            Software on top of a real production floor.
          </h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-10">
            Advertek is not starting with a marketplace or a catalog mockup. Agent Rail sits on decades of commercial
            manufacturing experience and an operating Toronto facility. The first production node gives the software
            team direct access to pricing logic, artwork constraints, manufacturing exceptions, and job-performance data.
          </p>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-10">
            {[
              "Real production capacity",
              "In-house category breadth",
              "Existing customer workflows",
              "Direct access to production knowledge",
              "Controlled environment for testing agent-driven orders",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-[15px] text-ink/80">
                <span className="text-signal" aria-hidden="true">—</span>
                {point}
              </li>
            ))}
          </ul>
          <Link
            href={routes.production}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-5 py-2.5 hover:border-ink"
          >
            See the Production Floor <span aria-hidden="true">→</span>
          </Link>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10">
        <PageShell>
          <SectionLabel>USE CASES</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mt-4 mb-10">
            Built for systems managing repeat physical output.
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases.slice(0, 3).map((useCase) => (
              <div key={useCase.id} className="border border-ink/10 p-6 hover:border-signal transition-colors">
                <h3 className="font-display text-lg font-medium mb-3">{useCase.buyer}</h3>
                <p className="text-[15px] leading-relaxed text-ink/80 mb-4">{useCase.result}</p>
                <Link
                  href={`${routes.useCases}#${useCase.id}`}
                  className="font-mono text-[11px] uppercase tracking-widest text-signal"
                >
                  Read the use case →
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href={routes.useCases}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-5 py-2.5 hover:border-ink"
            >
              View all use cases <span aria-hidden="true">→</span>
            </Link>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink/[0.02]">
        <PageShell>
          <SectionLabel>DEVELOPER PROOF</SectionLabel>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mt-4 mb-6">
            Built to be called, not emailed.
          </h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-8">
            Agent Rail exposes catalog, quote, order, status, and webhook interfaces through MCP and REST. Examples use
            the real schema; no fields are invented.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <CodeExample title="Request" language="HTTP" code={catalogRequest} event="rest_snippet_copied" />
            <CodeExample title="Response" language="JSON" code={catalogResponse} event="rest_snippet_copied" />
          </div>
          <div className="mt-8">
            <Link
              href={routes.developers}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-5 py-2.5 hover:border-ink"
            >
              Read Developer Docs <span aria-hidden="true">→</span>
            </Link>
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10">
        <PageShell>
          <div className="flex items-start justify-between gap-4 mb-6">
            <SectionLabel>NETWORK VISION</SectionLabel>
            <StatusBadge status="planned" />
          </div>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mb-6">
            One production node first. A qualified network next.
          </h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80">
            Advertek is proving the system against its own operating facility. The longer-term platform direction is to
            route jobs to qualified production endpoints based on capability, geography, capacity, cost, service level,
            and performance history.
          </p>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink text-paper">
        <PageShell>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mb-6">
            Give your software a route into physical production.
          </h2>
          <p className="text-[17px] leading-relaxed max-w-2xl mb-8 text-paper/80">
            Tell us what your agent or platform needs to produce. We will assess product fit, workflow, volume,
            integration, and pilot scope.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={routes.access}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
            >
              Request Agent Rail Access
            </Link>
            <Link
              href={routes.demo}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-paper/20 px-6 py-3 hover:border-paper"
            >
              Try the Demo
            </Link>
          </div>
        </PageShell>
      </section>
    </>
  );
}
