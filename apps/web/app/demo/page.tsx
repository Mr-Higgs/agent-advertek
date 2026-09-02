import { DemoChat } from "@/components/chat/demo-chat";
import { DemoDisclosure } from "@/components/site/demo-disclosure";
import { PageShell, SectionLabel } from "@/components/site";
import { demoPage, createMetadata } from "@/lib/site-config";

export const metadata = createMetadata("demo");

export default function DemoPage() {
  return (
    <>
      <section className="pt-16 pb-8 md:pt-24 md:pb-12">
        <PageShell>
          <SectionLabel>{demoPage.eyebrow}</SectionLabel>
          <h1 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] mt-4 mb-4 max-w-4xl">
            {demoPage.headline}
          </h1>
          <p className="text-[17px] leading-relaxed max-w-2xl text-ink/80 mb-8">{demoPage.body}</p>
          <DemoDisclosure status="demo" />
        </PageShell>
      </section>
      <section className="pb-16 md:pb-24">
        <PageShell>
          <DemoChat />
        </PageShell>
      </section>
    </>
  );
}
