import Link from "next/link";
import { PageShell, SectionLabel, FacilityProof, CapabilityCard, InlineCallout } from "@/components/site";
import { createMetadata, productionCapabilities, productionPage, routes } from "@/lib/site-config";

export const metadata = createMetadata("production");

const processHighlights = [
  "Offset, digital, and wide-format presses",
  "Dye-sublimation and garment decoration",
  "Packaging, die-cutting, and structural finishing",
  "Bindery, foil, emboss, spot UV, and aqueous coatings",
  "Direct-mail insertion and postal optimization",
  "Quality checkpoints at preflight, proof, and pack-out",
];

export default function ProductionPage() {
  return (
    <>
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <PageShell>
          <SectionLabel>{productionPage.eyebrow}</SectionLabel>
          <h1 className="font-serif text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.05] mt-4 mb-6 max-w-4xl">
            {productionPage.headline}
          </h1>
          <p className="text-[17px] md:text-[18px] leading-relaxed max-w-3xl mb-8 text-ink/80">
            {productionPage.body}
          </p>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Facility</h2>
          <FacilityProof />
          <InlineCallout title="Facility figure">
            The 77,000 sq. ft. figure is owner-confirmed for this site. Older public sources may show different numbers.
          </InlineCallout>
        </PageShell>
      </section>

      <section className="py-16 md:py-24">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">History</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-6">
            Advertek was founded in 1996 and has grown from a traditional commercial print operation into a
            multi-process manufacturing business. The Toronto facility combines prepress, press, finishing, and
            fulfillment under one roof.
          </p>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80">
            Agent Rail is the software layer built on top of this operating base. It gives external software the same
            structured access the internal team uses to quote, schedule, and track jobs.
          </p>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10 bg-ink/[0.02]">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Equipment and process highlights</h2>
          <ul className="grid gap-3 md:grid-cols-2 text-[15px] leading-relaxed text-ink/80 mb-10">
            {processHighlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-signal" aria-hidden="true">—</span>
                {item}
              </li>
            ))}
          </ul>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Production categories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {productionCapabilities.map((cap) => (
              <CapabilityCard key={cap.id} capability={cap} />
            ))}
          </div>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 border-t border-ink/10">
        <PageShell>
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">Quality and fulfillment</h2>
          <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-6">
            Quality controls run through preflight, proof approval, production checkpoints, and pack-out inspection.
            Standard fulfillment covers pick, pack, kit, and ship across North America. Human expertise handles
            exceptions that software cannot resolve on its own.
          </p>
          <p className="text-[15px] leading-relaxed text-ink/80">
            Service geography is currently North America, with the Toronto facility as the first production node.
          </p>
        </PageShell>
      </section>

      <section className="py-16 md:py-24 bg-ink text-paper">
        <PageShell>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.2rem)] leading-tight mb-6">Human-led commercial inquiries</h2>
          <p className="text-[17px] leading-relaxed max-w-2xl mb-8 text-paper/80">
            For projects that are not yet a fit for Agent Rail, the Advertek Printing team can quote and manage
            production directly.
          </p>
          <Link
            href={routes.advertekPrinting}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-paper/20 px-6 py-3 hover:border-paper"
          >
            Visit advertekprinting.com ↗
          </Link>
        </PageShell>
      </section>
    </>
  );
}
