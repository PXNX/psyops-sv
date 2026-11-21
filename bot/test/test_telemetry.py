import json
import logging
import os
import sys

os.environ.setdefault("TELEGRAM", "0:test")
os.environ.setdefault("GAME_DATABASE_URL", "postgresql://test:test@localhost:5432/test")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bot"))

from util.telemetry import SERVICE_NAME, emit  # noqa: E402


def _telemetry_lines(caplog):
    return [record.message for record in caplog.records if record.name == "util.telemetry"]


def test_emit_writes_structured_event(caplog):
    with caplog.at_level(logging.INFO):
        emit("premium.granted", account_id="acc_123", telegram_id=42, days=30)

    lines = _telemetry_lines(caplog)
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert record["event"] == "premium.granted"
    assert record["source"] == "telegram_bot"
    assert record["service.name"] == SERVICE_NAME
    assert record["account_id"] == "acc_123"
    assert record["telegram_id"] == 42
    assert record["days"] == 30
    assert "timestamp" in record


def test_emit_omits_none_attributes(caplog):
    with caplog.at_level(logging.INFO):
        emit("telegram.command", command="/premium", telegram_id=42, account_id=None)

    record = json.loads(_telemetry_lines(caplog)[0])
    assert "account_id" not in record
    assert record["command"] == "/premium"
