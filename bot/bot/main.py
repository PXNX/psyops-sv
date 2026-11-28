"""
PTB-PSYOPS: Telegram auth-linking & premium purchase bot for psyops-sv.

Runs as a long-polling bot (like the other bots that live inside their app's repository) instead of
a serverless webhook. Handlers live in private/premium.py; database access
against psyops-sv's own Postgres database lives in data/game_db.py.
"""

import logging
from datetime import datetime
from os import path, makedirs
from typing import Final

from telegram import LinkPreviewOptions
from telegram.constants import ParseMode
from telegram.ext import ApplicationBuilder, ContextTypes, Defaults, PicklePersistence

from private.premium import register_premium, schedule_ton_verification
from private.setup import post_init, register_setup
from settings.config import CONTAINER, TOKEN
from util.error_logger import get_error_logger
from util.telemetry import emit


def add_logging() -> None:
    """Configure logging based on environment (container or local)."""
    if CONTAINER:
        logging.basicConfig(
            format="%(asctime)s %(levelname)-5s %(funcName)-20s [%(filename)s:%(lineno)d]: %(message)s",
            encoding="utf-8",
            level=logging.INFO,
            datefmt="%Y-%m-%d %H:%M:%S",
            handlers=[logging.StreamHandler()],
        )
    else:
        log_filename: Final[str] = rf"../logs/{datetime.now().strftime('%Y-%m-%d/%H-%M-%S')}.log"
        makedirs(path.dirname(log_filename), exist_ok=True)
        logging.basicConfig(
            format="%(asctime)s %(levelname)-5s %(funcName)-20s [%(filename)s:%(lineno)d]: %(message)s",
            encoding="utf-8",
            filename=log_filename,
            level=logging.INFO,
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    logging.getLogger("httpx").setLevel(logging.WARNING)


def main() -> None:
    application = (
        ApplicationBuilder()
        .token(TOKEN)
        .defaults(Defaults(parse_mode=ParseMode.HTML, link_preview_options=LinkPreviewOptions(is_disabled=True)))
        .post_init(post_init)
        .persistence(PicklePersistence(filepath="persistence"))
        .read_timeout(50)
        .get_updates_read_timeout(50)
        .build()
    )

    # /login (game login button) and /premium (Telegram Stars / TON purchase)
    register_premium(application)
    register_setup(application)
    schedule_ton_verification(application)

    async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
        emit(
            "app.error",
            error_type=type(context.error).__name__ if context.error else "Unknown",
            update_type=type(update).__name__,
            context="update_handler",
        )
        logging.error("Exception while handling an update:", exc_info=context.error)
        error_logger = get_error_logger()
        await error_logger.log_error(context.error, "Error in update handler")

    application.add_error_handler(error_handler)

    emit("app.started")
    logging.info("### PTB-PSYOPS (Auth + Premium Purchases) RUNNING ###")
    application.run_polling(poll_interval=1, drop_pending_updates=False)


if __name__ == "__main__":
    add_logging()
    main()
