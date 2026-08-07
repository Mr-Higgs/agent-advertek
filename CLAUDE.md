# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. - changed to Mr-Higgs/agent-advertek


## What this is

An MCP server + REST API that lets AI agents order print production from Advertek
(offset, digital, wide-format, packaging, print-on-demand, direct-mail). Jobs are
priced in CAD, paid in USDC on Solana, and swept to fiat through OKX.

## Commands

pnpm workspace, Node >= 22, pnpm pinned to 10.13.1 via corepack.

```bash
corepack pnpm install     # node_modules is not checked in
corepack pnpm build       # recursive, topologically ordered
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
```

Build before typechecking or running anything cross-package: workspace deps
resolve to each other's `dist/`, not `src/`.

Single package / single test / app dev servers:

```bash
corepack pnpm --filter @advertek/treasury test
corepack pnpm --filter @advertek/treasury exec vitest run src/sweep.test.ts
corepack pnpm --filter @advertek/treasury exec vitest run -t "partial test name"
corepack pnpm --filter @advertek/web dev        # Next.js app (landing page + API + MCP)
node apps/treasury-worker/dist/main.js        # sweep worker (after build); add --once for a single sweep
cd agents/buyer-demo && uv sync && uv run ruff check . && uv run pytest -q   # Python demo buyer agent
```

MCP server over stdio (this is what `.cursor/mcp.json` launches):

```bash
corepack pnpm build && node packages/mcp-server/dist/stdio-main.js
```

Live checks are opt-in, hit real networks, and need real credentials in a root
`.env`. Run them only after `pnpm build`, and never as part of a normal check:

```bash
corepack pnpm --filter @advertek/payments live-check   # real Solana devnet USDC transfer
corepack pnpm --filter @advertek/treasury live-check   # real OKX Demo Trading converts
```

CI (`.github/workflows/ci.yml`) runs build → typecheck → lint → test on every push and PR.

## Architecture

A single order flows across packages like this:

1. **`@advertek/mcp-server`** exposes four agent tools — `get_catalog`,
   `get_quote` (full `SkuSpec`), `get_sku_quote` (raw print-on-demand SKU
   code), and `create_order` (order intake, injected via
   `AdvertekMcpServerDeps.executeCreateOrder`). The tool descriptions in `create-server.ts` are the agent's only
   documentation, so they are deliberately verbose and instruct agents never to
   invent prices or SKU codes.
2. **`@advertek/quote-api`** prices it: `createRealtimeQuote` (spec →
   `AdvertekPricingClient` → CAD cents) or `createSkuQuote` (SKU code →
   `POD_PRICE_LIST` MSRP), then `SpotRateClient` converts CAD → USDC base units.
   The `POST /quotes` HTTP boundary lives in `apps/web` (`app/api/quotes/route.ts`);
   the Fastify server was retired when the app consolidated onto Next.js.
3. **`@advertek/payments`** builds a USDC payment request that carries the
   internal order id in a Solana memo. Confirmation arrives either by polling
   (`waitForUsdcPaymentConfirmation`) or via a signature-verified QuickNode
   Streams webhook (`handleQuickNodeWebhook`), which parses the order id back out
   of the memo and calls an `OrderStatusUpdater`.
4. **`@advertek/fulfillment`** implements that updater
   (`createFulfillmentOrderStatusUpdater`): it looks up the order's details, maps
   our `productLine` to an Advertek product code, and POSTs the order to
   Advertek's API over HTTP Basic + HTTPS.
5. Status comes back by inbound Advertek webhook or `pollAdvertekOrderStatus`.
   `bridgeAdvertekStatusToOrderStatus` maps Advertek's vocabulary onto our
   agent-facing `OrderStatus`, and `dispatchAdvertekWebhookEvent` fans it out to
   subscribers.
6. **`@advertek/treasury`** sweeps independently of the order path: it reads
   memo-matched inbound USDC since the last sweep, deposits it to OKX, converts
   USDC → CAD, records a `SweepRecord`, and `reconcileSweeps` allocates the
   resulting fiat back to individual orders within a configured tolerance.

`@advertek/types` (Zod `skuSpecSchema`, `OrderStatus`, `Money`) plus
`@advertek/catalog` and `@advertek/webhooks` sit underneath everything.
`@advertek/site` is a standalone Vite/React/Tailwind landing page with no runtime
dependency on the rest of the workspace.

