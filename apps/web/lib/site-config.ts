import type { Metadata } from "next";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.advertek.io";
export const siteName = "Advertek";

export const routes = {
  home: "/",
  platform: "/platform",
  developers: "/developers",
  demo: "/demo",
  useCases: "/use-cases",
  production: "/production",
  access: "/access",
  whitepaper: "/whitepaper",
  privacy: "/privacy",
  terms: "/terms",
  advertekPrinting: "https://advertekprinting.com",
  whitepaperPdf: "/Advertek_Agent_Rail_Whitepaper.pdf",
} as const;

export type RouteKey = keyof typeof routes;

export const mainNav = [
  { label: "Platform", href: routes.platform },
  { label: "Developers", href: routes.developers },
  { label: "Use Cases", href: routes.useCases },
  { label: "Production", href: routes.production },
  { label: "Whitepaper", href: routes.whitepaper },
] as const;

export const footerGroups = [
  {
    title: "Platform",
    links: [
      { label: "Platform", href: routes.platform },
      { label: "Developers", href: routes.developers },
      { label: "Demo", href: routes.demo },
      { label: "Whitepaper", href: routes.whitepaper },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Agencies", href: `${routes.useCases}#agencies` },
      { label: "AI Platforms", href: `${routes.useCases}#ai-platforms` },
      { label: "Multi-location", href: `${routes.useCases}#multi-location` },
      { label: "Direct Mail", href: `${routes.useCases}#direct-mail` },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Production", href: routes.production },
      { label: "Advertek Printing", href: routes.advertekPrinting, external: true },
      { label: "Request Access", href: routes.access },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: routes.privacy },
      { label: "Terms", href: routes.terms },
    ],
  },
] as const;

export type Status = "live" | "pilot" | "planned" | "demo";

export const statusInfo: Record<
  Status,
  { label: string; tone: "positive" | "caution" | "neutral" | "information"; description: string }
> = {
  live: {
    label: "LIVE",
    tone: "positive",
    description: "Verified in production with a successful end-to-end test.",
  },
  pilot: {
    label: "PILOT",
    tone: "information",
    description: "Limited access with controlled users and manual oversight.",
  },
  planned: {
    label: "PLANNED",
    tone: "neutral",
    description: "Roadmap item with no public production availability yet.",
  },
  demo: {
    label: "DEMO",
    tone: "caution",
    description: "Mocked or simulated data with no financial or production effect.",
  },
};

export interface FeatureStatus {
  readonly id: string;
  readonly name: string;
  readonly status: Status;
  readonly description: string;
}

export const featureStatuses: readonly FeatureStatus[] = [
  {
    id: "catalog",
    name: "Catalog endpoint",
    status: "pilot",
    description: "Public catalog returns configured product lines and the POD price list.",
  },
  {
    id: "quote",
    name: "Quote endpoint",
    status: "pilot",
    description: "Real-time quote validates the spec and returns a priced response; production pricing config is deployment-gated.",
  },
  {
    id: "cad-pricing",
    name: "CAD pricing source",
    status: "demo",
    description: "Production CAD pricing client is used only when ADVERTEK_PRICING_API_URL is set; otherwise falls back to inspection mocks.",
  },
  {
    id: "spot-rate",
    name: "CAD-to-USDC spot-rate source",
    status: "demo",
    description: "Live spot-rate client is used only when SPOT_RATE_API_URL is set; otherwise returns a fixed inspection value.",
  },
  {
    id: "mcp",
    name: "MCP endpoint",
    status: "pilot",
    description: "MCP-over-HTTP endpoint is available behind API-key auth; underlying pricing follows deployment config.",
  },
  {
    id: "create-order",
    name: "create_order tool",
    status: "pilot",
    description: "Order intake validates, prices, persists, and mints a payable request; production submission is gated by config.",
  },
  {
    id: "payment-request",
    name: "Payment request generation",
    status: "pilot",
    description: "USDC settlement instructions are computed server-side; the wallet controls the transfer.",
  },
  {
    id: "solana-confirmation",
    name: "Solana transfer confirmation",
    status: "demo",
    description: "Confirmation polling and memo parsing are implemented; mainnet end-to-end verification is pending.",
  },
  {
    id: "quicknode-webhook",
    name: "QuickNode webhook verification",
    status: "planned",
    description: "Webhook handler is stubbed; signature verification and production stream are not yet verified.",
  },
  {
    id: "order-persistence",
    name: "Order persistence",
    status: "pilot",
    description: "Orders and status events are stored in the configured Postgres backend.",
  },
  {
    id: "advertek-api",
    name: "Advertek production API submission",
    status: "pilot",
    description: "Fulfillment order builder maps product lines and POSTs to the production API when credentials are configured.",
  },
  {
    id: "production-status",
    name: "Production status webhooks",
    status: "pilot",
    description: "Advertek status mapping and outbound webhooks are implemented; production event stream is pilot-gated.",
  },
  {
    id: "treasury-sweep",
    name: "Treasury sweep",
    status: "planned",
    description: "Sweep worker is available for deployment but not wired into the public web tier.",
  },
  {
    id: "okx-conversion",
    name: "OKX conversion and reconciliation",
    status: "planned",
    description: "OKX deposit, conversion, and fiat allocation logic is implemented in the treasury worker; not production-verified.",
  },
] as const;

