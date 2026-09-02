import Link from "next/link";
import type { ReactNode } from "react";
import type { Capability, FeatureStatus, Status, UseCase } from "@/lib/site-config";
import { featureStatuses, facilityFacts, statusInfo, routes, footerGroups } from "@/lib/site-config";
import { AdvertekMark } from "./icons";
import { SIGNAL } from "./theme";

export function StatusBadge({ status }: { readonly status: Status }) {
  const info = statusInfo[status];
  const baseClasses =
    "inline-flex items-center rounded-none border px-2 py-1 font-mono text-[10px] uppercase tracking-widest";
  if (status === "live") {
    return (
      <span className={`${baseClasses} bg-signal text-signal-contrast border-signal`} title={info.description}>
        {info.label}
      </span>
    );
  }
  if (status === "pilot") {
    return (
      <span className={`${baseClasses} border-signal text-signal`} title={info.description}>
        {info.label}
      </span>
    );
  }
  if (status === "demo") {
    return (
      <span className={`${baseClasses} border-mid text-ink/80`} title={info.description}>
        {info.label}
      </span>
    );
  }
  return (
    <span
      className={`${baseClasses} border-dashed border-ink/40 text-ink/60`}
      title={info.description}
    >
      {info.label}
    </span>
  );
}

export function SectionLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-mid">
      {children}
    </span>
  );
}

export function InlineCallout({
  children,
  title,
}: {
  readonly children: ReactNode;
  readonly title?: string;
}) {
  return (
    <div
      className="border-l-2 pl-4 py-1 my-6"
      style={{ borderColor: SIGNAL }}
      aria-label={title}
    >
      {title ? <p className="font-mono text-[11px] uppercase tracking-widest mb-1">{title}</p> : null}
      <div className="text-[15px] leading-relaxed text-ink/80">{children}</div>
    </div>
  );
}

export function ProofStrip({ items = facilityFacts }: { readonly items?: readonly { label: string; value: string }[] }) {
  return (
    <div className="border-t border-b border-ink/10">
      <div className="max-w-[82rem] mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mid">{item.label}</span>
            <span className="font-display text-lg font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FacilityProof() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {facilityFacts.map((fact) => (
        <div
          key={fact.label}
          className="border border-ink/10 p-5 flex flex-col justify-between"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-mid">{fact.label}</span>
          <span className="font-display text-2xl md:text-3xl font-medium mt-3">{fact.value}</span>
        </div>
      ))}
    </div>
  );
}

export function CapabilityCard({ capability }: { readonly capability: Capability }) {
  return (
    <div className="border border-ink/10 p-5 flex flex-col h-full hover:border-signal transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display text-lg font-medium">{capability.label}</h3>
        <span className="font-mono text-[9px] uppercase tracking-wider border border-ink/10 px-1.5 py-0.5 shrink-0">
          {capability.availability}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-ink/70 flex-1">{capability.description}</p>
    </div>
  );
}

