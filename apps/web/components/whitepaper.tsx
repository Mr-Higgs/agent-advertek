"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { ACCENT, SOLANA_GRAD, themes, type Theme, type ThemeMode } from "./theme";
import { AdvertekMark } from "./icons";

interface TocEntry {
  readonly id: string;
  readonly n: string;
  readonly label: string;
}

const toc: readonly TocEntry[] = [
  { id: "abstract", n: "00", label: "Abstract" },
  { id: "problem", n: "01", label: "The problem" },
  { id: "why-now", n: "02", label: "Why now" },
  { id: "system", n: "03", label: "System overview" },
  { id: "lifecycle", n: "04", label: "Order lifecycle" },
  { id: "settlement", n: "05", label: "Settlement architecture" },
  { id: "treasury", n: "06", label: "Treasury and fiat" },
  { id: "invariants", n: "07", label: "Engineering invariants" },
  { id: "market", n: "08", label: "Market context" },
  { id: "roadmap", n: "09", label: "Status and roadmap" },
];

const lifecycleSteps: ReadonlyArray<{
  readonly n: string;
  readonly title: string;
  readonly body: string;
  readonly onChain?: boolean;
}> = [
  {
    n: "01",
    title: "Spec + quote",
    body: "The agent calls an MCP tool or POST /api/quotes with a machine-readable SkuSpec. The rail returns a deterministic quote priced in CAD cents and converted to USDC base units.",
  },
  {
    n: "02",
    title: "Payment request",
    body: "The payments layer issues a USDC payment request that embeds the internal order id in a Solana memo — no signing keys on the web tier.",
  },
  {
    n: "03",
    title: "On-chain transfer",
    body: "The agent's wallet signs and submits a USDC SPL transfer on Solana to the settlement address, carrying the memo that correlates payment to order.",
    onChain: true,
  },
  {
    n: "04",
    title: "Confirmation",
    body: "QuickNode Streams verifies the transfer and delivers a signature-checked webhook. The handler parses the order id from the memo and advances the order.",
    onChain: true,
  },
  {
    n: "05",
    title: "Production",
    body: "Fulfillment maps the product line to an Advertek product code and POSTs the job into the existing production API — the same floor that runs the storefront.",
  },
  {
    n: "06",
    title: "Status webhooks",
    body: "Advertek status events are bridged into a normalized OrderStatus vocabulary and fan out to agent subscribers: confirmed → in production → shipped.",
  },
  {
    n: "07",
    title: "Treasury sweep",
    body: "Independently of any single order, accumulated USDC is deposited to OKX, converted to CAD, and reconciled back to individual orders within tolerance.",
  },
];

const protocols: ReadonlyArray<{
  readonly name: string;
  readonly org: string;
  readonly detail: string;
}> = [
  {
    name: "MCP",
    org: "Anthropic",
    detail:
      "Model Context Protocol lets an agent read real-time inventory, pricing, and product detail as first-class tools — not scraped HTML.",
  },
  {
    name: "ACP",
    org: "Stripe + OpenAI",
    detail:
      "Agentic Commerce Protocol is live in ChatGPT Shopping checkout, establishing a shared language for agent-initiated purchase flows.",
  },
  {
    name: "UCP",
    org: "Google",
    detail:
      "Universal Commerce Protocol spans discovery through post-purchase. Launched at NRF 2026, it closes the loop from intent to fulfillment.",
  },
];

const mcpTools: ReadonlyArray<{
  readonly name: string;
  readonly detail: string;
}> = [
  {
    name: "get_catalog",
    detail: "Discover product lines, finishes, and machine-orderable SKUs without inventing codes.",
  },
  {
    name: "get_quote",
    detail: "Price a full SkuSpec — product line, quantity, dimensions, stock, turnaround, print-ready assets — into CAD cents and USDC.",
  },
  {
    name: "get_sku_quote",
    detail: "Price a raw print-on-demand SKU code from the checked-in POD price list, then convert to USDC base units.",
  },
];