export function getFeatureStatus(id: string): FeatureStatus | undefined {
  return featureStatuses.find((f) => f.id === id);
}

export interface Capability {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly availability: "API-ready" | "Assisted workflow" | "Planned";
  readonly productLine?: string;
}

export const productionCapabilities: readonly Capability[] = [
  {
    id: "commercial-print",
    label: "Commercial print",
    description: "Offset and digital sheet work for brand, event, and campaign materials.",
    availability: "Assisted workflow",
    productLine: "offset",
  },
  {
    id: "packaging",
    label: "Packaging",
    description: "Corrugated and folding carton packaging with die-line and structural review.",
    availability: "Assisted workflow",
    productLine: "packaging",
  },
  {
    id: "direct-mail",
    label: "Direct mail",
    description: "Variable-data mailers with postal optimization and list handling.",
    availability: "Assisted workflow",
    productLine: "directMail",
  },
  {
    id: "promotional-products",
    label: "Promotional products",
    description: "Dye-sublimation, apparel, and decorated merchandise through POD and wide-format workflows.",
    availability: "API-ready",
    productLine: "dyeSublimation",
  },
  {
    id: "wide-format",
    label: "Wide format",
    description: "Posters, banners, signage, and environmental graphics.",
    availability: "Assisted workflow",
    productLine: "wideFormat",
  },
  {
    id: "books-and-binding",
    label: "Books and binding",
    description: "Saddle-stitch, perfect-bind, spiral, and case-bound editions.",
    availability: "Assisted workflow",
    productLine: "bookManufacturing",
  },
  {
    id: "print-on-demand",
    label: "Print on demand",
    description: "On-demand SKU catalog with deterministic base-pricing.",
    availability: "API-ready",
    productLine: "printOnDemand",
  },
  {
    id: "finishing-embellishments",
    label: "Finishing and embellishments",
    description: "Foil, emboss, spot UV, die-cutting, and specialty coatings.",
    availability: "Assisted workflow",
    productLine: "embellishments",
  },
  {
    id: "wall-decor",
    label: "Wall décor",
    description: "Canvas, framed prints, and wall-mounted decor.",
    availability: "API-ready",
    productLine: "wallDecor",
  },
  {
    id: "photo-lab",
    label: "Photo lab",
    description: "Photo products and gallery-quality output.",
    availability: "API-ready",
    productLine: "digital",
  },
  {
    id: "fulfillment-kitting",
    label: "Fulfillment and kitting",
    description: "Pick, pack, kit, and ship tied to production orders.",
    availability: "Planned",
  },
] as const;

export interface UseCase {
  readonly id: string;
  readonly buyer: string;
  readonly trigger: string;
  readonly problem: string;
  readonly workflow: string;
  readonly approval: string;
  readonly result: string;
  readonly categories: readonly string[];
  readonly pilot: string;
  readonly cta: { label: string; href: string };
}

