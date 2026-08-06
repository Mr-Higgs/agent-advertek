# PRD — Advertek Agent Rail

Status: in development (execution playbook steps 1–11 in flight)
Version: 0.2 (incorporates rail-agnostic settlement direction + OKX AI)
Related: `CLAUDE.md`, `docs/okx-ai-integration.md`

## 1. Problem Statement

AI agents can research, plan, and generate content, but they cannot buy physical
print production. Ordering print today requires human procurement: emailing sales
reps, negotiating quotes, and paying by card or invoice. There is no
machine-native rail that lets an agent go from intent → price → payment →
production → status without a human in the loop.

Advertek (a print production house offering offset, digital, wide-format,
packaging, print-on-demand, and direct mail) wants to become the default print
vendor for autonomous agents — before agents develop purchasing habits that
lock in competitors.

Payment protocols for agents are fragmenting (raw on-chain transfers,
marketplace-mediated escrow, and emerging standards). Betting on a single rail
is a strategic risk: the architecture must be **settlement-rail agnostic**,
with each rail as a pluggable module behind one order model.

## 2. Vision / Main Idea

**Agentic printing rails**: an MCP server + REST API that exposes Advertek's
entire print production capability to AI agents as first-class tools. An agent
can discover the catalog, get a deterministic quote, pay in USDC on Solana, and
have the job automatically submitted to Advertek's production API — with status
flowing back to the agent. Accumulated USDC is swept to fiat (CAD) through OKX
independently of the order path.

Money flow (baseline rail): **priced in CAD → paid in USDC on Solana → swept
to CAD via OKX**. Additional rails (OKX AI marketplace payouts) plug into
the same order lifecycle — see §6.7 and §12.

**Baseline decision: Solana + OKX.** Solana USDC is the reference settlement
implementation and OKX is the reference off-ramp. All abstractions are designed
and validated against this baseline first; other rails are added as adapters,
not by forking the order path.

## 3. Users & Actors

- **Primary: AI agents** (Claude Code, Cursor, other MCP clients) acting on
  behalf of human users or autonomously. The MCP tool descriptions in
  `packages/mcp-server/src/create-server.ts` are their *only* documentation.
- **Secondary: human operators** running the settlement wallet, OKX sweep, and
  reconciliation.
- **Counterparties**: Advertek's production API (fulfillment), QuickNode
  (Solana RPC + Streams webhooks), OKX (crypto→fiat off-ramp).

## 4. Goals

- Agents can get accurate, non-fabricated prices for any printable spec.
- Payment is programmatic, verifiable on-chain, and tied to an internal order
  id (via Solana memo).
- A confirmed payment automatically triggers a real production order.
- Order status flows back to the agent through a normalized `OrderStatus`
  vocabulary.
- Treasury operations (sweep USDC → CAD, reconcile per-order) are automated
  but strictly separated from withdrawal authority.
- No unit test ever touches the network; all I/O is injected.

## 5. Non-Goals (current phase)

- Human-facing checkout UI (`@advertek/site` is a marketing landing page only,
  no runtime dependency on the workspace).
- Order persistence / database (explicit stub — see §10).
- Fiat withdrawal from OKX (deliberately manual, separate credential set).
- Building the OKX AI rail as production code now — it is designed against
  (the abstraction anticipates it) but implemented only after the baseline
  rail is proven end to end and Phase 0 validation completes.

## 6. Product Components

Monorepo: pnpm workspace, Node ≥ 22, TypeScript strict
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint
`strictTypeChecked`. Build order: `types` → `catalog`/`webhooks`/`payments` →
`quote-api`/`fulfillment`/`treasury` → `mcp-server`.

### 6.1 `@advertek/mcp-server` — Agent interface
- Three MCP tools: `get_catalog`, `get_quote` (full `SkuSpec`), `get_sku_quote`
  (raw print-on-demand SKU code).
- Runs over stdio (`packages/mcp-server/src/stdio-main.ts`); launched via
  `.cursor/mcp.json`.
- Tool descriptions are deliberately verbose and instruct agents **never to
  invent prices or SKU codes**.

### 6.2 `@advertek/quote-api` — Pricing
- `createRealtimeQuote`: spec → `AdvertekPricingClient` → CAD cents.
- `createSkuQuote`: POD SKU code → checked-in `POD_PRICE_LIST` MSRP.
- `SpotRateClient` converts CAD → USDC base units (6 decimals).
- Also serves Fastify `POST /quotes` for non-MCP consumers.

