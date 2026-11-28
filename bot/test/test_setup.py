import os
import sys

os.environ.setdefault("TELEGRAM", "0:test")
os.environ.setdefault("GAME_DATABASE_URL", "postgresql://test:test@localhost:5432/test")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bot"))

from private.setup import ADMIN_COMMANDS, PUBLIC_COMMANDS  # noqa: E402
from settings.config import _parse_admin_ids  # noqa: E402


def test_admin_ids_parsing():
    assert _parse_admin_ids("1, 2,3") == frozenset({1, 2, 3})
    assert _parse_admin_ids("") == frozenset()


def test_admin_menu_contains_public_commands():
    names = {command for command, _ in ADMIN_COMMANDS}
    assert {command for command, _ in PUBLIC_COMMANDS} <= names
    assert "set_cmd" in names