export function UseCaseCard({ useCase, index }: { readonly useCase: UseCase; readonly index: number }) {
  return (
    <article id={useCase.id} className="border-b border-ink/10 py-10 scroll-mt-24">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono text-[11px] text-mid">0{index + 1}</span>
        <h2 className="font-display text-2xl md:text-3xl font-medium">{useCase.buyer}</h2>
      </div>
      <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-mid mb-1">Trigger</dt>
          <dd className="text-[15px] leading-relaxed">{useCase.trigger}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-mid mb-1">Problem</dt>
          <dd className="text-[15px] leading-relaxed text-ink/80">{useCase.problem}</dd>
        </div>
        <div className="lg:col-span-3">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-mid mb-1">Agent Rail workflow</dt>
          <dd className="text-[15px] leading-relaxed">{useCase.workflow}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-mid mb-1">Human approval</dt>
          <dd className="text-[15px] leading-relaxed text-ink/80">{useCase.approval}</dd>
        </div>
        <div className="lg:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-mid mb-1">Result</dt>
          <dd className="text-[15px] leading-relaxed">{useCase.result}</dd>
        </div>
        <div className="lg:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-mid mb-1">Categories</dt>
          <dd className="text-[15px] leading-relaxed">{useCase.categories.join(" · ")}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-mid mb-1">Pilot</dt>
          <dd className="text-[15px] leading-relaxed text-ink/80">{useCase.pilot}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <Link
          href={useCase.cta.href}
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-ink/10 px-4 py-2 hover:bg-ink hover:text-paper transition-colors"
        >
          {useCase.cta.label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export interface EndpointRow {
  readonly method: string;
  readonly path: string;
  readonly auth: string;
  readonly status: Status;
  readonly effect: string;
}

export function EndpointTable({ endpoints }: { readonly endpoints: readonly EndpointRow[] }) {
  return (
    <div className="overflow-x-auto border border-ink/10">
      <table className="min-w-full text-left text-[14px]">
        <thead className="border-b border-ink/10 bg-ink/[0.02]">
          <tr>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Method</th>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Path</th>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Auth</th>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Status</th>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Effect</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((row) => (
            <tr key={`${row.method}:${row.path}`} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-3 font-mono text-[12px] uppercase">{row.method}</td>
              <td className="px-4 py-3 font-mono text-[12px]">{row.path}</td>
              <td className="px-4 py-3">{row.auth}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-ink/80">{row.effect}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SystemFlow({ steps }: { readonly steps: readonly { label: string; body: string }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-5">
      {steps.map((step, i) => (
        <li key={step.label} className="border border-ink/10 p-5 relative">
          <span className="font-mono text-[10px] uppercase tracking-widest text-mid">0{i + 1}</span>
          <h3 className="font-display text-lg font-medium mt-2 mb-2">{step.label}</h3>
          <p className="text-[14px] leading-relaxed text-ink/70">{step.body}</p>
          {i < steps.length - 1 ? (
            <span className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-mid" aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function OrderLifecycle() {
  const phases = [
    { label: "Submitted", body: "Specification and artwork received and validated." },
    { label: "Quoted", body: "System returns a deterministic, non-invented price." },
    { label: "Approved", body: "Buyer approves and payment settles against the request." },
    { label: "In production", body: "Job routed to the appropriate production workflow." },
    { label: "Shipped", body: "Tracking and delivery confirmation returned to the caller." },
  ];
  return (
    <div className="border border-ink/10 p-6 md:p-8">
      <h3 className="font-display text-xl font-medium mb-6">Order lifecycle</h3>
      <div className="grid gap-6 md:grid-cols-5">
        {phases.map((phase, i) => (
          <div key={phase.label} className="relative">
            <span className="font-mono text-[10px] uppercase tracking-widest text-mid">0{i + 1}</span>
            <p className="font-display text-base font-medium mt-1">{phase.label}</p>
            <p className="text-[13px] leading-relaxed text-ink/70 mt-1">{phase.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JobTicket({ title, children }: { readonly title?: string; readonly children: ReactNode }) {
  return (
    <div className="border border-ink/10 bg-ink/[0.02] p-5 font-mono text-[13px] leading-relaxed overflow-x-auto">
      {title ? <div className="font-mono text-[10px] uppercase tracking-widest text-mid mb-3">{title}</div> : null}
      {children}
    </div>
  );
}

export function FeatureStatusTable() {
  return (
    <div className="overflow-x-auto border border-ink/10">
      <table className="min-w-full text-left text-[14px]">
        <thead className="border-b border-ink/10 bg-ink/[0.02]">
          <tr>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Feature</th>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Status</th>
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-mid font-normal">Notes</th>
          </tr>
        </thead>
        <tbody>
          {featureStatuses.map((feature: FeatureStatus) => (
            <tr key={feature.id} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-3 font-medium">{feature.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={feature.status} />
              </td>
              <td className="px-4 py-3 text-ink/80">{feature.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageShell({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={`max-w-[82rem] mx-auto px-6 ${className}`}>{children}</div>;
}

export function GlobalFooter() {
  return (
    <footer className="border-t border-ink/10 mt-24">
      <div className="max-w-[82rem] mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href={routes.home} className="flex items-center gap-2.5 mb-4">
              <AdvertekMark size={24} />
              <span className="font-display font-black tracking-[0.08em] text-sm">ADVERTEK</span>
            </Link>
            <p className="text-[14px] leading-relaxed text-mid max-w-xs">
              Advertek Agent Rail connects software to commercial production. Built on an operating Toronto production floor.
            </p>
          </div>
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-mid mb-4">{group.title}</h2>
              <ul className="space-y-2.5">
                {group.links.map((link) => {
                  const external =
                    "external" in link && (link as { external?: boolean }).external === true;
                  return (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="text-[14px] text-ink/80 hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-ink/10 mt-10 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[12px] text-mid">
          <p>© {new Date().getFullYear()} Advertek. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href={routes.privacy} className="hover:text-ink">
              Privacy
            </Link>
            <Link href={routes.terms} className="hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
