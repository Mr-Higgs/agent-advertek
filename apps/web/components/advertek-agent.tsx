"use client";

import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { RailAccessForm } from "./rail-access-form";
import { ACCENT, SOLANA_GRAD, themes, type Theme, type ThemeMode } from "./theme";
import { AdvertekMark, RegMark } from "./icons";
import { DeckViewer } from "./deck-viewer";
import { IntegrationExplorer } from "./integration-explorer";

const payloadLines: readonly string[] = [
  "POST /api/quotes",
  "{",
  '  "skuId": "wide_format.banner",',
  '  "quantity": 40,',
  '  "specification": {',
  '    "size": "24x36in",',
  '    "substrate": "13oz_matte_vinyl",',
  '    "turnaround": "standard"',
  "  }",
  "}",
];

const responseLines: readonly string[] = [
  '{ "total": { "currency": "USDC",',
  '            "amountBaseUnits": "91250000" },',
  '  "settlement": { "rail": "solana",',
  '                  "status": "confirmed" } }',
];

interface PipelineStep {
  readonly n: string;
  readonly t: string;
  readonly d: string;
  readonly onChain?: boolean;
}

const pipeline: readonly PipelineStep[] = [
  {
    n: "01",
    t: "Request",
    d: "Agent submits a machine-readable spec — product, quantity, substrate, deadline. No quote thread.",
  },
  {
    n: "02",
    t: "Settle",
    d: "Payment confirms in USDC on Solana via QuickNode RPC before the job enters the production queue.",
    onChain: true,
  },
  {
    n: "03",
    t: "Produce",
    d: "Job routes to the correct floor — offset, digital, wide format, bindery, or POD.",
  },
  {
    n: "04",
    t: "Dispatch",
    d: "Tracking and proof-of-completion post back to the requesting agent automatically.",
  },
];

const capabilities: ReadonlyArray<readonly [string, string]> = [
  ["Offset", "Sheet-fed and web offset for run length that favors it"],
  ["Digital", "Short-run and variable data, plate-free turnaround"],
  ["Wide format", "Banners, signage, vehicle and window graphics"],
  ["Book manufacturing", "Perfect bound, saddle-stitch, case bound"],
  ["Dye sub / promo", "Apparel and hard-surface sublimation"],
  ["Wall decor", "Large-format fine art and photographic prints"],
  ["Direct mail", "Data-merged, sorted, and postal-ready"],
  ["Embellishments", "Foil, emboss, spot UV, die cutting"],
  ["Photo lab", "Consumer and pro photographic output"],
  ["Packaging", "Folding carton, rigid box, corrugate"],
  ["Bindery", "Cutting, folding, laminating, finishing"],
  ["POD", "Print-on-demand, single-unit fulfillment"],
];

interface StackItem {
  readonly role: string;
  readonly detail: string;
  readonly onChain?: boolean;
}

const stack: readonly StackItem[] = [
  { role: "Agent", detail: "Machine-readable request" },
  { role: "Advertek Agent Rail", detail: "Order + spec routing" },
  { role: "Solana / QuickNode", detail: "USDC settlement + RPC", onChain: true },
  { role: "OKX", detail: "Treasury on/off-ramp" },
  { role: "Production floor", detail: "North York, ON" },
];

const stats: ReadonlyArray<readonly [string, string, boolean]> = [
  ["12", "Product lines on the rail", false],
  ["USDC", "Settled on Solana", true],
  ["North York, ON", "Production floor", false],
  ["Agent-native", "Order interface", false],
];

const heroChips: readonly string[] = ["USDC on Solana", "MCP-native", "No PO cycles"];

interface SectionHeadingProps {
  readonly eyebrow: string;
  readonly title: ReactNode;
  readonly theme: Theme;
}

function SectionHeading({ eyebrow, title, theme: t }: SectionHeadingProps) {
  return (
    <>
      <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: ACCENT }}>
        {eyebrow}
      </div>
      <h2
        className="font-display uppercase mb-12"
        style={{ fontWeight: 700, fontSize: "clamp(1.6rem, 3.4vw, 2.25rem)", color: t.text, letterSpacing: "-0.01em" }}
      >
        {title}
      </h2>
    </>
  );
}

