import { PageShell, SectionLabel } from "@/components/site";
import { AccessForm } from "@/components/site/access-form";
import { accessPage, createMetadata } from "@/lib/site-config";

export const metadata = createMetadata("access");

export default function AccessPage() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <PageShell className="max-w-3xl">
        <SectionLabel>{accessPage.eyebrow}</SectionLabel>
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] mt-4 mb-4">
          {accessPage.headline}
        </h1>
        <p className="text-[17px] leading-relaxed text-ink/80 mb-10">{accessPage.body}</p>
        <AccessForm successText={accessPage.success} />
      </PageShell>
    </section>
  );
}
