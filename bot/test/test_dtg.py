import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bot"))

from util.dtg import dtg  # noqa: E402


def test_dtg_uses_utc_uppercase_month_and_24_hour_clock():
    assert dtg(datetime(2026, 11, 12, 13, 44, tzinfo=timezone.utc)) == "12 NOV 2026, 13:44"


def test_dtg_converts_offsets_to_utc():
    berlin = timezone(timedelta(hours=1))
    assert dtg(datetime(2026, 11, 12, 14, 44, tzinfo=berlin)) == "12 NOV 2026, 13:44"


def test_dtg_handles_naive_datetimes():
    assert dtg(datetime(2026, 1, 3, 0, 5)) == "03 JAN 2026, 00:05"
