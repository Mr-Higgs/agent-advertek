import { PageShell, SectionLabel, UseCaseCard } from "@/components/site";
import { createMetadata, useCases } from "@/lib/site-config";

export const metadata = createMetadata("useCases");

export default function UseCasesPage() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <PageShell>
        <SectionLabel>USE CASES</SectionLabel>
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] mt-4 mb-4 max-w-4xl">
          Production workflows built for repeat demand.
        </h1>
        <p className="text-[17px] leading-relaxed max-w-3xl text-ink/80 mb-12">
          Agent Rail is designed for platforms and operators managing recurring, distributed, or specification-heavy
          physical output.
        </p>
        <div>
          {useCases.map((useCase, index) => (
            <UseCaseCard key={useCase.id} useCase={useCase} index={index} />
          ))}
        </div>
      </PageShell>
    </section>
  );
}
