import os
import sys

os.environ.setdefault("TELEGRAM", "0:test")
os.environ.setdefault("GAME_DATABASE_URL", "postgresql://test:test@localhost:5432/test")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bot"))

from private.premium import _build_payload, _parse_payload  # noqa: E402


def test_build_and_parse_payload_roundtrip():
    payload = _build_payload("monthly", "acc_123")
    assert _parse_payload(payload) == ("monthly", "acc_123")


def test_parse_payload_rejects_unknown_plan():
    assert _parse_payload("premium:unknown:acc_123") is None


def test_parse_payload_rejects_malformed_payload():
    assert _parse_payload("not-a-payload") is None
