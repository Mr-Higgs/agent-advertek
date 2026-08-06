import { Fragment, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { RailAccessForm } from "./rail-access-form.js";
import { ACCENT, themes, type ThemeMode } from "./theme.js";
import { AdvertekMark, CropMark, RegMark } from "./icons.js";
import { DeckViewer } from "./deck-viewer.js";

const payloadLines: readonly string[] = [
  "POST /rail/v1/orders",
  "{",
  '  "agent": "proc-0x8f2a41",',
  '  "product": "wide_format.banner",',
  '  "spec": {',
  '    "size": "24x36in",',
  '    "substrate": "13oz_matte_vinyl",',
  '    "qty": 40',
  "  },",
  '  "settlement": {',
  '    "rail": "solana",',
  '    "asset": "usdc",',
  '    "status": "confirmed"',
  "  },",
  '  "dispatch": "2026-08-08"',
  "}",
];

interface PipelineStep {
  readonly n: string;
  readonly t: string;
  readonly d: string;
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
    d: "Payment confirms on Solana via QuickNode RPC before the job enters the production queue.",
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
}

const stack: readonly StackItem[] = [
  { role: "Agent", detail: "Machine-readable request" },
  { role: "Advertek Agent Rail", detail: "Order + spec routing" },
  { role: "Solana / QuickNode", detail: "Settlement + RPC" },
  { role: "OKX", detail: "Treasury on/off-ramp" },
  { role: "Production floor", detail: "North York, ON" },
];

const stats: ReadonlyArray<readonly [string, string]> = [
  ["12", "Product lines on the rail"],
  ["1", "Settlement rail — Solana"],
  ["North York, ON", "Production floor"],
  ["Agent-native", "Order interface"],
];

export default function AdvertekAgent() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const t = themes[mode];

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 120);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: t.bg,
        color: t.text,
        fontFamily: "'IBM Plex Sans', sans-serif",
        transition: "background-color 0.25s ease, color 0.25s ease",
      }}
      className="w-full min-h-screen"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .font-display { font-family: 'Big Shoulders Display', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }

        .stamp-in {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .stamp-in.mounted {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .payload-line {
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity 0.35s ease, transform 0.35s ease;
        }
        .payload-line.mounted {
          opacity: 1;
          transform: translateX(0);
        }

        a, button {
          transition: opacity 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
        }
        a:focus-visible, button:focus-visible {
          outline: 1px solid currentColor;
          outline-offset: 3px;
        }
        .nav-link { position: relative; }
        .nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -6px;
          height: 2px;
          background: ${ACCENT};
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.2s ease;
        }
        .nav-link:hover::after, .nav-link:focus-visible::after { transform: scaleX(1); }

        @media (prefers-reduced-motion: reduce) {
          .stamp-in, .payload-line {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* NAV */}
      <header
        className="sticky top-0 z-20 w-full"
        style={{ backgroundColor: t.bg, borderBottom: `1px solid ${t.line}` }}
      >
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdvertekMark size={26} />
            <div>
              <span className="font-mono text-sm tracking-widest uppercase block" style={{ color: t.text }}>
                Advertek Agent
              </span>
              <span
                className="font-mono block"
                style={{ color: ACCENT, fontSize: "0.55rem", letterSpacing: "0.2em" }}
              >
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
              <a href="#integration" className="nav-link" style={{ opacity: 0.9 }}>Integration</a>
              <a href="#deck" className="nav-link" style={{ opacity: 0.9 }}>Deck</a>
              <a href="#contact" className="nav-link" style={{ opacity: 0.9 }}>Contact</a>
            </nav>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "dark" ? "light" : "dark");
              }}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center justify-center w-8 h-8"
              style={{ border: `1px solid ${t.line}`, color: t.text }}
            >
              {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="rail" className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-start">
          {/* Left: copy */}
          <div>
            <div className="font-mono text-xs tracking-widest uppercase mb-6" style={{ color: ACCENT }}>
              Agent Fulfillment Rail — North America
            </div>
            <h1
              className="font-display uppercase leading-none mb-6"
              style={{ fontWeight: 700, fontSize: "3.25rem", letterSpacing: "-0.01em" }}
            >
              Print jobs agents can order, pay for, and track.
            </h1>
            <p className="text-base leading-relaxed mb-4" style={{ color: t.mid, maxWidth: "34rem" }}>
              Advertek Agent is the fulfillment rail behind advertekprinting.com.
              Machine-readable specs in, a shipped print job out — no quote
              emails, no PO cycles, no human in the loop unless something
              breaks.
            </p>
            <p className="text-base leading-relaxed mb-10" style={{ color: t.mid, maxWidth: "34rem" }}>
              Offset, digital, wide format, packaging, and bindery — the same
              floor that runs the storefront, now callable directly.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(true);
                }}
                className="font-mono text-xs tracking-widest uppercase px-6 py-3"
                style={{ backgroundColor: ACCENT, color: "#FFFFFF" }}
              >
                Request Rail Access
              </button>
              <a
                href="#integration"
                className="font-mono text-xs tracking-widest uppercase px-6 py-3"
                style={{ border: `1px solid ${t.line}`, color: t.text }}
              >
                View Integration
              </a>
            </div>
          </div>

          {/* Right: signature — job ticket + payload */}
          <div className={`stamp-in ${mounted ? "mounted" : ""}`}>
            {/* Job ticket */}
            <div className="relative p-6" style={{ backgroundColor: t.ticketBg, color: t.ticketText }}>
              <CropMark className="absolute -top-1 -left-1" stroke={ACCENT} />
              <CropMark className="absolute -top-1 -right-1" stroke={ACCENT} />
              <CropMark className="absolute -bottom-1 -left-1" stroke={ACCENT} />
              <CropMark className="absolute -bottom-1 -right-1" stroke={ACCENT} />

              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="font-mono text-xs tracking-widest uppercase" style={{ color: t.ticketMid }}>
                    Job Ticket
                  </div>
                  <div className="font-mono text-sm mt-1">AGT-004471</div>
                </div>
                <RegMark />
              </div>

              <div className="border-t mb-5" style={{ borderColor: t.ticketLine }} />

              <dl className="font-mono text-xs space-y-2.5">
                <div className="flex justify-between gap-4">
                  <dt style={{ color: t.ticketMid }}>PRODUCT</dt>
                  <dd className="text-right">Wide Format — 24×36 Vinyl Banner</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: t.ticketMid }}>QTY</dt>
                  <dd>40</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: t.ticketMid }}>SUBSTRATE</dt>
                  <dd>13oz Matte Vinyl</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: t.ticketMid }}>STATUS</dt>
                  <dd style={{ color: ACCENT, fontWeight: 600 }}>In Production</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: t.ticketMid }}>SETTLEMENT</dt>
                  <dd>SOL — Confirmed</dd>
                </div>
              </dl>
            </div>

            {/* perforation */}
            <div style={{ borderTop: `1px dashed ${t.line}`, height: "1px" }} />

            {/* payload panel */}
            <div className="p-6 font-mono text-xs leading-relaxed" style={{ backgroundColor: t.payloadBg }}>
              <div className="mb-3 tracking-widest uppercase" style={{ color: ACCENT, fontSize: "0.65rem" }}>
                Originating request
              </div>
              {payloadLines.map((line, i) => (
                // Lines aren't unique (e.g. multiple "  }," closers), so the
                // index is the only stable key available for this static list.
                <div
                  key={`${String(i)}-${line}`}
                  className={`payload-line ${mounted ? "mounted" : ""}`}
                  style={{ transitionDelay: `${String(i * 45 + 200)}ms`, color: t.payloadText, opacity: 0.9 }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ backgroundColor: t.panel, borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}` }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(([n, l]) => (
            <div key={n}>
              <div className="font-display" style={{ fontWeight: 700, fontSize: "1.75rem", color: t.text }}>{n}</div>
              <div className="font-mono text-xs tracking-wide mt-1" style={{ color: t.mid }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PIPELINE */}
      <section style={{ backgroundColor: t.bg }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: ACCENT }}>
            How a job moves
          </div>
          <h2 className="font-display uppercase mb-12" style={{ fontWeight: 700, fontSize: "2rem" }}>
            Request to dispatch, in order
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {pipeline.map((s) => (
              <div key={s.n} className="pt-5" style={{ borderTop: `2px solid ${ACCENT}` }}>
                <div className="font-mono text-xs mb-3" style={{ color: t.mid }}>{s.n}</div>
                <div className="font-display uppercase mb-2" style={{ fontWeight: 700, fontSize: "1.15rem" }}>
                  {s.t}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: t.mid }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" style={{ backgroundColor: t.panel }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: ACCENT }}>
            Spec sheet
          </div>
          <h2 className="font-display uppercase mb-12" style={{ fontWeight: 700, fontSize: "2rem" }}>
            Everything the floor already runs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
            {capabilities.map(([name, desc]) => (
              <div key={name} className="pt-4" style={{ borderTop: `1px solid ${t.line}` }}>
                <div className="font-mono text-sm mb-1 uppercase tracking-wide">{name}</div>
                <div className="text-sm" style={{ color: t.mid }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATION */}
      <section id="integration" style={{ backgroundColor: t.bg }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: ACCENT }}>
            Stack
          </div>
          <h2 className="font-display uppercase mb-12" style={{ fontWeight: 700, fontSize: "2rem" }}>
            Built to be called, not emailed
          </h2>

          <div className="flex flex-col md:flex-row md:items-stretch gap-0">
            {stack.map((item, i) => (
              <Fragment key={item.role}>
                <div className="flex-1 p-5" style={{ border: `1px solid ${t.line}` }}>
                  <div className="font-mono text-sm mb-1">{item.role}</div>
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

          <p className="text-sm leading-relaxed mt-8 max-w-2xl" style={{ color: t.mid }}>
            Settlement runs on Solana with QuickNode as RPC infrastructure.
            OKX handles treasury on/off-ramp. The rail itself is built in
            Cursor, sitting in front of the same production systems that run
            advertekprinting.com.
          </p>
        </div>
      </section>

      {/* PITCH DECK */}
      <section id="deck" style={{ backgroundColor: t.panel }}>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: ACCENT }}>
            The pitch
          </div>
          <h2 className="font-display uppercase mb-12" style={{ fontWeight: 700, fontSize: "2rem" }}>
            Ten slides, if you want the whole story
          </h2>
          <DeckViewer theme={t} />
        </div>
      </section>

      {/* FOOTER / CTA */}
      <footer id="contact" style={{ backgroundColor: t.bg, borderTop: `1px solid ${t.line}` }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-display uppercase mb-6" style={{ fontWeight: 700, fontSize: "2rem" }}>
            Building an agent that needs to print something?
          </h2>
          <div className="flex flex-wrap items-center gap-4 mb-14">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(true);
              }}
              className="font-mono text-xs tracking-widest uppercase px-6 py-3"
              style={{ backgroundColor: ACCENT, color: "#FFFFFF" }}
            >
              Request Rail Access
            </button>
            <span className="font-mono text-xs" style={{ color: t.mid }}>
              advertekprinting.com
            </span>
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