export const useCases: readonly UseCase[] = [
  {
    id: "agencies",
    buyer: "Agencies and creative operations",
    trigger: "A campaign needs print, packaging, event, retail, and promotional materials across multiple accounts.",
    problem: "Each client uses different specs, vendors, quote formats, and approval steps; production status is scattered.",
    workflow: "Campaign systems call Agent Rail with a structured spec; the rail returns a priced, producible order model and normalized status events.",
    approval: "Artwork, brand, and budget rules are checked before an order is paid and submitted.",
    result: "Fewer quote threads, repeatable specs, and one place to track every job.",
    categories: ["Commercial print", "Packaging", "Promotional products", "Direct mail", "Finishing and embellishments"],
    pilot: "Pilot available for multi-client workflows.",
    cta: { label: "Request access", href: routes.access },
  },
  {
    id: "ai-platforms",
    buyer: "AI agent and workflow platforms",
    trigger: "An agent or workflow needs to produce a physical artifact for a user or business process.",
    problem: "Agents have no structured, machine-readable way to specify, price, and submit commercial production.",
    workflow: "Agent Rail exposes MCP and REST tools that translate natural-language or structured intent into production-safe specs, quotes, and orders.",
    approval: "High-value, custom, or first-time orders route to a human review gate.",
    result: "Software can order and track physical output the same way it calls any other service.",
    categories: ["Commercial print", "Packaging", "Print on demand", "Direct mail"],
    pilot: "Pilot available for controlled agent integrations.",
    cta: { label: "View developer docs", href: routes.developers },
  },
  {
    id: "multi-location",
    buyer: "Multi-location brands and franchises",
    trigger: "A brand needs approved materials ordered and shipped to many locations while controlling budgets and products.",
    problem: "Local ordering is often manual, off-brand, and hard to reconcile.",
    workflow: "A platform calls Agent Rail per location with product rules, budget checks, and ship-to data; the rail validates and dispatches each job.",
    approval: "Managers review exceptions, new locations, and spend over thresholds.",
    result: "Controlled local ordering, consolidated reporting, and consistent output.",
    categories: ["Commercial print", "Wide format", "Promotional products", "Packaging", "Fulfillment and kitting"],
    pilot: "Pilot available for rollout-controlled locations.",
    cta: { label: "Request access", href: routes.access },
  },
  {
    id: "direct-mail",
    buyer: "Direct-mail and lifecycle marketers",
    trigger: "A customer event or segment triggers a personalized physical mail piece.",
    problem: "Variable data, compliance, lists, print, and postage are handled by separate vendors and spreadsheets.",
    workflow: "Agent Rail accepts variable data, validates the spec, builds the mail payload, and returns production and delivery status.",
    approval: "List and creative approvals happen before production release.",
    result: "Compliant, personalized campaigns with fewer handoffs.",
    categories: ["Direct mail", "Commercial print", "Finishing and embellishments"],
    pilot: "Pilot available for verified list workflows.",
    cta: { label: "Request access", href: routes.access },
  },
  {
    id: "commerce",
    buyer: "Commerce and procurement platforms",
    trigger: "A platform wants to offer complex physical production beyond standard merchandise catalogs.",
    problem: "Standardized POD APIs cover simple SKUs but not custom packaging, commercial print, or multi-product kits.",
    workflow: "Agent Rail extends the catalog with commercial categories, deterministic quoting, and order submission.",
    approval: "Custom engineering and artwork preflight are reviewed before production.",
    result: "Broader physical product catalog with consistent order flow.",
    categories: ["Packaging", "Commercial print", "Promotional products", "Fulfillment and kitting"],
    pilot: "Pilot available for selected categories.",
    cta: { label: "Request access", href: routes.access },
  },
] as const;

export const facilityFacts = [
  { label: "Founded", value: "1996" },
  { label: "Facility size", value: "77,000 sq. ft." },
  { label: "Location", value: "Toronto, Ontario" },
  { label: "Production categories", value: String(productionCapabilities.length) },
  { label: "Access", value: "MCP and REST" },
  { label: "Service geography", value: "North America" },
] as const;

export const homepage = {
  eyebrow: "ADVERTEK AGENT RAIL",
  headline: "Physical production for AI agents.",
  body: "Give AI agents and software platforms a machine-readable path from intent to quote to payment to production, fulfillment, and tracking.",
  workflow: "Spec. Quote. Pay. Produce. Fulfill. Track.",
  primaryCta: { label: "Connect Your Agent", href: routes.developers },
  secondaryCta: { label: "Run the Demo", href: routes.demo },
  proof: `Founded ${facilityFacts[0].value} · ${facilityFacts[1].value} ${facilityFacts[2].value} facility · ${facilityFacts[3].value} production categories · ${facilityFacts[4].value} · ${facilityFacts[5].value}`,
} as const;

export const demoPage = {
  eyebrow: "INTERACTIVE DEMO",
  headline: "Describe what you need produced.",
  body: "Explore how Agent Rail turns a natural-language request into a structured production specification. Demo outputs are non-binding until marked otherwise.",
  suggestedPrompts: [
    "Quote 5,000 direct-mail postcards with variable data.",
    "Specify a folding carton for a 50 ml cosmetic bottle.",
    "Create a repeat order for 40 retail locations.",
    "Price 500 A5 flyers on matte stock.",
  ] as const,
} as const;

export const platformPage = {
  eyebrow: "AGENT RAIL",
  headline: "The physical production layer for agentic commerce.",
  body: "Agent Rail gives software a structured path across specification, quoting, approval, settlement, production submission, status, and shipment.",
  primaryCta: { label: "Request Pilot Access", href: routes.access },
  secondaryCta: { label: "View Developer Docs", href: routes.developers },
} as const;