const wedges: ReadonlyArray<{
  readonly name: string;
  readonly stat: string;
  readonly note: string;
}> = [
  {
    name: "POD / DTC brands",
    stat: "$13–15B global market, 2026",
    note: "Fastest to integrate — the first wedge.",
  },
  {
    name: "Real estate marketing",
    stat: "4.1M annual U.S. transactions",
    note: "One listing, one clean trigger.",
  },
  {
    name: "Franchise / multi-location",
    stat: "845,000 U.S. establishments",
    note: "Same reorder, thousands of locations.",
  },
  {
    name: "Regulated direct mail",
    stat: "$39B+ U.S. marketer spend",
    note: "Recurring, event-triggered campaigns.",
  },
  {
    name: "Agencies / creative-ops",
    stat: "40% of enterprise apps embed agents by 2026",
    note: "One integration, every client they serve.",
  },
];

const invariants: ReadonlyArray<{
  readonly title: string;
  readonly body: string;
}> = [
  {
    title: "Money is integer minor units",
    body: "USDC base units (6 decimals) and CAD/USD cents are always bigint. Never floats. Decimal strings exist only at vendor API boundaries.",
  },
  {
    title: "Zod at every trust boundary",
    body: "Environment, MCP tool input, vendor request/response payloads, and webhook bodies are all validated before they touch business logic.",
  },
  {
    title: "All I/O is injected",
    body: "Functions take a Deps object holding fetch-like clients, RPC clients, now(), and id generators. Unit tests supply fakes — no test touches the network.",
  },
  {
    title: "Keyless web tier",
    body: "Building a payment request needs no signing. The only process holding money-moving secrets is the dedicated treasury worker — settlement keypair and OKX trading credentials.",
  },
  {
    title: "Trading ≠ withdrawal",
    body: "Automated sweeps use trading credentials only. Withdrawal credentials are a separate key set the automation never touches. Fiat leaving OKX stays a deliberate human action.",
  },
  {
    title: "Webhook-first confirmation",
    body: "Serverless functions cannot hold long-polling confirmation open. QuickNode Streams delivers confirmation; retries are idempotent against a processed-deliveries store.",
  },
];

const packageMap: ReadonlyArray<{
  readonly path: string;
  readonly role: string;
}> = [
  { path: "apps/web", role: "Landing page, POST /api/quotes, remote MCP, webhook handlers" },
  { path: "apps/treasury-worker", role: "Always-on sweep worker — the only key-bearing process" },
  { path: "packages/mcp-server", role: "MCP tool registrations; stdio entry for local agents" },
  { path: "packages/quote-api", role: "Realtime and SKU quote core; CAD → USDC conversion" },
  { path: "packages/payments", role: "Solana USDC rail — payment requests and confirmation" },
  { path: "packages/fulfillment", role: "Advertek production API integration and status bridging" },
  { path: "packages/treasury", role: "Sweep, convert, reconcile — run by the worker" },
  { path: "packages/db", role: "Postgres implementations of order, webhook, and sweep seams" },
];

interface SectionHeadingProps {
  readonly n: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly theme: Theme;
}

