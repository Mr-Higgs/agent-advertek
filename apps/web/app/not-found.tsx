import Link from "next/link";
import { PageShell } from "@/components/site";
import { routes } from "@/lib/site-config";

export default function NotFound() {
  return (
    <section className="pt-24 pb-24">
      <PageShell className="max-w-2xl text-center">
        <h1 className="font-serif text-[clamp(3rem,8vw,6rem)] leading-none mb-6">404</h1>
        <p className="text-[17px] leading-relaxed text-ink/80 mb-8">
          That page could not be found. If you were looking for the Agent Rail product page, it has moved.
        </p>
        <Link
          href={routes.platform}
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
        >
          Go to Platform
        </Link>
      </PageShell>
    </section>
  );
}