export const developersPage = {
  eyebrow: "DEVELOPER PLATFORM",
  headline: "Connect software to production.",
  body: "Explore Agent Rail through MCP and REST. Start with the catalog, validate a production specification, request a quote, and follow the supported order workflow.",
  primaryCta: { label: "Request Credentials", href: routes.access },
  secondaryCta: { label: "Open Demo", href: routes.demo },
} as const;

export const productionPage = {
  eyebrow: "PRODUCTION FLOOR",
  headline: "A real production floor behind every interface.",
  body: "Advertek Agent Rail begins with Advertek's Toronto manufacturing operation, bringing software access to established production capabilities, people, equipment, quality controls, and fulfillment workflows.",
} as const;

export const whitepaperMeta = {
  version: "0.2.0",
  updatedAt: "2026-09-02",
  author: "Advertek",
  contact: "rail@advertekprinting.com",
} as const;

export const accessPage = {
  eyebrow: "PILOT ACCESS",
  headline: "Build a production pilot with Advertek.",
  body: "Share your workflow, production needs, expected volume, and integration timeline. The team will assess fit and define a controlled pilot.",
  success: "Request received. The Advertek team will review your workflow and respond with fit, next steps, or follow-up questions.",
} as const;

export type PageMetaKey =
  | "home"
  | "platform"
  | "developers"
  | "demo"
  | "useCases"
  | "production"
  | "access"
  | "whitepaper"
  | "privacy"
  | "terms";

export const pageMeta: Record<
  PageMetaKey,
  { title: string; description: string; path: string; noIndex?: boolean }
> = {
  home: {
    title: "Advertek Agent Rail",
    description:
      "Give AI agents and software platforms a machine-readable path from intent to quote to payment to production, fulfillment, and tracking through MCP and REST.",
    path: routes.home,
  },
  platform: {
    title: "Agent Rail Platform | Advertek",
    description:
      "Agent Rail gives software a structured path from production specification through quote, approval, settlement, manufacturing submission, status, and shipment.",
    path: routes.platform,
  },
  developers: {
    title: "Advertek Developer Platform | MCP and REST Production APIs",
    description:
      "Explore Agent Rail through MCP and REST. Catalog, specification validation, quotes, orders, webhooks, and sandbox tooling for agent integrations.",
    path: routes.developers,
  },
  demo: {
    title: "Agent Rail Demo | Advertek",
    description:
      "Try the Agent Rail demo. Describe a production need and watch it become a structured, non-binding specification.",
    path: routes.demo,
    noIndex: false,
  },
  useCases: {
    title: "Use Cases | Advertek",
    description:
      "Production workflows for agencies, AI platforms, multi-location brands, direct mail, and commerce platforms.",
    path: routes.useCases,
  },
  production: {
    title: "Commercial Production Infrastructure | Advertek",
    description:
      "Advertek's Toronto production floor: 77,000 sq. ft. of commercial print, packaging, direct mail, and promotional production capability.",
    path: routes.production,
  },
  access: {
    title: "Request Access | Advertek Agent Rail",
    description:
      "Apply for Agent Rail pilot access. Share your workflow, volume, and integration needs for a controlled production pilot.",
    path: routes.access,
  },
  whitepaper: {
    title: "Advertek Agent Rail Whitepaper",
    description:
      "Technical whitepaper for Agent Rail: a machine-readable interface between software intent and physical production.",
    path: routes.whitepaper,
  },
  privacy: {
    title: "Privacy Policy | Advertek",
    description: "How Advertek collects, uses, stores, and protects personal data.",
    path: routes.privacy,
  },
  terms: {
    title: "Terms of Use | Advertek",
    description:
      "Terms covering demo use, non-binding quotes, uploaded files, acceptable use, and access requests for Advertek services.",
    path: routes.terms,
  },
};

export function createMetadata(key: PageMetaKey): Metadata {
  const { title, description, path, noIndex } = pageMeta[key];
  const url = `${siteUrl}${path}`;
  const image = `${siteUrl}/og-image.png`;
  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: siteName,
      type: "website",
      images: [{ url: image, width: 1200, height: 640, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

export const analyticsEvents = [
  "nav_cta_clicked",
  "hero_cta_clicked",
  "protocol_link_clicked",
  "demo_started",
  "demo_step_viewed",
  "demo_completed",
  "demo_prompt_submitted",
  "artwork_attached",
  "code_copied",
  "access_form_started",
  "access_form_failed",
  "enterprise_access_submitted",
  "developer_access_submitted",
  "x402_payment_result",
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];
