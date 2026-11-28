"""
data/game_db.py
───────────────
Access layer for psyops-sv's Postgres database (the SvelteKit app's own DB;
this bot has no database of its own).

Only the pieces required for Telegram login and premium purchases live here:
  * resolving a game account from a Telegram user id
  * granting / extending a premium membership

The premium-granting logic mirrors ``grantPremium`` in
``psyops-sv/src/lib/server/service/premium.ts``: remaining premium time stacks
on top of any purchase.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from ssl import CERT_NONE, Purpose, create_default_context
from typing import Optional

from asyncpg import Pool, create_pool

from settings.config import GAME_DATABASE_URL, GAME_DB_SSL
from util.telemetry import emit


def _get_ssl():
    ssl_ctx = create_default_context(Purpose.SERVER_AUTH)
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = CERT_NONE
    return ssl_ctx


class GameDBPool:
    """Lazily-initialised connection pool for the game database."""

    _pool: Optional[Pool] = None

    @classmethod
    async def get_pool(cls) -> Optional[Pool]:
        if not GAME_DATABASE_URL:
            emit("db.unavailable", reason="not_configured")
            logging.error("GAME_DATABASE_URL is not configured; premium/login DB access disabled.")
            return None
        if cls._pool is None:
            cls._pool = await create_pool(
                GAME_DATABASE_URL,
                ssl=_get_ssl() if GAME_DB_SSL else None,
            )
        return cls._pool

    @classmethod
    @asynccontextmanager
    async def connection(cls):
        pool = await cls.get_pool()
        if pool is None:
            yield None
            return
        async with pool.acquire() as conn:
            yield conn


async def find_account_by_telegram_id(telegram_id: int) -> Optional[str]:
    """Return the game account id linked to a Telegram user, or ``None``."""
    async with GameDBPool.connection() as conn:
        if conn is None:
            return None
        return await conn.fetchval(
            "select account_id from user_profiles where telegram_id = $1",
            telegram_id,
        )


async def is_game_admin(telegram_id: int) -> bool:
    """True when this Telegram id is linked to a game account with the admin role."""
    async with GameDBPool.connection() as conn:
        if conn is None:
            return False
        return bool(
            await conn.fetchval(
                "select exists(select 1 from accounts a "
                "join user_profiles p on p.account_id = a.id "
                "where p.telegram_id = $1 and a.role = 'admin')",
                telegram_id,
            )
        )


async def grant_premium(account_id: str, days: int) -> Optional[datetime]:
    """Extend an account's premium membership by ``days``.

    Remaining premium time stacks on top of the new purchase. Returns the new
    expiry timestamp, or ``None`` when the account could not be updated.
    """
    async with GameDBPool.connection() as conn:
        if conn is None:
            return None
        return await conn.fetchval(
            "update user_profiles "
            "set premium_until = greatest(coalesce(premium_until, now()), now()) "
            "        + make_interval(days => $2), "
            "    updated_at = now() "
            "where account_id = $1 "
            "returning premium_until",
            account_id,
            days,
        )