Build order: `types` → `catalog`/`webhooks`/`payments` →
`quote-api`/`fulfillment`/`treasury` → `db`/`mcp-server` → `apps/*`.

Hosted topology (see `docs/tech-stack.md`): `apps/web` is a Next.js app on
Vercel holding the landing page, `POST /api/quotes`, the remote MCP endpoint
(`app/api/mcp/route.ts` via `mcp-handler`, Streamable HTTP — shares
`registerAdvertekTools` with the stdio server), and the QuickNode/Advertek
webhook route handlers. `@advertek/db` implements the persistence seams on
Postgres (Supabase in deployment) via an injected `SqlExecutor` — unit tests
use recording fakes, never a database. `apps/treasury-worker` is the only
process holding money-moving secrets (settlement keypair + OKX trading
creds); the Vercel app is keyless. `agents/buyer-demo` is a Python
`deepagents` demo buyer (outside the pnpm workspace, `uv`-managed). The MCP
SDK is pinned to `1.26.0` exactly because `mcp-handler@1.x` requires that
peer version.

## Conventions

`.cursorrules` applies in full. Beyond it:

- **Money is always an integer `bigint` in minor units** — USDC base units (6
  decimals), CAD/USD cents. Never floats, never `number`. Decimal strings exist
  only at vendor API boundaries; convert with the helpers in
  `packages/treasury/src/money.ts` (`baseUnitsToDecimalString`,
  `decimalStringToMinorUnits`, `multiplyDecimalStrings`, `allocateProportionally`)
  or `formatUsdCentsAsDecimalString` in `packages/fulfillment/src/money.ts`. JSON
  responses stringify bigints.
- **Environment access goes through a package's `config.ts` only.** Each one
  parses env with a Zod schema and throws a descriptive error on invalid or
  missing values; no other module reads `process.env`. Loaders take `env` as a
  parameter so tests pass fixtures instead of mutating the process environment.
- **All I/O is an injected dependency.** Functions take a `Deps` object holding
  `fetch`-like clients, Solana RPC clients, `now()`, and id generators. Tests
  supply `vi.fn()` fakes — no unit test touches the network.
- **Zod validates every trust boundary**: env, MCP tool input, vendor
  request/response payloads, and webhook bodies.
- Tests are colocated as `src/*.test.ts` and excluded from the build tsconfig.
  Payment- and money-related functions get explicit unit tests before they count
  as done.
- TypeScript is `strict` plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`; ESLint runs `strictTypeChecked`. That is why the
  code uses `env["FOO"]` index access and `readonly` members throughout.
- OKX credentials are split into a trading set and a withdrawal set. The
  automated sweep must only ever use the trading credentials — moving fiat out of
  OKX stays a separate, deliberate action.

## Known stubs

`@blocker` comments mark deliberate gaps; grep for them before assuming a path
is wired up end to end. The two long-standing ones (`STEP_9` order intake,
`STEP_11` fabricated pricing) are closed. What remains conditional:

- **Pricing is deployment-gated, not stubbed.**
  `createHttpAdvertekPricingClient` / `createHttpSpotRateClient`
  (`packages/quote-api/src/http-clients.ts`) are the production clients;
  `apps/web/lib/quotes.ts` uses them when `ADVERTEK_PRICING_API_URL` /
  `SPOT_RATE_API_URL` are set and otherwise falls back to fixed inspection
  mocks, surfacing `demoPricing: true` so the landing page labels the figures.
  Their upstream response contracts are our expectation, not a vendor-verified
  spec. `packages/mcp-server/src/stdio-main.ts` stays fully mock-wired on
  purpose — it is the local tool-inspection entry.
- **Rate limiting is per serverless instance** (`apps/web/lib/rate-limit.ts`);
  a global limit needs a shared store such as Upstash.

## Agent-facing surface

- `POST /api/orders` and the `create_order` MCP tool are the order intake:
  they mint `ord_<uuid>` server-side, re-price every item, persist the
  fulfillment payload plus an optional `webhook_subscriptions` row, and return
  a keyless payment request (memo, settlement wallet, USDC amount). Agents
  never supply an order id or an amount.
- `GET /api/orders/[id]` returns the order and its `order_status_events`
  timeline.
- `/api/quotes`, `/api/orders`, and `/api/mcp` are behind API-key auth plus
  rate limiting (`apps/web/lib/api-guard.ts`); `/api/catalog` stays public.
  Auth turns on as soon as `ADVERTEK_API_KEYS` is set — these are
  request-authorization keys, never money-moving credentials.