export default function AdvertekAgent() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const t = themes[mode];
  const isDark = mode === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 120);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const rootStyle: CSSProperties = {
    backgroundColor: t.bg,
    color: t.text,
    fontFamily: "var(--font-sans), 'IBM Plex Sans', sans-serif",
    transition: "background-color 0.25s ease, color 0.25s ease",
    "--accent": ACCENT,
    "--solana-grad": SOLANA_GRAD,
    "--grid-line": t.line,
    "--pulse-color": "rgba(20,241,149,0.45)",
  } as CSSProperties;

  // Border-less base so callers can apply either the `border` shorthand or
  // per-side longhands without mixing the two in one style object (which
  // triggers React's "updating a style property during rerender" warning).
  const glassBase: CSSProperties = {
    backgroundColor: t.cardBg,
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  };
  const glassCard: CSSProperties = {
    ...glassBase,
    border: `1px solid ${t.cardBorder}`,
  };

  return (
    <div className="relative w-full min-h-screen" style={rootStyle}>
      {/* Ambient background: masked grid + accent glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="grid-bg absolute inset-0" style={{ opacity: isDark ? 0.5 : 0.35 }} />
        <div
          className="hero-glow absolute"
          style={{ width: 560, height: 560, top: -220, left: "12%", background: t.glow }}
        />
        <div
          className="hero-glow absolute"
          style={{ width: 460, height: 460, top: 60, right: "-4%", background: "rgba(153,69,255,0.16)" }}
        />
      </div>

      <div className="relative z-10">
        {/* NAV */}
        <header
          className="sticky top-0 z-30 w-full"
          style={{
            backgroundColor: isDark ? "rgba(6,9,16,0.72)" : "rgba(255,255,255,0.72)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: `1px solid ${t.line}`,
          }}
        >
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AdvertekMark size={26} />
              <div>
                <span className="font-mono text-sm tracking-widest uppercase block" style={{ color: t.text }}>
                  Advertek Agent
                </span>
                <span className="font-mono block" style={{ color: ACCENT, fontSize: "0.55rem", letterSpacing: "0.2em" }}>
                  Going Beyond Ink
                </span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <nav
                className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest uppercase"
                style={{ color: t.mid }}
              >
                <a href="#rail" className="nav-link" style={{ opacity: 0.9 }}>Rail</a>
                <a href="#capabilities" className="nav-link" style={{ opacity: 0.9 }}>Capabilities</a>
                <a href="#integration" className="nav-link" style={{ opacity: 0.9 }}>API</a>
                <a href="#deck" className="nav-link" style={{ opacity: 0.9 }}>Deck</a>
                <a href="#contact" className="nav-link" style={{ opacity: 0.9 }}>Contact</a>
              </nav>

              <button
                type="button"
                onClick={() => {
                  setMode(isDark ? "light" : "dark");
                }}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="flex items-center justify-center w-9 h-9 rounded-md"
                style={{ border: `1px solid ${t.cardBorder}`, backgroundColor: t.cardBg, color: t.text }}
              >
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section id="rail" className="max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
            {/* Left: copy */}
            <div>
              <div
                className="inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase mb-7 px-3 py-1.5 rounded-full"
                style={{ color: t.midStrong, border: `1px solid ${t.cardBorder}`, backgroundColor: t.cardBg }}
              >
                <span
                  className="pulse-dot inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "#14F195" }}
                />
                Agent Fulfillment Rail — North America
              </div>
              <h1
                className="font-display uppercase leading-[0.95] mb-6"
                style={{ fontWeight: 700, fontSize: "clamp(2.6rem, 6vw, 4.25rem)", letterSpacing: "-0.02em" }}
              >
                Print jobs agents can order, <span className="grad-text">pay for</span>, and track.
              </h1>
              <p className="text-base leading-relaxed mb-4" style={{ color: t.mid, maxWidth: "34rem" }}>
                Advertek Agent is the fulfillment rail behind advertekprinting.com. Machine-readable
                specs in, a shipped print job out — no quote emails, no PO cycles, no human in the
                loop unless something breaks.
              </p>
              <p className="text-base leading-relaxed mb-9" style={{ color: t.mid, maxWidth: "34rem" }}>
                Offset, digital, wide format, packaging, and bindery — the same floor that runs the
                storefront, now callable over an API and settled in USDC on Solana.
              </p>
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(true);
                  }}
                  className="font-mono text-xs tracking-widest uppercase px-6 py-3.5 rounded-md"
                  style={{ backgroundColor: ACCENT, color: "#FFFFFF", boxShadow: `0 10px 34px ${t.glow}` }}
                >
                  Request Rail Access
                </button>
                <a
                  href="#integration"
                  className="font-mono text-xs tracking-widest uppercase px-6 py-3.5 rounded-md"
                  style={{ border: `1px solid ${t.cardBorder}`, backgroundColor: t.cardBg, color: t.text }}
                >
                  Explore the API
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {heroChips.map((chip) => (
                  <span
                    key={chip}
                    className="font-mono text-xs px-3 py-1.5 rounded-full"
                    style={{ color: t.mid, border: `1px solid ${t.line}` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: settlement terminal */}
            <div className={`stamp-in ${mounted ? "mounted" : ""}`}>
              <div className="rounded-xl overflow-hidden" style={{ ...glassCard, boxShadow: isDark ? "0 30px 80px rgba(0,0,0,0.45)" : "0 30px 80px rgba(11,18,32,0.12)" }}>
                {/* window header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${t.cardBorder}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
                  </div>
                  <span className="font-mono text-xs tracking-widest uppercase" style={{ color: t.mid }}>
                    advertek://rail
                  </span>
                  <RegMark />
                </div>

                {/* ticket body */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="font-mono text-xs tracking-widest uppercase" style={{ color: t.mid }}>
                        Job Ticket
                      </div>
                      <div className="font-mono text-sm mt-1" style={{ color: t.text }}>AGT-004471</div>
                    </div>
                    <div
                      className="grad-border flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full"
                      style={{ color: t.text }}
                    >
                      <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#14F195" }} />
                      SOL · USDC — Confirmed
                    </div>
                  </div>

                  <div className="border-t mb-5" style={{ borderColor: t.cardBorder }} />

                  <dl className="font-mono text-xs space-y-2.5">
                    {[
                      ["PRODUCT", "Wide Format — 24×36 Vinyl Banner"],
                      ["QTY", "40"],
                      ["SUBSTRATE", "13oz Matte Vinyl"],
                      ["STATUS", "In Production"],
                      ["SETTLEMENT", "91.25 USDC"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt style={{ color: t.mid }}>{k}</dt>
                        <dd
                          className="text-right"
                          style={{ color: k === "STATUS" ? ACCENT : t.text, fontWeight: k === "STATUS" ? 600 : 400 }}
                        >
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* code payload */}
                <div className="px-5 py-5 font-mono text-xs leading-relaxed" style={{ backgroundColor: t.payloadBg }}>
                  <div className="mb-3 tracking-widest uppercase" style={{ color: "#14F195", fontSize: "0.65rem" }}>
                    Originating request
                  </div>
                  {payloadLines.map((line, i) => (
                    <div
                      key={`${String(i)}-${line}`}
                      className={`payload-line ${mounted ? "mounted" : ""}`}
                      style={{ transitionDelay: `${String(i * 45 + 200)}ms`, color: t.payloadText, opacity: 0.92 }}
                    >
                      {line}
                    </div>
                  ))}
                  <div className="mt-4 mb-2 tracking-widest uppercase" style={{ color: t.mid, fontSize: "0.65rem" }}>
                    200 OK
                  </div>
                  {responseLines.map((line, i) => (
                    <div
                      key={`r-${String(i)}`}
                      className={`payload-line ${mounted ? "mounted" : ""}`}
                      style={{ transitionDelay: `${String(i * 45 + 700)}ms`, color: "#7EE7C0" }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, backgroundColor: t.cardBg }}>
          <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(([n, l, grad]) => (
              <div key={l}>
                <div
                  className={`font-display ${grad ? "grad-text" : ""}`}
                  style={{ fontWeight: 700, fontSize: "2rem", color: grad ? undefined : t.text, lineHeight: 1.05 }}
                >
                  {n}
                </div>
                <div className="font-mono text-xs tracking-wide mt-2" style={{ color: t.mid }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PIPELINE */}
        <section>
          <div className="max-w-6xl mx-auto px-6 py-24">
            <SectionHeading eyebrow="How a job moves" title="Request to dispatch, in order" theme={t} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {pipeline.map((s) => (
                <div
                  key={s.n}
                  className={`lift rounded-lg p-5 ${s.onChain ? "grad-border" : ""}`}
                  style={{
                    ...glassBase,
                    borderTop: s.onChain ? `1px solid ${t.cardBorder}` : `2px solid ${ACCENT}`,
                    borderRight: `1px solid ${t.cardBorder}`,
                    borderBottom: `1px solid ${t.cardBorder}`,
                    borderLeft: `1px solid ${t.cardBorder}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-xs" style={{ color: t.mid }}>{s.n}</div>
                    {s.onChain && (
                      <span
                        className="font-mono px-2 py-0.5 rounded-full grad-text"
                        style={{ fontSize: "0.6rem", letterSpacing: "0.12em", border: `1px solid ${t.cardBorder}` }}
                      >
                        ON-CHAIN
                      </span>
                    )}
                  </div>
                  <div className="font-display uppercase mb-2" style={{ fontWeight: 700, fontSize: "1.2rem", color: t.text }}>
                    {s.t}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: t.mid }}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section id="capabilities" style={{ backgroundColor: t.panel, borderTop: `1px solid ${t.line}` }}>
          <div className="max-w-6xl mx-auto px-6 py-24">
            <SectionHeading eyebrow="Spec sheet" title="Everything the floor already runs" theme={t} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {capabilities.map(([name, desc]) => (
                <div
                  key={name}
                  className="lift rounded-lg p-5"
                  style={glassCard}
                >
                  <div className="font-mono text-sm mb-1 uppercase tracking-wide" style={{ color: t.text }}>{name}</div>
                  <div className="text-sm" style={{ color: t.mid }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INTEGRATION */}
        <section id="integration" style={{ borderTop: `1px solid ${t.line}` }}>
          <div className="max-w-6xl mx-auto px-6 py-24">
            <SectionHeading eyebrow="Stack" title="Built to be called, not emailed" theme={t} />

            <div className="flex flex-col md:flex-row md:items-stretch gap-0 mb-8">
              {stack.map((item, i) => (
                <Fragment key={item.role}>
                  <div
                    className={`flex-1 p-5 rounded-lg ${item.onChain ? "grad-border" : ""}`}
                    style={{
                      ...glassBase,
                      border: item.onChain ? `1px solid transparent` : `1px solid ${t.cardBorder}`,
                    }}
                  >
                    <div
                      className={`font-mono text-sm mb-1 ${item.onChain ? "grad-text" : ""}`}
                      style={{ color: item.onChain ? undefined : t.text }}
                    >
                      {item.role}
                    </div>
                    <div className="text-xs" style={{ color: t.mid }}>{item.detail}</div>
                  </div>
                  {i < stack.length - 1 && (
                    <div
                      className="flex items-center justify-center font-mono text-sm px-2 py-3 md:py-0"
                      style={{ color: ACCENT }}
                      aria-hidden="true"
                    >
                      →
                    </div>
                  )}
                </Fragment>
              ))}
            </div>

            <p className="text-sm leading-relaxed mb-12 max-w-2xl" style={{ color: t.mid }}>
              Settlement runs on Solana with QuickNode as RPC infrastructure. OKX handles treasury
              on/off-ramp. The rail is exposed as a keyless REST + MCP surface, sitting in front of
              the same production systems that run advertekprinting.com.
            </p>

            <div className="rounded-xl p-6 md:p-8" style={glassCard}>
              <IntegrationExplorer theme={t} />
            </div>
          </div>
        </section>

        {/* PITCH DECK */}
        <section id="deck" style={{ backgroundColor: t.panel, borderTop: `1px solid ${t.line}` }}>
          <div className="max-w-6xl mx-auto px-6 py-24">
            <SectionHeading eyebrow="The pitch" title="Ten slides, if you want the whole story" theme={t} />
            <DeckViewer theme={t} />
          </div>
        </section>

        {/* FOOTER / CTA */}
        <footer id="contact" style={{ backgroundColor: t.bg, borderTop: `1px solid ${t.line}` }}>
          <div className="h-0.5 w-full" style={{ background: SOLANA_GRAD, opacity: 0.8 }} />
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h2
              className="font-display uppercase mb-6"
              style={{ fontWeight: 700, fontSize: "clamp(1.7rem, 3.6vw, 2.4rem)", letterSpacing: "-0.01em" }}
            >
              Building an agent that needs to print something?
            </h2>
            <div className="flex flex-wrap items-center gap-4 mb-16">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(true);
                }}
                className="font-mono text-xs tracking-widest uppercase px-6 py-3.5 rounded-md"
                style={{ backgroundColor: ACCENT, color: "#FFFFFF", boxShadow: `0 10px 34px ${t.glow}` }}
              >
                Request Rail Access
              </button>
              <a
                href="https://advertekprinting.com"
                className="font-mono text-xs tracking-widest uppercase px-6 py-3.5 rounded-md"
                style={{ border: `1px solid ${t.cardBorder}`, backgroundColor: t.cardBg, color: t.text }}
              >
                advertekprinting.com
              </a>
            </div>
            <div
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-6 font-mono text-xs"
              style={{ borderTop: `1px solid ${t.line}`, color: t.mid }}
            >
              <div className="flex items-center gap-3">
                <AdvertekMark size={18} />
                <span>Advertek Printing — North York, ON</span>
              </div>
              <span style={{ color: ACCENT, letterSpacing: "0.15em" }}>GOING BEYOND INK</span>
            </div>
          </div>
        </footer>
      </div>

      {isFormOpen && (
        <RailAccessForm
          theme={t}
          onClose={() => {
            setIsFormOpen(false);
          }}
        />
      )}
    </div>
  );
}
