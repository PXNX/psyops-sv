"""NATO DTG formatting for bot messages.

Mirrors src/lib/utils/dtg.ts on the web side: a UTC timestamp reads
"12 NOV 2026, 13:44" no matter where the player or the server is located.
"""

from datetime import datetime, timezone

_MONTHS = (
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
)


def dtg(value: datetime) -> str:
    """Format a datetime as ``DD MON YYYY, HH:MM`` in UTC (Zulu)."""
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc)
    return f"{value.day:02d} {_MONTHS[value.month - 1]} {value.year:04d}, {value.hour:02d}:{value.minute:02d}"
