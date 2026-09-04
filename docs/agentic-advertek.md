# Agentic POD storefront demo at /demo — "Fine Art America, but an agent"

## Context

We're building a client-facing working demo: upload an image into the `/demo` chat → the agent **sees** it, describes it, and suggests print-on-demand products from the real 49-SKU catalog → live CSS mockup of the artwork on the chosen product → MSRP quote → real order in Supabase → payment-request card with a demo-labeled "Simulate payment" → a live pizza-tracker that advances `paid → downloaded → printing → printed → shipped → completed`. Agent thinking and tool calls stay visible throughout ("show the agentic magic"). Ease target: ordering pizza.

Decisions confirmed with the user: CSS/SVG mockups (no image pipeline), chat stays at `/demo`, Supabase + demo status simulator, payment shown but simulated. Hard rule from `docs/advertek-devin-build-specV1.md`: simulated payment/production must always be labeled Demo — never presented as real.

Key facts verified in-code:
- ai@7.0.85 / @ai-sdk/react@4.0.88 v5-style parts API; `sendMessage({ text, files })` + `FileUIPart` supported; `convertToModelMessages` turns file parts into image blocks Anthropic fetches by URL; `sendReasoning` already defaults to `true`.
- On `claude-sonnet-5`, `thinking: {type:"enabled", budgetTokens}` is **removed (400)** — only `{type:"adaptive", display:"summarized"}` works; without `display:"summarized"` thinking blocks stream empty.
- Today the model never sees uploads (plain-text `Artwork: <url>` line), reasoning/file parts are dropped by `message-parts.tsx`, no mockup capability or product imagery exists, no status simulation exists, and demo-mode order intake re-prices every item at a flat mock CAD $125 (vs the real $12.90 MSRP `get_sku_quote` shows).
- DB schema exists (`packages/db/migrations/0001_init.sql`, 6 tables) — just needs applying to Supabase.

## Phase 0 — Setup (no code)

1. Apply migration: `psql "$DATABASE_URL" -f packages/db/migrations/0001_init.sql` (use session pooler :5432 or direct connection for DDL; runtime keeps the :6543 transaction-pooler URL — `packages/db/src/client.ts` already sets `prepare: false`). Verify the 6 tables.
2. **Env gotcha**: only a repo-root `.env.local` exists; Next.js reads `apps/web/.env*`. Run `vercel env pull apps/web/.env.local` (also fetches the missing `BLOB_READ_WRITE_TOKEN` — without it `/api/artwork` 503s).
3. Set locally + on Vercel: `DEMO_SIMULATOR=true`, `CHAT_MAX_STEPS=16` (loader already supports it). Vercel also needs `DATABASE_URL` (:6543), `USDC_MINT_ADDRESS`, `ADVERTEK_SETTLEMENT_WALLET` (create_order hard-fails without them). **Never** put `SETTLEMENT_WALLET_SECRET_KEY` / `OKX_*` on Vercel.
4. Local dev: `corepack pnpm --filter @advertek/web dev` → port 3001 (3000 taken).

## Phase 1 — Pricing coherence: POD orders price at MSRP

`apps/web/lib/quotes.ts`: new `withPodSkuPricing({ inner, spotRateClient, now? }): QuoteExecutor` wrapper around `createRealtimeQuote`'s executor. If input parses as a `skuSpecSchema` spec with `productLine === "printOnDemand"` and `getPodPriceListEntry(spec.stock.material)` hits → price `msrpCadCents * BigInt(quantity)`, convert via `convertCadCentsToUsdcBaseUnits` (`@advertek/quote-api`), return the `RealtimeQuote` shape (same math as `createSkuQuote`). Otherwise delegate to `inner`. Wire into `createQuoteExecutors()` so chat, REST, MCP, **and order intake** all agree with `get_sku_quote` by construction. Apply unconditionally — MSRP is real checked-in data.

New `apps/web/lib/quotes.test.ts` (money change ⇒ explicit tests): MSRP math (MUG-11-WHT 1290n × qty), USDC parity with `createSkuQuote` under the same fake spot client, unknown-SKU/non-POD/invalid-spec fall-through.

