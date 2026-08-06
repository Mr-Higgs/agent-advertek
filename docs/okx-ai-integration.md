# OKX AI Integration — Agent Rail

Status: incorporated into `docs/PRD.md` v0.2 (rail-agnostic settlement model); Phase 0 validation still pending
Owner: TBD
Related: `/packages/payments`, `/packages/treasury`, `/packages/mcp-server`

## Context

[OKX AI](https://www.okx.com/en-us/learn/okx-ai) is a marketplace where AI agents discover work, transact, and build onchain reputation — not just a payment rail. It's directly relevant to Agent Rail beyond the treasury on/off-ramp role OKX already plays in the execution playbook.

Two connected marketplaces:
- **Agent Marketplace** — list a service, get paid automatically when work completes.
- **Task Marketplace** — agents post work, find a provider, pay on delivery.

Both operate under one onchain identity via the **OKX Agentic Wallet**, with two payment modes:
- **A2A (escrow)** — for complex, multi-step, negotiated work.
- **A2MCP (instant pay-per-call)** — for standardized, single-call services.

Reputation accrues on one identity across both modes. Disputes resolve through a staked evaluator network, not a central platform. Builders are paid in **USDT or USDG**. The toolkit is **Onchain OS**, MCP-native, and works with Claude Code, Codex, and other MCP clients. Supports EVM chains and Solana.

## Why this matters for Agent Rail

| Agent Rail concept | OKX AI equivalent |
|---|---|
| Standardized SKU order (banner, mug run, POD book) | **A2MCP** — instant pay-per-call |
| Custom/negotiated job (large packaging run, bespoke finishing) | **A2A** — escrow |
| MCP directory listing (GTM plan) | **Agent Marketplace** listing — active discovery, not a passive directory |
| Published uptime/defect rate (trust argument) | Onchain reputation, accrued automatically |
| Reprint guarantee arbitration | Staked evaluator dispute resolution (marketplace-routed orders only) |

This doesn't replace the direct Agent Rail integration (agents calling our MCP server directly). It's a second, higher-trust distribution channel on top of it.

## Settlement asset: RESOLVED (by the rail model)

The execution playbook specifies **USDC over Solana** as the settlement asset. OKX AI pays out in **USDT or USDG**. This was a real conflict — it is now resolved architecturally rather than by picking one asset:

**Each rail settles in its native asset; treasury sweeps per-rail.** OKX AI orders keep USDT/USDG, the direct Solana rail keeps USDC, and OKX Convert handles every one of USDC/USDT/USDG → CAD. No conversion step in the order path, no single-asset compromise.

Consequences, per PRD §6.5/§6.7:
- `/packages/payments` becomes a rail-agnostic seam: the existing Solana USDC flow is the baseline adapter; OKX AI is a future rail behind the same `PaymentRail` interface.
- `/packages/treasury` keeps per-rail sweep ledgers and reconciliation, isolated until volumes justify unifying.
- Solana remains the baseline chain.

This supersedes options 1–3 from the original framing: we get option 1's multi-asset support without paying its complexity up front, because rails isolate the differences.

## Recommended next step (not a rebuild)

Don't restructure the payments layer around this yet. Validate it cheaply first:

1. Install Onchain OS: `npx skills add okx/onchainos-skills`
2. Stand up an OKX Agentic Wallet (email-based setup, per OKX AI docs)
3. List **one** standardized SKU (e.g. a fixed-spec wide-format banner) on the Agent Marketplace as an A2MCP service
4. Observe real agent-initiated order volume and settlement behavior before deciding how much of the custom Solana/QuickNode payments layer gets replaced vs. kept as the direct-integration path

## Cursor prompt — Phase 0 test listing

```
Add a new /packages/okx-ai module, kept fully isolated from
/packages/payments and /packages/treasury — this is a Phase 0 test
integration, not a replacement for the existing Solana settlement
path.

1. Install and configure Onchain OS (okx/onchainos-skills) per OKX's
   developer docs at web3.okx.com/onchainos. Do not hardcode any
   wallet credentials — load from env vars via the existing config
   module (OKX_AGENTIC_WALLET_* as needed).

2. Build a single A2MCP-mode service listing for one fixed-spec
   product — e.g. a 24x36in 13oz matte vinyl banner, quantity fixed
   or in a small fixed set (1/5/10). Reuse the existing quote logic
   from /packages/quote-api rather than duplicating pricing.

3. Log every incoming OKX AI order (payload, settlement asset,
   amount, timestamp) to a dedicated table/log separate from the
   main order-fulfillment records, so Phase 0 volume can be analyzed
   without touching production order data.

4. Do NOT wire this into /packages/fulfillment (the Advertek order
   API) yet — stub the fulfillment call and log what would have been
   submitted. We want to observe order volume and payment behavior
   before any real print job gets triggered from this path.

5. Flag clearly in code comments and in a README in this package that
   the settlement asset here is USDT/USDG, not USDC — do not let this
   quietly merge into the same wallet/reconciliation logic used for
   the direct Solana/USDC path in /packages/payments.
```

**Check:** confirm the Phase 0 listing is fully inert with respect to real order fulfillment before it goes live — nothing in this package should be able to trigger an actual print job.
