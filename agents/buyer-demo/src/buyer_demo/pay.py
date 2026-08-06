"""Devnet USDC payment for an Advertek order.

Builds a single Solana transaction containing:

1. (optionally) ``createAssociatedTokenAccount`` for the settlement wallet's
   USDC ATA, if it does not exist yet;
2. ``transferChecked`` moving ``amount_base_units`` of USDC from the buyer's
   ATA to the settlement wallet's ATA;
3. a Solana Memo instruction ``advertek:order:{order_id}:{nonce}`` so the
   rail's payment watcher can match the transfer to an order.

Money is always an ``int`` of USDC base units (6 decimals). Floats are
rejected explicitly — never do token math with floats.

All network I/O is confined to ``send_usdc_payment``; the instruction /
transaction builders are pure functions so tests can exercise them with
fakes and no network access.
"""

from __future__ import annotations

import uuid

from solders.hash import Hash
from solders.instruction import Instruction
from solders.keypair import Keypair
from solders.message import Message
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from spl.token.constants import TOKEN_PROGRAM_ID
from spl.token.instructions import (
    create_associated_token_account,
    get_associated_token_address,
    transfer_checked,
)
from spl.token.models import TransferCheckedParams

# Solana Memo program v2.
MEMO_PROGRAM_ID = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

MEMO_PREFIX = "advertek:order"

# USDC has 6 decimals; amounts are always integers of base units.
USDC_DECIMALS = 6


def new_nonce() -> str:
    """Random per-payment nonce for the memo (collision protection)."""
    return uuid.uuid4().hex


def parse_base_units(raw: str) -> int:
    """Parse a USDC base-unit amount from a decimal string (e.g. from a quote).

    The rail returns USDC amounts as decimal strings of integer base units;
    this is the only accepted input format — no decimal points, no floats.
    """
    text = raw.strip()
    if not text.isdigit():
        raise ValueError(
            f"USDC amount must be a decimal string of integer base units, got {raw!r}"
        )
    amount = int(text)
    if amount <= 0:
        raise ValueError(f"USDC amount must be positive, got {amount}")
    return amount


def build_order_memo(order_id: str, nonce: str) -> str:
    """Format the payment memo the rail watches for: advertek:order:{id}:{nonce}."""
    for label, value in (("order_id", order_id), ("nonce", nonce)):
        if not value or ":" in value:
            raise ValueError(
                f"{label} must be non-empty and contain no ':', got {value!r}"
            )
    return f"{MEMO_PREFIX}:{order_id}:{nonce}"


def build_memo_instruction(memo: str) -> Instruction:
    """A (signer-less) Memo program instruction carrying the order reference."""
    return Instruction(MEMO_PROGRAM_ID, memo.encode("utf-8"), [])


def build_payment_instructions(
    *,
    payer_pubkey: Pubkey,
    usdc_mint: Pubkey,
    settlement_wallet: Pubkey,
    amount_base_units: int,
    order_id: str,
    nonce: str,
    create_settlement_ata: bool = False,
) -> list[Instruction]:
    """Build the [create ATA?] + transferChecked + memo instruction list."""
    if isinstance(amount_base_units, bool) or not isinstance(amount_base_units, int):
        raise TypeError(
            f"amount_base_units must be an int of USDC base units, "
            f"got {type(amount_base_units).__name__} (never use floats for money)"
        )
    if amount_base_units <= 0:
        raise ValueError(f"amount_base_units must be positive, got {amount_base_units}")

    payer_ata = get_associated_token_address(payer_pubkey, usdc_mint)
    settlement_ata = get_associated_token_address(settlement_wallet, usdc_mint)

    instructions: list[Instruction] = []
    if create_settlement_ata:
        instructions.append(
            create_associated_token_account(
                payer=payer_pubkey, owner=settlement_wallet, mint=usdc_mint
            )
        )
    instructions.append(
        transfer_checked(
            TransferCheckedParams(
                program_id=TOKEN_PROGRAM_ID,
                source=payer_ata,
                mint=usdc_mint,
                dest=settlement_ata,
                owner=payer_pubkey,
                amount=amount_base_units,
                decimals=USDC_DECIMALS,
            )
        )
    )
    instructions.append(build_memo_instruction(build_order_memo(order_id, nonce)))
    return instructions


def build_payment_transaction(
    *,
    payer: Keypair,
    usdc_mint: Pubkey,
    settlement_wallet: Pubkey,
    amount_base_units: int,
    order_id: str,
    nonce: str,
    recent_blockhash: Hash,
    create_settlement_ata: bool = False,
) -> Transaction:
    """Build and sign the full payment transaction (no network access)."""
    instructions = build_payment_instructions(
        payer_pubkey=payer.pubkey(),
        usdc_mint=usdc_mint,
        settlement_wallet=settlement_wallet,
        amount_base_units=amount_base_units,
        order_id=order_id,
        nonce=nonce,
        create_settlement_ata=create_settlement_ata,
    )
    message = Message.new_with_blockhash(instructions, payer.pubkey(), recent_blockhash)
    return Transaction([payer], message, recent_blockhash)


def send_usdc_payment(
    *,
    client,
    payer: Keypair,
    usdc_mint: Pubkey,
    settlement_wallet: Pubkey,
    amount_base_units: int,
    order_id: str,
    nonce: str,
) -> str:
    """Send the payment on-chain; returns the transaction signature as a string.

    ``client`` is a ``solana.rpc.api.Client``-compatible object (injected so
    tests can fake it). This is the only function in the module that touches
    the network.
    """
    settlement_ata = get_associated_token_address(settlement_wallet, usdc_mint)
    create_ata = client.get_account_info(settlement_ata).value is None
    recent_blockhash = client.get_latest_blockhash().value.blockhash
    tx = build_payment_transaction(
        payer=payer,
        usdc_mint=usdc_mint,
        settlement_wallet=settlement_wallet,
        amount_base_units=amount_base_units,
        order_id=order_id,
        nonce=nonce,
        recent_blockhash=recent_blockhash,
        create_settlement_ata=create_ata,
    )
    response = client.send_transaction(tx)
    return str(response.value)
