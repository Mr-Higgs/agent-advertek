# API Keys & Environment Setup — Agent Rail

Status: current
Related: `/.env.example`, `/packages/payments`, `/packages/treasury`, `/packages/fulfillment`, `/packages/db`

How to acquire every credential referenced in `.env.example`. Copy
`.env.example` to `.env` (repo root) and fill values in as you obtain them —
`.env` is gitignored; never commit it. For the Next.js app specifically,
`apps/web` also reads `.env.local`.

## 1. QuickNode (Solana RPC + webhooks)

### `QUICKNODE_RPC_URL`

1. Create an account at [quicknode.com](https://www.quicknode.com).
2. Dashboard → **Endpoints** → **Create Endpoint** → chain **Solana**.
3. Choose the network:
   - **Devnet** — for all testing (free test SOL via `solana airdrop`).
   - **Mainnet-beta** — production only; real USDC moves here.
4. Copy the endpoint's **HTTP Provider** URL
   (`https://<your-subdomain>.solana-devnet.quiknode.pro/<token>/`) into
   `QUICKNODE_RPC_URL`.

There is no `NETWORK=` flag in this repo — the RPC URL *is* the network
selector. The URL and `USDC_MINT_ADDRESS` must agree (devnet URL + devnet
mint, mainnet URL + mainnet mint).

### `QUICKNODE_WEBHOOK_SECURITY_TOKEN`

1. In the QuickNode dashboard, go to **Streams** → **Create Stream**.
2. Target: Solana, the settlement wallet's USDC token account; destination:
   your deployed `POST /api/webhooks/quicknode` URL.
3. In the Stream's **settings**, copy the **security token**. It is the HMAC
   secret `handleQuickNodeWebhook` uses to verify the `x-qn-signature` header
   on every delivery.

## 2. Solana settlement wallet

### `ADVERTEK_SETTLEMENT_WALLET` + `SETTLEMENT_WALLET_SECRET_KEY`

Generate a dedicated keypair (do not reuse a personal wallet):

```bash
solana-keygen new --outfile settlement-wallet.json   # prompts for passphrase
solana-keygen pubkey settlement-wallet.json          # -> ADVERTEK_SETTLEMENT_WALLET
```

- The **public key** goes in `ADVERTEK_SETTLEMENT_WALLET`.
- `settlement-wallet.json` contains a JSON byte array
  (`[12, 34, ...]`); paste that array verbatim into
  `SETTLEMENT_WALLET_SECRET_KEY`.
- Any Solana CLI-free wallet (Phantom, Solflare) works too — export the
  private key and convert to the byte-array form.

`SETTLEMENT_WALLET_SECRET_KEY` is needed **only** by `apps/treasury-worker`
for the on-chain deposit-to-OKX step. The Vercel app stays keyless — do not
set it there.

### `USDC_MINT_ADDRESS`

These are well-known constants, not per-account values:

| Network | USDC mint |
|---|---|
| Devnet | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Mainnet-beta | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

For devnet testing, get test USDC from Circle's faucet
([faucet.circle.com](https://faucet.circle.com)) and test SOL via
`solana airdrop 2 <settlement-wallet-pubkey> --url devnet`.

## 3. OKX (treasury off-ramp)

### Trading set: `OKX_API_KEY` / `OKX_API_SECRET` / `OKX_API_PASSPHRASE` / `OKX_API_DEMO`

Used by the automated sweep to check balances and Convert USDC → CAD.

1. Create an account at [okx.com](https://www.okx.com) and complete KYC.
2. For testing: **Trade → Demo Trading → Personal Center → Demo Trading API**
   → create an API key with **Trade** permission. Set `OKX_API_DEMO=true`
   (adds the `x-simulated-trading: 1` header the demo environment requires).
3. For production: **Profile → API → Create API key**, permissions
   **Read + Trade only** — do **not** enable Withdraw on this key. Leave
   `OKX_API_DEMO` unset.
4. Copy the key, secret, and the passphrase you chose at creation.

### Withdrawal set: `OKX_WITHDRAWAL_API_KEY` / `OKX_WITHDRAWAL_API_SECRET` / `OKX_WITHDRAWAL_API_PASSPHRASE`

1. Create a **second, distinct** API key in the OKX dashboard, scoped to
   **Withdraw** only.
2. Bind withdrawal addresses in the dashboard (OKX requires address
   whitelisting for API withdrawals).

The split is deliberate: the automated sweep only ever loads the trading set.
A compromised trading key can never move funds out of OKX; getting fiat out
stays a separate, deliberate action with the withdrawal credentials.

## 4. Advertek fulfillment API

### `ADVERTEK_API_USERNAME` / `ADVERTEK_API_PASSWORD` / `ADVERTEK_API_BASE_URL`

These are issued by Advertek, not self-service:

1. Contact Advertek and request API access for order submission (HTTP Basic
   over HTTPS).
2. Outside production, leave `ADVERTEK_API_BASE_URL` unset to use the
   built-in staging default. In production (`NODE_ENV=production`) set it
   explicitly — config loading fails fast if it's missing.
3. `http://` base URLs are accepted only for localhost mock-server testing.

### `ADVERTEK_WEBHOOK_USERNAME` / `ADVERTEK_WEBHOOK_PASSWORD`

These are **self-generated** — they authenticate Advertek's inbound webhook
deliveries to *us*, the opposite direction from `ADVERTEK_API_*`:

```bash
openssl rand -base64 24   # run twice: once for the username, once for the password
```

Share the pair with Advertek when registering your
`POST /api/webhooks/advertek` endpoint. Use a distinct pair from
`ADVERTEK_API_*`.

## 5. Postgres (Supabase)

### `DATABASE_URL`

1. Create a project at [supabase.com](https://supabase.com) (or use any
   Postgres ≥ 14 host).
2. Dashboard → **Project Settings → Database → Connection string** → use the
   **connection pooler** string (port 6543, pgbouncer), not the direct
   connection — serverless functions exhaust direct connections.
   `createPostgresExecutor` disables prepared statements automatically when
   the pooler is detected.
3. Format: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`

## Verification

Once `.env` is populated and the workspace is built
(`corepack pnpm build`), the opt-in live checks hit real networks:

```bash
corepack pnpm --filter @advertek/payments live-check   # real Solana devnet USDC transfer
corepack pnpm --filter @advertek/treasury live-check   # real OKX Demo Trading converts
```

Start both with demo/devnet credentials (`OKX_API_DEMO=true`, devnet RPC +
devnet USDC mint) before ever pointing anything at mainnet or production OKX
keys.