### 6.3 `@advertek/payments` — Solana settlement
- Builds a USDC payment request embedding the internal order id in a Solana
  memo.
- Confirmation via polling (`waitForUsdcPaymentConfirmation`) or a
  signature-verified QuickNode Streams webhook (`handleQuickNodeWebhook`,
  HMAC-SHA256 via `QUICKNODE_WEBHOOK_SECURITY_TOKEN`), which parses the order
  id from the memo and invokes an `OrderStatusUpdater`.
- RPC retry logic isolated in `rpc-retry.ts`.

### 6.4 `@advertek/fulfillment` — Advertek production integration
- Implements `createFulfillmentOrderStatusUpdater`: on payment confirmation,
  looks up order details, maps `productLine` → Advertek product code
  (`product-code-map.ts`), and POSTs the order over HTTP Basic + HTTPS.
- Status returns via inbound Advertek webhook (Basic-auth verified) or
  `pollAdvertekOrderStatus`; `bridgeAdvertekStatusToOrderStatus` normalizes
  Advertek vocabulary into agent-facing `OrderStatus`;
  `dispatchAdvertekWebhookEvent` fans out to subscribers.
- Config fails fast: credentials required for any non-local host; production
  requires explicit `ADVERTEK_API_BASE_URL`.

### 6.5 `@advertek/payments` as the rail seam (planned refactor)

The current payments package is Solana-specific end to end
(`UsdcPaymentRequest`, Solana memo correlation, QuickNode confirmation). To go
rail-agnostic, extract a rail-neutral core:

- **`PaymentRail` interface** (new): `createPaymentRequest(quote, orderId)` →
  rail-specific payment instructions; confirmation via polling or webhook;
  every confirmation resolves to the same internal `orderId` + `Money`.
- **Correlation**: the Solana memo (`advertek:order:{orderId}:{nonce}`) is one
  correlation mechanism. Each rail defines its own (e.g. an OKX AI marketplace
  order reference), but all resolve to the same order id format before
  touching fulfillment.
- **Asset/chain per rail**: the rail declares its settlement asset (USDC,
  USDT, USDG) and chain. `Money` stays `bigint` minor units; per-asset decimals
  live in rail config, never in shared code.
- **Order model unchanged**: fulfillment, status bridging, and the agent-facing
  `OrderStatus` vocabulary never see rail specifics.

Existing Solana code becomes `@advertek/payments` → the **baseline
`SolanaUsdcRail`** adapter implementing this interface.

### 6.6 `@advertek/treasury` — Fiat off-ramp
- Runs independently of the order path, on a schedule
  (`SWEEP_INTERVAL_MS`, default 6h; `SWEEP_MIN_USDC_BASE_UNITS` threshold).
- Reads memo-matched inbound USDC since last sweep → deposits to OKX →
  converts USDC → CAD via OKX Convert API → records a `SweepRecord`.
- `reconcileSweeps` allocates fiat back to individual orders within a
  configurable tolerance (`RECONCILIATION_TOLERANCE_BPS`, default 50 bps;
  1-cent floor).
- **Security invariant**: the sweep uses only trading credentials
  (`OKX_API_*`); withdrawal credentials (`OKX_WITHDRAWAL_API_*`) are a
  separate key set the automation never touches.

### 6.7 Planned rails (not yet built)

| Rail | Protocol | Asset | Fit | Status |
|---|---|---|---|---|
| **Solana USDC direct** | Raw SPL transfer + memo | USDC | Agents with wallets; full control | Baseline — exists |
| **OKX AI marketplace** | Agentic Wallet, A2MCP instant / A2A escrow | USDT / USDG | Higher-trust distribution channel, onchain reputation | Phase 0 validation |

**OKX AI rationale**: a distribution channel, not just a rail — Agent
Marketplace listing gives active discovery, onchain reputation accrues on one
identity across A2MCP/A2A modes, and disputes resolve through a staked
evaluator network. Per `docs/okx-ai-integration.md`, validate with one inert
Phase 0 listing before any restructure.

