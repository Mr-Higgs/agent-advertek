# buyer-demo

A reference **buyer agent** that dogfoods the Advertek agent rail end-to-end
on **Solana devnet**. It connects to the remote Advertek MCP server
(Streamable HTTP), asks for the catalog and a quote, then settles the quote
in USDC with a single transaction containing a `transferChecked` to the
settlement wallet's associated token account plus a
`advertek:order:{order_id}:{nonce}` Memo instruction.

> ⚠️ **WARNING: this spends real devnet USDC against the live rail.**
> Every run that reaches `pay_order` submits an on-chain transaction to
> Solana devnet that moves USDC from your buyer wallet to Advertek's
> settlement wallet and triggers real payment-confirmation / fulfillment
> handling server-side. Devnet tokens have no monetary value, but the rail
> is live — don't point it at mainnet, and don't run it with a wallet you
> care about.

## How it works

1. `config.py` loads and validates env vars (fail fast, no secrets in code).
2. `agent.py` builds a [deepagents](https://github.com/langchain-ai/deepagents)
   `create_deep_agent` wired to the rail's MCP tools (`get_catalog`,
   `get_quote`, `get_sku_quote`) via `langchain-mcp-adapters`, plus one local
   tool `pay_order` implemented in `pay.py`.
3. The system prompt forces the agent to always call `get_catalog` first,
   never invent prices or SKU codes, and only pay after showing the quote.
4. `pay.py` signs one devnet transaction: optional settlement-ATA creation +
   SPL `transferChecked` (integer USDC base units, 6 decimals — never floats)
   + Memo (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`).

Order ids come from the rail: the agent calls the `create_order` MCP tool,
which mints the order id, prices the order, persists it, and returns the memo,
settlement wallet, and exact USDC amount. `pay_order` takes that `orderId`,
`memo`, and `amountBaseUnits` and pays the request verbatim — it rejects a
memo that does not belong to the given order id, and the demo no longer mints
a client-side uuid.

## Setup

Requires Python >= 3.11 and [uv](https://docs.astral.sh/uv/).

```bash
cd agents/buyer-demo
uv sync
cp .env.example .env
```

Fill in `.env`:

| Variable | What |
| --- | --- |
| `ADVERTEK_MCP_URL` | Remote MCP server URL, e.g. `http://localhost:3000/api/mcp` |
| `BUYER_WALLET_SECRET_KEY` | Buyer keypair as a JSON byte array (your `solana-keygen new` `id.json`) |
| `SOLANA_RPC_URL` | e.g. `https://api.devnet.solana.com` |
| `USDC_MINT_ADDRESS` | The devnet USDC mint the rail accepts |
| `ADVERTEK_SETTLEMENT_WALLET` | Advertek's settlement wallet |
| `BUYER_AGENT_MODEL` | (optional) `provider:model` for the agent loop; default `anthropic:claude-sonnet-4-5` |
| `ANTHROPIC_API_KEY` / provider key | Required by the chosen model |

### Fund the devnet wallet

```bash
# SOL for transaction fees
solana airdrop 2 <BUYER_WALLET_PUBKEY> --url devnet
```

You also need **devnet USDC** in the buyer wallet's associated token account
for `USDC_MINT_ADDRESS` — mint/obtain it from whatever faucet or mint
authority the rail operators provide for that devnet mint.

## Run

```bash
uv run python -m buyer_demo.agent "buy 5 white mugs"
# or, via the installed script:
uv run buyer-demo "buy 5 white mugs"
```

The agent will fetch the catalog, quote a real SKU, print the CAD + USDC
quote, then pay and report the order id, memo, and transaction signature.

## Develop / verify

```bash
uv run ruff check
uv run pytest
```

Unit tests in `tests/test_pay.py` cover the transaction-building logic
(memo format, ATA derivation accounts, integer amount math) with fakes —
no network access.
