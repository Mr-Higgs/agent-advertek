"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

interface CTA {
  readonly label: string;
  readonly href: string;
}

interface HeroCTAsProps {
  readonly primary: CTA;
  readonly secondary: CTA;
}

export function HeroCTAs({ primary, secondary }: HeroCTAsProps) {
  const route = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link
        href={primary.href}
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90"
        onClick={() => { track("hero_cta_clicked", { cta: primary.label, route }); }}
      >
        {primary.label}
      </Link>
      <Link
        href={secondary.href}
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-6 py-3 hover:border-ink"
        onClick={() => { track("hero_cta_clicked", { cta: secondary.label, route }); }}
      >
        {secondary.label}
      </Link>
    </div>
  );
}
