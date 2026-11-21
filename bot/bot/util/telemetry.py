"""
Structured event telemetry for the Telegram bot.

The bot has no HTTP interface to the web app — the two share Postgres and the
Telegram `/login` button. This module gives them a *shared event vocabulary* so
a user journey can be followed across both: web events are emitted by
``src/lib/server/telemetry.ts`` with ``source: "web"``, these events use
``source: "telegram_bot"``, and both emit ``premium.granted`` and
``auth.login.*`` with account/telegram ids for correlation.

Every event is written as one JSON line to the container logs. If
``TELEMETRY_ENDPOINT`` is configured, a copy is POSTed there in a background
thread (failures are logged but never affect the bot).

Only identifiers go into events — no usernames, emails or payment secrets.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from typing import Any
from urllib import request

from settings.config import TELEMETRY_ENDPOINT

logger = logging.getLogger(__name__)

SERVICE_NAME = "psyops-sv-telegram-bot"
SOURCE = "telegram_bot"
_POST_TIMEOUT_SECONDS = 2.0


def _post_event(endpoint: str, payload: str) -> None:
    """Best-effort delivery to an external collector; never raises."""
    try:
        req = request.Request(
            endpoint,
            data=payload.encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=_POST_TIMEOUT_SECONDS):
            pass
    except Exception as exc:  # noqa: BLE001 - telemetry must never break the bot
        logger.warning("Telemetry export to %s failed: %s", endpoint, exc)


def emit(event: str, **attributes: Any) -> None:
    """Emit one structured telemetry event."""
    record: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "source": SOURCE,
        "service.name": SERVICE_NAME,
    }
    for key, value in attributes.items():
        if value is not None:
            record[key] = value

    payload = json.dumps(record, default=str, ensure_ascii=False)
    logger.info(payload)

    if TELEMETRY_ENDPOINT:
        threading.Thread(
            target=_post_event, args=(TELEMETRY_ENDPOINT, payload), daemon=True
        ).start()
