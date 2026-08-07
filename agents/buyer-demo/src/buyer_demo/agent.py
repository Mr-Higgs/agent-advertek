"""Demo buyer agent for the Advertek agent rail.

Wires a deepagents ``create_deep_agent`` agent to the remote Advertek MCP
server (Streamable HTTP) via langchain-mcp-adapters, and adds one local
tool — ``pay_order`` — that settles a quote in USDC on Solana devnet.

The rail now issues order ids itself: the agent calls the ``create_order``
MCP tool, which returns the order id, the memo, the settlement wallet, and
the exact USDC amount to send. ``pay_order`` pays that request verbatim; the
demo no longer mints a client-side uuid.

CLI:
    uv run python -m buyer_demo.agent "buy 5 white mugs"
    uv run buyer-demo "buy 5 white mugs"
"""

from __future__ import annotations

import argparse
import asyncio

from deepagents import create_deep_agent
from langchain_core.tools import tool
from langchain_mcp_adapters.client import MultiServerMCPClient
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey

from buyer_demo.config import Config, load_config
from buyer_demo.pay import MEMO_PREFIX, parse_base_units, send_usdc_payment

SYSTEM_PROMPT = """\
You are a buyer agent purchasing print-on-demand products from Advertek
through their agent rail. You have MCP tools from the Advertek server:

- get_catalog: no arguments; returns product lines and the skuCatalog of
  print-on-demand SKUs, each with an MSRP in CAD cents.
- get_quote: prices a full SKU spec object.
- get_sku_quote: input {"sku": string, "quantity": number}; returns real
  MSRP CAD pricing plus the exact USDC amount in base units (6 decimals),
  as decimal strings.
- create_order: places the order and returns the rail-issued orderId, memo,
  settlementWallet, and amountBaseUnits to pay. The rail mints the order id
  and prices the order.

You also have a local tool `pay_order(amount_usdc_base_units, order_id, memo)`
that sends a USDC payment on Solana devnet to Advertek's settlement wallet.

Hard rules:
1. ALWAYS call get_catalog before quoting or buying anything, so you know
   the real product lines and SKU codes.
2. NEVER invent prices, SKU codes, or product specs. Only use SKUs and
   prices returned by get_catalog / get_quote / get_sku_quote.
3. NEVER pay before showing the user the quote. After getting a quote,
   present the CAD price and the USDC base-unit amount, then call
   create_order and pay its response with pay_order.
4. NEVER invent an order id or a memo, and never pay an amount you computed
   yourself: pass create_order's orderId, memo, and amountBaseUnits through
   to pay_order exactly as returned (decimal strings of integer base units
   — never a decimal number).
5. Money is integer base units. Never convert to floating point.
6. After paying, report the order id, payment memo, and transaction
   signature returned by pay_order.
"""


def make_pay_order_tool(cfg: Config):
    """Create the `pay_order` tool bound to the configured wallet and RPC.

    Pays a payment request issued by the rail's ``create_order`` tool; the
    order id and memo always come from the server.
    """
    payer = Keypair.from_bytes(cfg.buyer_wallet_secret_key)
    usdc_mint = Pubkey.from_string(cfg.usdc_mint_address)
    settlement_wallet = Pubkey.from_string(cfg.advertek_settlement_wallet)
    rpc = Client(cfg.solana_rpc_url)

    @tool
    def pay_order(amount_usdc_base_units: str, order_id: str, memo: str) -> str:
        """Pay an Advertek order in USDC on Solana devnet.

        Args:
            amount_usdc_base_units: `amountBaseUnits` exactly as returned by
                create_order, as a decimal string of integer base units
                (6 decimals). Never pass a decimal number like "12.5".
            order_id: `orderId` returned by create_order. Never invent one.
            memo: `memo` returned by create_order
                (`advertek:order:{order_id}:{nonce}`), passed through verbatim
                so the rail can match the transfer to the order.
        """
        amount = parse_base_units(amount_usdc_base_units)
        expected_prefix = f"{MEMO_PREFIX}:{order_id}:"
        if not memo.startswith(expected_prefix):
            raise ValueError(
                f"memo {memo!r} does not belong to order {order_id!r}; "
                "pass create_order's memo through unchanged"
            )
        nonce = memo[len(expected_prefix) :]
        signature = send_usdc_payment(
            client=rpc,
            payer=payer,
            usdc_mint=usdc_mint,
            settlement_wallet=settlement_wallet,
            amount_base_units=amount,
            order_id=order_id,
            nonce=nonce,
        )
        return (
            f"Payment sent on Solana devnet.\n"
            f"order_id: {order_id}\n"
            f"memo: advertek:order:{order_id}:{nonce}\n"
            f"amount_usdc_base_units: {amount}\n"
            f"signature: {signature}"
        )

    return pay_order


async def run(prompt: str) -> str:
    """Run one purchase flow and return the agent's final message."""
    cfg = load_config()

    mcp_client = MultiServerMCPClient(
        {
            "advertek": {
                "url": cfg.mcp_url,
                # Streamable HTTP transport ("http" is an accepted alias in
                # recent langchain-mcp-adapters versions).
                "transport": "streamable_http",
            }
        }
    )
    mcp_tools = await mcp_client.get_tools()

    agent = create_deep_agent(
        model=cfg.model,
        tools=[*mcp_tools, make_pay_order_tool(cfg)],
        system_prompt=SYSTEM_PROMPT,
    )

    result = await agent.ainvoke({"messages": [{"role": "user", "content": prompt}]})
    final = result["messages"][-1]
    content = final.content
    return content if isinstance(content, str) else str(content)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="buyer-demo",
        description="Run the Advertek demo buyer agent against Solana devnet.",
    )
    parser.add_argument(
        "prompt",
        help='Purchase request, e.g. "buy 5 white mugs"',
    )
    args = parser.parse_args(argv)
    print(asyncio.run(run(args.prompt)))


if __name__ == "__main__":
    main()