**Settlement-asset resolution**: the old "open decision" (USDC vs USDT/USDG)
is resolved by the rail model itself — **each rail keeps its native asset;
treasury sweeps per-rail**. OKX Convert handles USDT/USDG → CAD the same way
it handles USDC → CAD, so no conversion step is needed in the order path and
no single-asset compromise is forced. Per-rail sweep ledgers and
reconciliation stay isolated until volumes justify unifying.

### 6.8 Supporting packages
- `@advertek/types` — Zod schemas shared across trust boundaries:
  `skuSpecSchema` (11 product lines, 12 finishes, turnaround, dimensions,
  stock, required print-ready assets with optional sha256/md5 integrity),
  `OrderStatus`, `Money`.
- `@advertek/catalog` — checked-in POD price list; product-line mapping.
- `@advertek/webhooks` — shared webhook plumbing.
- `@advertek/site` — standalone Vite/React/Tailwind landing page.

## 7. Order Lifecycle (end-to-end flow)

1. Agent calls `get_catalog` / `get_quote` / `get_sku_quote` → receives CAD
   price + USDC amount.
2. Payments layer issues a USDC payment request with order id in the memo.
3. Agent (or its wallet) pays on Solana.
4. Payment confirmed (poll or rail webhook) → `OrderStatusUpdater`.
5. Fulfillment maps the spec and POSTs the job to Advertek's API.
6. Advertek status (webhook or poll) → normalized `OrderStatus` → subscribers.
7. Treasury sweep converts accumulated USDC to CAD on OKX; reconciliation
   allocates fiat to orders within tolerance.

## 8. Core Invariants & Conventions

- **Money is always `bigint` in minor units** (USDC base units, CAD/USD cents).
  Never floats. Decimal strings only at vendor boundaries; conversions via
  `packages/treasury/src/money.ts` helpers.
- **Env access only through each package's `config.ts`**, parsed by Zod,
  fail-fast on missing/invalid values.
- **All I/O is dependency-injected** (`Deps` objects with fetch-like clients,
  RPC clients, `now()`, id generators); tests use `vi.fn()` fakes.
- **Zod validates every trust boundary**: env, MCP tool input, vendor payloads,
  webhook bodies.
- Payment/money functions require explicit unit tests before "done".
- CI: build → typecheck → lint → test on every push/PR.

## 9. Success Metrics

- **Adoption**: agent-initiated quotes and paid orders via MCP.
- **Reliability**: quote→payment→fulfillment completion rate; published
  uptime/defect rate (also the trust argument for marketplace listings).
- **Financial**: sweep reconciliation within tolerance; zero orders where
  payment confirmation failed to trigger fulfillment.
- **Phase 0 (OKX AI)**: observed order volume and settlement behavior on a
  test listing before any restructuring.

## 10. Known Gaps / Stubs

Marked `@blocker` in code:

- **`STEP_11` — pricing is partially fabricated.** `AdvertekPricingClient`
  and `SpotRateClient` are interfaces whose only implementations are mocks in
  `stdio-main.ts`. `get_quote` prices are not real; `get_sku_quote` CAD prices
  are real (checked-in POD list) but the CAD→USDC rate is not.
- **`STEP_9` — no order persistence.** `OrderStatusUpdater`,
  `OrderDetailsLookup`, `WebhookSubscriptionLookup` are empty seams;
  `SweepLedger` is in-memory only.

## 11. Open Decisions

- **When to unify per-rail sweep ledgers** — only when multi-rail volume makes
  isolated reconciliation painful.
- **Additional rails beyond OKX AI** — the `PaymentRail` seam makes them cheap
  to add later; none are planned now.

## 12. Roadmap

1. **Now** — close the baseline stubs: real `AdvertekPricingClient` /
   `SpotRateClient` (STEP_11), order persistence (STEP_9).
2. **Next** — extract the `PaymentRail` interface from the existing Solana
   code (pure refactor, no behavior change); the Solana USDC flow becomes the
   reference adapter.
3. **Parallel, cheap** — OKX AI Phase 0: one inert A2MCP listing per
   `docs/okx-ai-integration.md` (no fulfillment wiring, separate logging,
   USDT/USDG kept out of the USDC wallet/reconciliation path).
4. **Later** — promote OKX AI from Phase 0 to a full rail if Phase 0 volume
   justifies it; evaluate further rails behind the same seam.

Resolved by the rail model (formerly open): the settlement-asset conflict —
each rail settles in its native asset, treasury sweeps per-rail, OKX Convert
handles all of USDC/USDT/USDG → CAD.