function SectionHeading({ n, eyebrow, title, theme: t }: SectionHeadingProps) {
  return (
    <header className="mb-10">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-mono text-xs tracking-widest" style={{ color: ACCENT }}>
          {n}
        </span>
        <span className="font-mono text-xs tracking-widest uppercase" style={{ color: t.mid }}>
          {eyebrow}
        </span>
      </div>
      <h2
        className="font-display uppercase"
        style={{
          fontWeight: 700,
          fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
          color: t.text,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
    </header>
  );
}

interface ProseProps {
  readonly children: ReactNode;
  readonly theme: Theme;
}

function Prose({ children, theme: t }: ProseProps) {
  return (
    <p className="text-base leading-relaxed mb-5" style={{ color: t.mid, maxWidth: "42rem" }}>
      {children}
    </p>
  );
}

export default function Whitepaper() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const t = themes[mode];
  const isDark = mode === "dark";

  const rootStyle: CSSProperties = {
    backgroundColor: t.bg,
    color: t.text,
    fontFamily: "var(--font-sans), 'IBM Plex Sans', sans-serif",
    transition: "background-color 0.25s ease, color 0.25s ease",
  };

  const glassCard: CSSProperties = {
    backgroundColor: t.cardBg,
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    border: `1px solid ${t.cardBorder}`,
  };

  return (
    <div className="relative w-full min-h-screen" style={rootStyle}>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="grid-bg absolute inset-0" style={{ opacity: isDark ? 0.4 : 0.3 }} />
        <div
          className="hero-glow absolute"
          style={{ width: 480, height: 480, top: -180, left: "8%", background: t.glow }}
        />
      </div>

      <div className="relative z-10">
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
            <a href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
              <AdvertekMark size={26} />
              <div>
                <span className="font-mono text-sm tracking-widest uppercase block" style={{ color: t.text }}>
                  Advertek Agent
                </span>
                <span
                  className="font-mono block"
                  style={{ color: ACCENT, fontSize: "0.55rem", letterSpacing: "0.2em" }}
                >
                  Whitepaper
                </span>
              </div>
            </a>

            <div className="flex items-center gap-6">
              <nav
                className="hidden md:flex items-center gap-6 font-mono text-xs tracking-widest uppercase"
                style={{ color: t.mid }}
              >
                <a href="/" className="nav-link" style={{ opacity: 0.9 }}>
                  Home
                </a>
                <a href="/#deck" className="nav-link" style={{ opacity: 0.9 }}>
                  Deck
                </a>
                <a href="/#contact" className="nav-link" style={{ opacity: 0.9 }}>
                  Contact
                </a>
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

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
          <div
            className="inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase mb-6 px-3 py-1.5 rounded-full"
            style={{ color: t.midStrong, border: `1px solid ${t.cardBorder}`, backgroundColor: t.cardBg }}
          >
            Technical whitepaper
          </div>
          <h1
            className="font-display uppercase leading-[0.95] mb-6"
            style={{
              fontWeight: 700,
              fontSize: "clamp(2.4rem, 5.5vw, 3.75rem)",
              letterSpacing: "-0.02em",
              maxWidth: "18ch",
            }}
          >
            Advertek <span className="grad-text">Agent Rail</span>
          </h1>
          <p className="text-lg leading-relaxed mb-3" style={{ color: t.midStrong, maxWidth: "38rem" }}>
            The print vendor AI agents can order from directly — no human in the loop.
          </p>
          <p className="text-sm font-mono tracking-wide" style={{ color: t.mid }}>
            Spec → quote → USDC on Solana → production → status. Machine-native end to end.
          </p>
        </section>

        <div className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-12 items-start">
            {/* TOC */}
            <aside className="lg:sticky lg:top-24">
              <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: ACCENT }}>
                Contents
              </div>
              <nav aria-label="Whitepaper table of contents">
                <ol className="space-y-2.5">
                  {toc.map((entry) => (
                    <li key={entry.id}>
                      <a
                        href={`#${entry.id}`}
                        className="flex items-baseline gap-2 font-mono text-xs tracking-wide nav-link"
                        style={{ color: t.mid, textDecoration: "none" }}
                      >
                        <span style={{ color: ACCENT, opacity: 0.7 }}>{entry.n}</span>
                        <span>{entry.label}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* Article */}
            <article className="min-w-0">
              {/* 00 Abstract */}
              <section id="abstract" className="scroll-mt-28 mb-20">
                <SectionHeading n="00" eyebrow="Abstract" title="A machine-native print rail" theme={t} />
                <Prose theme={t}>
                  Advertek Agent Rail is an MCP server and REST API layered over Advertek&apos;s existing
                  print manufacturing — offset, digital, wide-format, packaging, print-on-demand, and
                  direct mail. An AI agent can discover the catalog, obtain a deterministic quote,
                  pay in USDC on Solana, and have the job submitted to production automatically, with
                  status flowing back through a normalized vocabulary. Accumulated USDC is swept to
                  fiat (CAD) through OKX on a schedule, independently of any single order. There is
                  no quote form and no human on either side of a successful path.
                </Prose>
              </section>

              {/* 01 Problem */}
              <section id="problem" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="01"
                  eyebrow="The problem"
                  title="Agents can't buy print today"
                  theme={t}
                />
                <Prose theme={t}>
                  AI agents — shopping, procurement, and commerce agents — are beginning to place
                  real-world orders using protocols like MCP, ACP, and UCP. They can research, plan,
                  and generate content. What they cannot do is buy physical print production from a
                  vendor built for humans.
                </Prose>
                <Prose theme={t}>
                  Existing print vendors — Vistaprint, Printful, Moo, and regional shops alike —
                  require a person to fill out a quote form, negotiate turnaround, and pay by card
                  or invoice. That is not a manufacturing limitation. It is an interface problem.
                  There is no machine-native rail that lets an agent go from intent → price → payment
                  → production → status without a human in the loop.
                </Prose>
                <Prose theme={t}>
                  Advertek wants to become the default print vendor for autonomous agents before
                  those agents develop purchasing habits that lock in competitors. The window is
                  open because the infrastructure to build this rail did not exist six months ago.
                </Prose>
              </section>

              {/* 02 Why now */}
              <section id="why-now" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="02"
                  eyebrow="Why now"
                  title="Three protocols made this buildable"
                  theme={t}
                />
                <Prose theme={t}>
                  Agentic physical commerce was theoretical until a cluster of protocols from major
                  platforms closed the gap between agent intent and vendor systems. Three of them
                  matter for this rail:
                </Prose>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {protocols.map((p) => (
                    <div key={p.name} className="rounded-lg p-5" style={glassCard}>
                      <div className="font-display uppercase mb-1" style={{ fontWeight: 700, fontSize: "1.35rem" }}>
                        {p.name}
                      </div>
                      <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: ACCENT }}>
                        {p.org}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: t.mid }}>
                        {p.detail}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="rounded-lg p-5"
                  style={{ ...glassCard, borderLeft: `3px solid ${ACCENT}` }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: t.midStrong }}>
                    This is a land grab, not a slow build. The category has no leader yet because
                    the infrastructure to build one did not exist six months ago. Agent Rail sits
                    at the physical-fulfillment layer that every agent framework will eventually
                    need to call.
                  </p>
                </div>
              </section>

              {/* 03 System */}
              <section id="system" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="03"
                  eyebrow="System overview"
                  title="An API and an MCP server"
                  theme={t}
                />
                <Prose theme={t}>
                  The solution is deliberately thin at the agent boundary and deep at the floor. An
                  agent specs a job, pays for it, and gets it shipped. The rail is layered over
                  Advertek&apos;s twelve existing product lines — the same manufacturing capacity that
                  already runs the DTC storefront — so there is no new printer to build, only a
                  machine-orderable interface.
                </Prose>
                <Prose theme={t}>
                  Agents talk to the rail through three MCP tools. Tool descriptions are the
                  agent&apos;s only documentation, so they are deliberately verbose and instruct
                  agents never to invent prices or SKU codes:
                </Prose>
                <div className="space-y-3 mb-8">
                  {mcpTools.map((tool) => (
                    <div key={tool.name} className="rounded-lg px-5 py-4" style={glassCard}>
                      <code className="font-mono text-sm" style={{ color: ACCENT }}>
                        {tool.name}
                      </code>
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: t.mid }}>
                        {tool.detail}
                      </p>
                    </div>
                  ))}
                </div>
                <Prose theme={t}>
                  Quotes are priced in CAD (cents as integer minor units), then converted to USDC
                  base units via a spot-rate client. The same quote core powers both the MCP tools
                  and <code className="font-mono text-sm">POST /api/quotes</code> for non-MCP
                  consumers. Remote MCP is served over Streamable HTTP from the Next.js app;
                  a stdio entry remains for local Cursor and Claude Code clients.
                </Prose>
                <div className="rounded-xl overflow-hidden mt-8" style={glassCard}>
                  <div
                    className="px-5 py-3 font-mono text-xs tracking-widest uppercase"
                    style={{ borderBottom: `1px solid ${t.cardBorder}`, color: t.mid }}
                  >
                    Hosted topology
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${t.line}` }}>
                          <th
                            className="text-left font-mono text-xs tracking-widest uppercase px-5 py-3"
                            style={{ color: t.mid }}
                          >
                            Path
                          </th>
                          <th
                            className="text-left font-mono text-xs tracking-widest uppercase px-5 py-3"
                            style={{ color: t.mid }}
                          >
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {packageMap.map((row) => (
                          <tr key={row.path} style={{ borderBottom: `1px solid ${t.line}` }}>
                            <td className="font-mono text-xs px-5 py-3 whitespace-nowrap" style={{ color: t.text }}>
                              {row.path}
                            </td>
                            <td className="px-5 py-3" style={{ color: t.mid }}>
                              {row.role}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* 04 Lifecycle */}
              <section id="lifecycle" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="04"
                  eyebrow="Order lifecycle"
                  title="Spec to cash. Seven steps. Zero humans."
                  theme={t}
                />
                <Prose theme={t}>
                  A single successful order traverses seven steps. Settlement moments are called out
                  explicitly — they are the only places the Solana rail appears in the path.
                </Prose>
                <ol className="space-y-4 mb-8">
                  {lifecycleSteps.map((step) => (
                    <li
                      key={step.n}
                      className={`rounded-lg p-5 ${step.onChain === true ? "grad-border" : ""}`}
                      style={
                        step.onChain === true
                          ? {
                              backgroundColor: t.cardBg,
                              backdropFilter: "blur(6px)",
                              WebkitBackdropFilter: "blur(6px)",
                            }
                          : glassCard
                      }
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-xs" style={{ color: t.mid }}>
                          {step.n}
                        </span>
                        <span
                          className="font-display uppercase"
                          style={{ fontWeight: 700, fontSize: "1.1rem", color: t.text }}
                        >
                          {step.title}
                        </span>
                        {step.onChain === true && (
                          <span
                            className="font-mono px-2 py-0.5 rounded-full grad-text ml-auto"
                            style={{ fontSize: "0.6rem", letterSpacing: "0.12em", border: `1px solid ${t.cardBorder}` }}
                          >
                            ON-CHAIN
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: t.mid }}>
                        {step.body}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="rounded-xl p-6" style={{ ...glassCard, backgroundColor: t.payloadBg }}>
                  <div
                    className="font-mono text-xs tracking-widest uppercase mb-4"
                    style={{ color: "#14F195" }}
                  >
                    Lifecycle figure
                  </div>
                  <div
                    className="font-mono text-xs leading-relaxed overflow-x-auto"
                    style={{ color: t.payloadText, whiteSpace: "pre" }}
                  >
                    {`Agent ──MCP/REST──▶ Quote API ──▶ Payment request
  │                                    │
  │  USDC + memo on Solana             │
  └────────────────────────────────────┤
                                       ▼
                              QuickNode Streams
                                       │
                                       ▼
                              Fulfillment ──POST──▶ Advertek floor
                                       │
                                       ▼
                              OrderStatus webhooks ──▶ Agent
                                       │
                              (async, independent)
                                       ▼
                              Treasury worker ──OKX──▶ CAD`}
                  </div>
                </div>
              </section>

              {/* 05 Settlement */}
              <section id="settlement" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="05"
                  eyebrow="Settlement architecture"
                  title="USDC on Solana, rail-agnostic by design"
                  theme={t}
                />
                <Prose theme={t}>
                  The baseline settlement rail is raw USDC over Solana. A payment request carries
                  the pay-to address, the USDC amount in base units, and a memo of the form{" "}
                  <code className="font-mono text-sm">advertek:order:{"{orderId}"}:{"{nonce}"}</code>
                  . That memo is the correlation key: when QuickNode Streams confirms the transfer,
                  the webhook handler parses the order id back out and advances fulfillment.
                </Prose>
                <Prose theme={t}>
                  Confirmation is webhook-first. HMAC-SHA256 verification via a shared security
                  token rejects forged deliveries. Processed-delivery idempotency means retries are
                  safe. Polling remains available for local development, but production serverless
                  paths never hold a long-open confirmation loop.
                </Prose>
                <Prose theme={t}>
                  Payment protocols for agents are fragmenting — raw on-chain transfers,
                  marketplace-mediated escrow, emerging standards. Betting on a single rail is a
                  strategic risk. The architecture therefore treats settlement as a pluggable module
                  behind one order model: a <code className="font-mono text-sm">PaymentRail</code>{" "}
                  interface that creates payment instructions and resolves every confirmation to the
                  same internal order id and money amount. Fulfillment, status bridging, and the
                  agent-facing status vocabulary never see rail specifics.
                </Prose>
                <div className="rounded-xl overflow-hidden mb-6" style={glassCard}>
                  <div
                    className="px-5 py-3 font-mono text-xs tracking-widest uppercase"
                    style={{ borderBottom: `1px solid ${t.cardBorder}`, color: t.mid }}
                  >
                    Settlement rails
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${t.line}` }}>
                          {["Rail", "Protocol", "Asset", "Status"].map((h) => (
                            <th
                              key={h}
                              className="text-left font-mono text-xs tracking-widest uppercase px-5 py-3"
                              style={{ color: t.mid }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: `1px solid ${t.line}` }}>
                          <td className="px-5 py-3" style={{ color: t.text }}>
                            Solana USDC direct
                          </td>
                          <td className="px-5 py-3" style={{ color: t.mid }}>
                            SPL transfer + memo
                          </td>
                          <td className="px-5 py-3 font-mono text-xs grad-text">USDC</td>
                          <td className="px-5 py-3" style={{ color: t.mid }}>
                            Baseline — live
                          </td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3" style={{ color: t.text }}>
                            OKX AI marketplace
                          </td>
                          <td className="px-5 py-3" style={{ color: t.mid }}>
                            A2MCP instant / A2A escrow
                          </td>
                          <td className="px-5 py-3 font-mono text-xs" style={{ color: t.midStrong }}>
                            USDT / USDG
                          </td>
                          <td className="px-5 py-3" style={{ color: t.mid }}>
                            Phase 0 validation
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <Prose theme={t}>
                  Each rail keeps its native settlement asset. Treasury sweeps per-rail; OKX Convert
                  handles USDC, USDT, and USDG → CAD the same way. No conversion step sits in the
                  order path, and no single-asset compromise is forced. The OKX AI marketplace is a
                  distribution channel as much as a rail — active discovery, onchain reputation, and
                  staked-evaluator dispute resolution for marketplace-routed orders — validated with
                  one inert listing before any production wiring.
                </Prose>
              </section>

              {/* 06 Treasury */}
              <section id="treasury" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="06"
                  eyebrow="Treasury and fiat"
                  title="Sweep on a cadence, reconcile per order"
                  theme={t}
                />
                <Prose theme={t}>
                  Treasury runs independently of the order path. A dedicated always-on worker —
                  never a Vercel function — reads memo-matched inbound USDC since the last sweep,
                  deposits it to OKX, converts USDC → CAD via the Convert API, records a sweep
                  record, and allocates the resulting fiat back to individual orders within a
                  configured tolerance (default 50 bps, with a one-cent floor).
                </Prose>
                <Prose theme={t}>
                  The security invariant is non-negotiable: the automated sweep uses only trading
                  credentials. Withdrawal credentials are a separate key set that never enters any
                  automated environment. Moving fiat out of OKX stays a deliberate, human-operated
                  action. The web app on Vercel holds only Supabase credentials and webhook
                  verification tokens — building a payment request requires no signing.
                </Prose>
                <div
                  className="h-0.5 w-full my-8 rounded-full"
                  style={{ background: SOLANA_GRAD, opacity: 0.7 }}
                  aria-hidden
                />
                <Prose theme={t}>
                  Money flow for the baseline rail:{" "}
                  <strong style={{ color: t.text, fontWeight: 500 }}>
                    priced in CAD → paid in USDC on Solana → swept to CAD via OKX
                  </strong>
                  . Additional rails plug into the same order lifecycle; their sweeps stay isolated
                  until volume justifies unifying ledgers.
                </Prose>
              </section>

              {/* 07 Invariants */}
              <section id="invariants" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="07"
                  eyebrow="Engineering invariants"
                  title="Conventions that keep money correct"
                  theme={t}
                />
                <Prose theme={t}>
                  Print is physical and money is adversarial. The rail encodes a small set of
                  non-negotiable engineering rules so that neither side of that statement becomes a
                  production incident:
                </Prose>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invariants.map((inv) => (
                    <div key={inv.title} className="rounded-lg p-5" style={glassCard}>
                      <div className="font-mono text-sm mb-2" style={{ color: t.text }}>
                        {inv.title}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: t.mid }}>
                        {inv.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 08 Market */}
              <section id="market" className="scroll-mt-28 mb-20">
                <SectionHeading
                  n="08"
                  eyebrow="Market context"
                  title="Five wedges. One rail. Two motions."
                  theme={t}
                />
                <Prose theme={t}>
                  The rail is product-agnostic underneath and wedge-specific at the edge. Five
                  mass-market entry points share the same quoting, settlement, and fulfillment
                  backbone:
                </Prose>
                <div className="space-y-3 mb-10">
                  {wedges.map((w) => (
                    <div
                      key={w.name}
                      className="rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2"
                      style={glassCard}
                    >
                      <div>
                        <div className="font-mono text-sm" style={{ color: t.text }}>
                          {w.name}
                        </div>
                        <div className="text-sm italic mt-1" style={{ color: t.mid }}>
                          {w.note}
                        </div>
                      </div>
                      <div className="font-mono text-xs tracking-wide shrink-0" style={{ color: ACCENT }}>
                        {w.stat}
                      </div>
                    </div>
                  ))}
                </div>
                <Prose theme={t}>
                  Commercially, the system runs two motions on one manufacturing footprint:
                </Prose>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-lg p-6" style={glassCard}>
                    <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: t.mid }}>
                      Human-facing
                    </div>
                    <div className="font-display uppercase mb-3" style={{ fontWeight: 700, fontSize: "1.25rem" }}>
                      DTC storefront
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: t.mid }}>
                      Modernized e-commerce across all twelve product lines — self-serve ordering
                      and instant quoting. Existing B2B customers are a warm on-ramp to the platform
                      and near-term revenue while the agent surface matures.
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-6"
                    style={{
                      backgroundColor: t.panelDeep,
                      border: `1px solid ${t.cardBorder}`,
                      color: t.payloadText,
                    }}
                  >
                    <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: ACCENT }}>
                      Agent-facing — the moat
                    </div>
                    <div className="font-display uppercase mb-3" style={{ fontWeight: 700, fontSize: "1.25rem" }}>
                      Agent Rail
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: t.mid }}>
                      MCP and API for machine-orderable SKUs. Machine-payable checkout in USDC over
                      Solana. SLA-backed production where reprints are free and no support ticket is
                      required for a clean failure path.
                    </p>
                  </div>
                </div>
              </section>

              {/* 09 Roadmap */}
              <section id="roadmap" className="scroll-mt-28 mb-12">
                <SectionHeading
                  n="09"
                  eyebrow="Status and roadmap"
                  title="Pre-launch. Moving fast."
                  theme={t}
                />
                <Prose theme={t}>
                  The product name and stack are locked: Advertek Agent Rail, built with Cursor,
                  Solana, QuickNode, and OKX. Vendor integration is the active focus — direct
                  conversation with Advertek&apos;s API team on pricing, catalog, and sandbox access.
                  This quarter&apos;s milestones are a live prototype and the first design partners
                  from POD and real estate.
                </Prose>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    {
                      phase: "Now",
                      title: "Close the baseline",
                      body: "Real pricing and spot-rate clients against Advertek's API. Order persistence on Postgres. End-to-end quote → pay → fulfill on the Solana rail.",
                    },
                    {
                      phase: "Next",
                      title: "Rail seam + partners",
                      body: "Extract the PaymentRail interface from the Solana adapter. Ship the prototype. Onboard the first POD and real-estate design partners.",
                    },
                    {
                      phase: "Parallel",
                      title: "OKX AI Phase 0",
                      body: "One inert A2MCP marketplace listing. Observe order volume and settlement behavior before any production fulfillment wiring.",
                    },
                  ].map((card) => (
                    <div key={card.phase} className="rounded-lg p-5" style={glassCard}>
                      <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: ACCENT }}>
                        {card.phase}
                      </div>
                      <div className="font-mono text-sm mb-2" style={{ color: t.text }}>
                        {card.title}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: t.mid }}>
                        {card.body}
                      </p>
                    </div>
                  ))}
                </div>
                <Prose theme={t}>
                  Agentic commerce needs a physical-fulfillment layer. Advertek Agent Rail is that
                  layer — the interface on top of a manufacturing partner that already runs twelve
                  product lines, callable by any agent that can speak MCP or REST and settle USDC.
                </Prose>
              </section>

              <div className="pt-8" style={{ borderTop: `1px solid ${t.line}` }}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="font-mono text-xs tracking-widest uppercase" style={{ color: t.mid }}>
                    Advertek Agent Rail — Whitepaper
                  </p>
                  <div className="flex items-center gap-5 font-mono text-xs tracking-widest uppercase">
                    <a href="/#deck" style={{ color: ACCENT, textUnderlineOffset: "3px" }}>
                      View the deck
                    </a>
                    <a href="/#contact" style={{ color: t.mid, textUnderlineOffset: "3px" }}>
                      Request access
                    </a>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
