from os import getenv
from typing import Final

from dotenv import load_dotenv

load_dotenv()

TOKEN: Final[str] = getenv("TELEGRAM", "")
if not TOKEN:
    raise RuntimeError("TELEGRAM environment variable (bot token) is required")

CONTAINER: Final[bool] = str(getenv("CONTAINER", "False")).lower() == "true"

# --- Game integration (login + premium purchases) ---------------------------
# Connection to psyops-sv's PostgreSQL database. Used to look up accounts by
# Telegram ID and to grant premium memberships (see data/game_db.py).
GAME_DATABASE_URL: Final[str] = getenv("GAME_DATABASE_URL") or getenv("DATABASE_URL", "")
if not GAME_DATABASE_URL:
    raise RuntimeError("GAME_DATABASE_URL (or DATABASE_URL) environment variable is required")
# Whether the game database requires an SSL connection (managed Postgres, etc.).
# Usually unnecessary if the connection string already has ?sslmode=require.
GAME_DB_SSL: Final[bool] = str(getenv("GAME_DB_SSL", "False")).lower() == "true"

# Public base URL of the game/website, used to build the Telegram login button.
# IMPORTANT: for the login button to work this bot must run with the SAME bot
# token as psyops-sv's TELEGRAM_BOT_TOKEN (BotFather /setdomain must point to APP_URL).
APP_URL: Final[str] = getenv("APP_URL", "http://localhost:5173").rstrip("/")

# --- Payments ------------------------------------------------------------
# While true, /premium grants membership immediately for free instead of
# charging real Telegram Stars (mirrors psyops-sv's old webhook behaviour,
# which had Stars payments disabled). Flip to false once ready to charge.
MOCK_STARS_PAYMENTS: Final[bool] = str(getenv("MOCK_STARS_PAYMENTS", "true")).lower() == "true"

# --- TON payments (optional) -------------------------------------------------
# Destination wallet that receives TON premium payments. When empty, only the
# Telegram Stars payment option is offered.
TON_WALLET_ADDRESS: Final[str] = getenv("TON_WALLET_ADDRESS", "")
TONCENTER_API_URL: Final[str] = getenv("TONCENTER_API_URL", "https://toncenter.com/api/v3").rstrip("/")
TON_API_KEY: Final[str] = getenv("TON_API_KEY", "")

# --- Error reporting (optional) ----------------------------------------------
# Post unhandled exceptions to a Telegram group/topic. Leave LOG_GROUP_ID unset
# (0) to disable and only log to the console.
LOG_GROUP_ID: Final[int] = int(getenv("LOG_GROUP_ID", "0"))
THREAD_ID: Final[int] = int(getenv("THREAD_ID", "0"))

# --- Telemetry ---------------------------------------------------------------
# Optional HTTP endpoint that receives one JSON object per event. Events are
# always written to the container logs as structured JSON as well; set this to
# forward them to the same collector the web app's OTEL_EXPORTER_OTLP_* targets.
TELEMETRY_ENDPOINT: Final[str] = getenv("TELEMETRY_ENDPOINT", "").strip()


# --- Admin controls ----------------------------------------------------------
# Telegram user ids allowed to run /set_cmd, comma-separated. Game accounts
# with the "admin" role are accepted too (see data/game_db.is_game_admin).
def _parse_admin_ids(raw: str) -> frozenset[int]:
    cleaned = raw.strip().strip("[]").replace(" ", "")
    return frozenset(int(part) for part in cleaned.split(",") if part.isdigit())


ADMINS: Final[frozenset[int]] = _parse_admin_ids(getenv("ADMINS", ""))
BOT_DISPLAY_NAME: Final[str] = getenv("BOT_DISPLAY_NAME", "PsyOps Support")
RES_PATH: Final[str] = getenv("RES_PATH", "./res")
PROFILE_PHOTO: Final[str] = getenv("PROFILE_PHOTO", f"{RES_PATH}/profile.png")
