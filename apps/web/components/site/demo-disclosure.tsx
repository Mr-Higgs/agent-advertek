import { StatusBadge } from "@/components/site";

export function DemoDisclosure({ status }: { readonly status: "demo" | "pilot" | "planned" }) {
  return (
    <div className="border border-ink/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-ink/[0.02]">
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        <p className="text-[14px] leading-relaxed text-ink/80">
          Demo environment. Pricing is non-binding. Requests do not create production orders or move funds.
        </p>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-mid">
        API: /api/chat · artwork: /api/artwork
      </p>
    </div>
  );
}