## Phase 2 — Vision: the agent sees the artwork

`apps/web/components/chat/demo-chat.tsx`:
- `Attachment` gains `mediaType` (from `file.type` in `attachFiles`).
- `send()`: keep the `Artwork: <url>` text lines (order intake + prompt depend on them) **and** add `files:` FileUIParts for png/jpeg/webp attachments (`{ type:"file", mediaType, url, filename }`). TIFF/SVG/PDF stay text-only (Anthropic can't view them).
- Attachment chips get a ~32px thumbnail for image types.

`apps/web/components/chat/message-parts.tsx`: render `part.type === "file"` — `<img>` (max-h-40, `t.line` border) for images, filename chip otherwise.

## Phase 3 — Visible thinking + tool inputs

`apps/web/app/api/chat/route.ts`:
- `providerOptions: { anthropic: { thinking: { type: "adaptive", display: "summarized" } } }` (adaptive is the only option on sonnet-5; summarized display is required or text is empty; adaptive auto-enables interleaved thinking around tool calls).
- `toUIMessageStream({ stream: result.stream, sendReasoning: true })` (explicit, though default).
- `maxDuration = 120` (thinking + multi-tool turns can graze 60s; fine on Fluid compute).

`apps/web/components/chat/message-parts.tsx`:
- Render `reasoning` parts (skip empty): mono "Thinking" eyebrow + quiet `t.mid` streamed text behind a left hairline. No collapse widget — the demo wants it seen.
- `ToolPart` gains `input`; while pending, show a mono detail line under the label: `get_sku_quote {"sku":"MUG-11-WHT"}` (truncate ~160 chars). `PENDING_LABELS` remain the human layer.

## Phase 4 — `render_mockup` tool + MockupCard

`apps/web/lib/chat-tools.ts`: new chat-only tool `render_mockup` (like `get_order_status`, not in the MCP package). Input `{ sku, artworkUrl: url }`; validates via `getPodPriceListEntry`; returns `{ ok, sku, name, category, artworkUrl, orientation }` with orientation parsed from SKU/name (`-V`/`-H` suffixes, "vertical"/"horizontal" in name, else square). Description tells the model to call it as soon as a SKU is picked, before quoting.

New `apps/web/components/chat/mockup-card.tsx` — `MockupCard` inside `Ticket` (export `Ticket`/`Row` from `tool-cards.tsx` — currently module-private). Aspect from orientation; `object-fit: cover`. **4 real frames + 1 generic**:
- canvas-gallery-wrap: front image + skewed darkened wrap-edge strips + wall shadow
- canvas-framed / framed-prints: ink frame + white mat + image
- mugs: CSS mug body with print band + handle ring
- t-shirts: inline SVG tee silhouette with `<clipPath>` + `<image ... slice>` at the chest
- default (blankets, towels, puzzles, cards, books, calendars): bordered flat face + caption; puzzles add a repeating-gradient grid overlay
- Footer on every mockup: "Demo mockup — CSS preview, not a production proof".

`message-parts.tsx`: pending label "Preparing the preview" + switch case → `MockupCard`.

## Phase 5 — Simulated payment + live pizza tracker

Serverless has no timers → lazy advancement on read.

New `apps/web/lib/demo-sim.ts` (pure + zod env loader per conventions): `isDemoSimulatorEnabled()` (`DEMO_SIMULATOR`), `DEMO_PAYMENT_SIGNATURE = "DEMO-SIMULATED-PAYMENT"`, `DEMO_STATUS_SEQUENCE = [paid, downloaded, printing, printed, shipped, completed]`, `DEMO_STAGE_INTERVAL_MS = 25_000`, and pure `dueStages(events, now)` → stages owed since the paid event (capped at completed; `[]` if unpaid or held/cancelled/failed). Timeline: paid t=0 → completed at ~2:05.

New routes (both 404 when simulator disabled, per-IP rate-limited on their own keys, zod-validated):
- `POST /api/demo/orders/[id]/pay` — marks `paid` via `updateOrderStatus` with the overtly fake signature; body carries `amountBaseUnits` from the card (quoted amount isn't persisted pre-payment; acceptable only because the signature is unmistakably fake — commented). Idempotent when already past pending-payment.
- `GET /api/demo/orders/[id]` — reads timeline, writes any `dueStages` via `recordStatusEvent`, returns `{ ok, demo: true, orderId, status, events, terminal }`.

New `apps/web/components/chat/order-tracker-card.tsx` — `OrderTrackerCard`: 7-step rail (done = solid ink dots, current = `.pulse-dot`, future = hollow), event rows below (dedupe consecutive duplicates), held/cancelled/failed as a single status line. Polls the demo GET every 5s while non-terminal; stops on terminal/unmount/non-ok (degrades to static when simulator off). Footer: "Demo simulation — production statuses are simulated".

`tool-cards.tsx`: `OrderStatusCard` becomes a thin adapter around `OrderTrackerCard` (**the card self-polls; the model calls `get_order_status` once and never polls**). `PaymentRequestCard` gains a secondary "Simulate payment (demo)" button → POST pay → renders the tracker inline beneath; caption "Demo only — no funds move".

New `apps/web/lib/demo-sim.test.ts`: dueStages edge cases (unpaid, just-paid, +25s, +130s cap, partial advancement, held short-circuit, occurredAt arithmetic) + env flag parsing.

## Phase 6 — System prompt rewrite

`apps/web/app/api/chat/route.ts`: keep all existing guardrails verbatim (never invent prices/SKUs/ids; money formatting; demoPricing labeling; plain prose). New concierge flow:
1. Image arrives → describe it (subject, palette, orientation) in 1–2 sentences, recommend 2–4 orientation-aware products (vertical art → `TEE-CN-V-*`, `PUZ-*-V`, portrait canvas; horizontal → `-H`, landscape). Unviewable file (PDF/TIFF/SVG) → say so, ask for a one-line description.
2. Product picked → `render_mockup(sku, artworkUrl)` then `get_sku_quote`.
3. Pizza-easy: ask only product, size/variant, quantity (default 1), ship-to name + address. Self-supply everything else (existing defaults + `soldTo = shipTo`, `assets[0].url` = artwork URL, and `payerPublicKey = DEMO_PAYER_PUBLIC_KEY` — new constant `"11111111111111111111111111111111"`, the System Program address: passes the base58 schema, unmistakably not a real wallet, demo-only; the wallet question disappears).
4. Explicit yes on mockup + total before `create_order`. After: present payment request, mention the "Simulate payment (demo)" button — no real funds move. On "where's my order" call `get_order_status` **once**; the tracker follows it live by itself.

## Verification

- `corepack pnpm --filter @advertek/web test` (new quotes.test.ts, demo-sim.test.ts), then root `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.
- Manual E2E at localhost:3001/demo: upload portrait JPEG → thinking streams + description + V-oriented suggestions → pick a product → pending line shows the tool input → MockupCard → MSRP quote card → name/address → PaymentRequestCard **amount matches the SKU quote** (Phase 1 fix — a mug must cost ~$12.90, not $125) → Simulate payment → tracker advances one stage per ~25s to completed (~2min), polling stops → reload restores transcript incl. thumbnails → psql shows 6 `order_status_events` + the `DEMO-SIMULATED-PAYMENT` signature.

## Risks (accepted for a demo)

- Blob must stay `access: "public"` — Anthropic fetches image URLs server-side; >5MB/8000px images may fail its fetch (prompt fallback covers it).
- Poll race can double-insert a status event (no unique constraint) — tracker dedupes on render.
- Rate limiter counts tracker polls: 12/min on a dedicated key under the 60/min default — fine.
- Model retry could duplicate `create_order` — pre-existing; the explicit-confirm step mitigates.
- CLAUDE.md's "homepage chat" description is stale (chat is at `/demo`) — worth a one-line doc fix while in there.
