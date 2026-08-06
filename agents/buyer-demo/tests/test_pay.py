"""Unit tests for buyer_demo.pay — no network, all I/O faked."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from solders.hash import Hash
from solders.instruction import Instruction
from solders.keypair import Keypair
from solders.pubkey import Pubkey

import buyer_demo.pay as pay

PAYER = Keypair.from_seed(bytes(range(32)))
SETTLEMENT_WALLET = Keypair.from_seed(bytes(range(32, 64))).pubkey()
USDC_MINT = Keypair.from_seed(bytes([7] * 32)).pubkey()

PAYER_ATA = Keypair.from_seed(bytes([11] * 32)).pubkey()
SETTLEMENT_ATA = Keypair.from_seed(bytes([22] * 32)).pubkey()

DUMMY_IX = Instruction(Pubkey.default(), b"dummy", [])


@pytest.fixture
def fake_ata(monkeypatch):
    """Fake get_associated_token_address, recording every call."""
    calls = []

    def fake(owner: Pubkey, mint: Pubkey) -> Pubkey:
        calls.append((owner, mint))
        return PAYER_ATA if owner == PAYER.pubkey() else SETTLEMENT_ATA

    monkeypatch.setattr(pay, "get_associated_token_address", fake)
    return calls


@pytest.fixture
def fake_transfer(monkeypatch):
    """Fake transfer_checked, capturing the params it was built with."""
    captured = {}

    def fake(params):
        captured["params"] = params
        return DUMMY_IX

    monkeypatch.setattr(pay, "transfer_checked", fake)
    return captured


# --- memo format ----------------------------------------------------------


def test_build_order_memo_format():
    assert pay.build_order_memo("ord-123", "abc456") == "advertek:order:ord-123:abc456"


@pytest.mark.parametrize(
    "order_id, nonce",
    [("has:colon", "abc"), ("ord", "has:colon"), ("", "abc"), ("ord", "")],
)
def test_build_order_memo_rejects_unparseable_parts(order_id, nonce):
    with pytest.raises(ValueError):
        pay.build_order_memo(order_id, nonce)


def test_build_memo_instruction_uses_memo_program():
    ix = pay.build_memo_instruction("advertek:order:o:n")
    assert ix.program_id == pay.MEMO_PROGRAM_ID
    assert bytes(ix.data) == b"advertek:order:o:n"
    assert ix.accounts == []


# --- ATA derivation + instruction assembly --------------------------------


def test_ata_derivation_called_with_right_accounts(fake_ata, fake_transfer):
    ixs = pay.build_payment_instructions(
        payer_pubkey=PAYER.pubkey(),
        usdc_mint=USDC_MINT,
        settlement_wallet=SETTLEMENT_WALLET,
        amount_base_units=5 * 10**6,
        order_id="ord-1",
        nonce="n-1",
    )
    # Payer ATA first, settlement ATA second, both against the USDC mint.
    assert fake_ata == [(PAYER.pubkey(), USDC_MINT), (SETTLEMENT_WALLET, USDC_MINT)]
    # [transferChecked, memo] when the settlement ATA already exists.
    assert len(ixs) == 2
    assert ixs[-1].program_id == pay.MEMO_PROGRAM_ID
    assert bytes(ixs[-1].data) == b"advertek:order:ord-1:n-1"


def test_transfer_checked_targets_derived_atas(fake_ata, fake_transfer):
    pay.build_payment_instructions(
        payer_pubkey=PAYER.pubkey(),
        usdc_mint=USDC_MINT,
        settlement_wallet=SETTLEMENT_WALLET,
        amount_base_units=1_234_567,
        order_id="ord-1",
        nonce="n-1",
    )
    params = fake_transfer["params"]
    assert params.source == PAYER_ATA
    assert params.dest == SETTLEMENT_ATA
    assert params.mint == USDC_MINT
    assert params.owner == PAYER.pubkey()
    assert params.decimals == pay.USDC_DECIMALS


def test_create_settlement_ata_prepends_create_instruction(
    fake_ata, fake_transfer, monkeypatch
):
    create_calls = []
    create_ix = Instruction(Pubkey.default(), b"create-ata", [])

    def fake_create_ata(payer, owner, mint):
        create_calls.append((payer, owner, mint))
        return create_ix

    monkeypatch.setattr(pay, "create_associated_token_account", fake_create_ata)
    ixs = pay.build_payment_instructions(
        payer_pubkey=PAYER.pubkey(),
        usdc_mint=USDC_MINT,
        settlement_wallet=SETTLEMENT_WALLET,
        amount_base_units=10**6,
        order_id="ord-1",
        nonce="n-1",
        create_settlement_ata=True,
    )
    assert create_calls == [(PAYER.pubkey(), SETTLEMENT_WALLET, USDC_MINT)]
    assert len(ixs) == 3
    assert ixs[0] is create_ix


# --- integer money math ---------------------------------------------------


def test_parse_base_units_accepts_integer_decimal_strings():
    assert pay.parse_base_units("15234000") == 15_234_000
    assert pay.parse_base_units(" 1 ") == 1


@pytest.mark.parametrize(
    "raw", ["1.5", "12.000000", "-1", "0", "abc", "", "1e6", "1,000"]
)
def test_parse_base_units_rejects_non_integer_or_non_positive(raw):
    with pytest.raises(ValueError):
        pay.parse_base_units(raw)


@pytest.mark.parametrize("bad", [1.5, 10**6 + 0.5, True])
def test_amount_rejects_floats_and_bools(bad):
    with pytest.raises(TypeError):
        pay.build_payment_instructions(
            payer_pubkey=PAYER.pubkey(),
            usdc_mint=USDC_MINT,
            settlement_wallet=SETTLEMENT_WALLET,
            amount_base_units=bad,
            order_id="ord-1",
            nonce="n-1",
        )


def test_amount_stays_exact_integer(fake_ata, fake_transfer):
    # 5 mugs x 6_500_000 base units each — no floating point anywhere.
    total = 5 * 6_500_000
    pay.build_payment_instructions(
        payer_pubkey=PAYER.pubkey(),
        usdc_mint=USDC_MINT,
        settlement_wallet=SETTLEMENT_WALLET,
        amount_base_units=total,
        order_id="ord-1",
        nonce="n-1",
    )
    amount = fake_transfer["params"].amount
    assert isinstance(amount, int) and amount == 32_500_000


def test_non_positive_amount_rejected(fake_ata, fake_transfer):
    with pytest.raises(ValueError):
        pay.build_payment_instructions(
            payer_pubkey=PAYER.pubkey(),
            usdc_mint=USDC_MINT,
            settlement_wallet=SETTLEMENT_WALLET,
            amount_base_units=0,
            order_id="ord-1",
            nonce="n-1",
        )


# --- send path with a fake RPC client --------------------------------------


def _fake_client(*, settlement_ata_exists: bool, sent: list):
    class FakeClient:
        def get_account_info(self, _pubkey):
            return SimpleNamespace(value=object() if settlement_ata_exists else None)

        def get_latest_blockhash(self):
            return SimpleNamespace(value=SimpleNamespace(blockhash=Hash.default()))

        def send_transaction(self, tx):
            sent.append(tx)
            return SimpleNamespace(value="sig-abc")

    return FakeClient()


def test_send_payment_existing_settlement_ata():
    sent: list = []
    client = _fake_client(settlement_ata_exists=True, sent=sent)
    sig = pay.send_usdc_payment(
        client=client,
        payer=PAYER,
        usdc_mint=USDC_MINT,
        settlement_wallet=SETTLEMENT_WALLET,
        amount_base_units=2_000_000,
        order_id="ord-9",
        nonce="n-9",
    )
    assert sig == "sig-abc"
    (tx,) = sent
    msg = tx.message
    ixs = msg.instructions
    # transferChecked + memo only; memo last with the right payload.
    assert len(ixs) == 2
    memo_ix = ixs[-1]
    assert bytes(memo_ix.data) == b"advertek:order:ord-9:n-9"
    assert msg.account_keys[memo_ix.program_id_index] == pay.MEMO_PROGRAM_ID


def test_send_payment_creates_missing_settlement_ata():
    sent: list = []
    client = _fake_client(settlement_ata_exists=False, sent=sent)
    pay.send_usdc_payment(
        client=client,
        payer=PAYER,
        usdc_mint=USDC_MINT,
        settlement_wallet=SETTLEMENT_WALLET,
        amount_base_units=2_000_000,
        order_id="ord-9",
        nonce="n-9",
    )
    (tx,) = sent
    assert len(tx.message.instructions) == 3  # create ATA + transfer + memo
