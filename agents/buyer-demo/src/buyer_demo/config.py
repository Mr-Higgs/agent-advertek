"""Environment-based configuration for the buyer demo agent.

All environment access for the package happens here. Every other module
receives a ``Config`` (or values derived from it) instead of reading
``os.environ`` itself, so tests can pass fixtures without mutating the
process environment.

No secrets are ever hard-coded: the buyer wallet secret key, RPC URL, and
the Advertek settlement wallet all come from the environment (typically a
local ``.env`` file loaded via python-dotenv).
"""

from __future__ import annotations

import json
import os
from collections.abc import Mapping
from dataclasses import dataclass

from dotenv import load_dotenv

REQUIRED_ENV_VARS = (
    "ADVERTEK_MCP_URL",
    "BUYER_WALLET_SECRET_KEY",
    "SOLANA_RPC_URL",
    "USDC_MINT_ADDRESS",
    "ADVERTEK_SETTLEMENT_WALLET",
)

DEFAULT_MODEL = "anthropic:claude-sonnet-4-5"

# Ed25519 secret keys are 64 bytes (32-byte seed + 32-byte public key),
# matching the JSON byte array produced by `solana-keygen new`.
SECRET_KEY_LENGTH = 64


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or malformed."""


@dataclass(frozen=True)
class Config:
    """Validated runtime configuration."""

    mcp_url: str
    buyer_wallet_secret_key: bytes
    solana_rpc_url: str
    usdc_mint_address: str
    advertek_settlement_wallet: str
    model: str


def _parse_secret_key(raw: str) -> bytes:
    """Parse a JSON byte array (e.g. a solana-keygen id.json) into bytes."""
    try:
        values = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ConfigError(
            "BUYER_WALLET_SECRET_KEY must be a JSON byte array "
            '(e.g. "[12,34,...,56]" from a solana-keygen id.json file)'
        ) from exc
    if (
        not isinstance(values, list)
        or len(values) != SECRET_KEY_LENGTH
        or not all(isinstance(v, int) and not isinstance(v, bool) for v in values)
        or not all(0 <= v <= 255 for v in values)
    ):
        raise ConfigError(
            f"BUYER_WALLET_SECRET_KEY must be a JSON array of {SECRET_KEY_LENGTH} "
            "integers in [0, 255]"
        )
    return bytes(values)


def load_config(env: Mapping[str, str] | None = None) -> Config:
    """Load and validate configuration, failing fast with a clear error.

    Reads ``os.environ`` by default (after loading a local ``.env`` if
    present); pass ``env`` to supply a fixture mapping instead.
    """
    if env is None:
        load_dotenv()
        env = os.environ

    missing = [name for name in REQUIRED_ENV_VARS if not env.get(name)]
    if missing:
        raise ConfigError(
            "Missing required environment variable(s): "
            + ", ".join(missing)
            + ". Copy .env.example to .env and fill in the values."
        )

    return Config(
        mcp_url=env["ADVERTEK_MCP_URL"],
        buyer_wallet_secret_key=_parse_secret_key(env["BUYER_WALLET_SECRET_KEY"]),
        solana_rpc_url=env["SOLANA_RPC_URL"],
        usdc_mint_address=env["USDC_MINT_ADDRESS"],
        advertek_settlement_wallet=env["ADVERTEK_SETTLEMENT_WALLET"],
        model=env.get("BUYER_AGENT_MODEL") or DEFAULT_MODEL,
    )
