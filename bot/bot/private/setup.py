"""
private/setup.py
────────────────
Admin-only bot presentation handler:

  * ``/set_cmd`` – refreshes the visible command menu, the bot's display name
                   and its profile photo in one go.

Admins are either the Telegram ids in the ADMINS setting or game accounts with
the "admin" role (looked up through the shared Postgres database).
"""

import logging
from pathlib import Path

from telegram import BotCommand, BotCommandScopeChat, InputProfilePhotoStatic, Update
from telegram.error import BadRequest, TelegramError
from telegram.ext import CallbackContext

from data.game_db import is_game_admin
from settings.config import ADMINS, BOT_DISPLAY_NAME, PROFILE_PHOTO
from util.telemetry import emit

logger = logging.getLogger(__name__)

PUBLIC_COMMANDS = (
    ("start", "Open the PsyOps help desk"),
    ("login", "Sign in to the game"),
    ("premium", "Manage your membership"),
)

ADMIN_COMMANDS = PUBLIC_COMMANDS + (("set_cmd", "Refresh the bot name, photo and commands"),)


async def _is_admin(telegram_id: int) -> bool:
    if telegram_id in ADMINS:
        return True
    try:
        return await is_game_admin(telegram_id)
    except Exception as e:
        logger.warning("Could not check game admin role for %s: %s", telegram_id, e)
        return False


async def set_cmd(update: Update, context: CallbackContext) -> None:
    """Reset the bot's public/admin command menus, name and avatar."""
    user_id = update.effective_user.id
    if not await _is_admin(user_id):
        emit("telegram.command.denied", command="/set_cmd", telegram_id=user_id)
        await update.message.reply_text("Only administrators can change the bot's profile.")
        return

    emit("telegram.command", command="/set_cmd", telegram_id=user_id)
    bot = context.bot
    done = []
    failed = []

    try:
        await bot.delete_my_commands()
        await bot.set_my_commands([BotCommand(command, text) for command, text in PUBLIC_COMMANDS])
        await bot.set_my_commands(
            [BotCommand(command, text) for command, text in ADMIN_COMMANDS],
            scope=BotCommandScopeChat(chat_id=update.effective_chat.id),
        )
        done.append("commands")
    except (BadRequest, TelegramError) as e:
        logger.warning("Could not set bot commands: %s", e)
        failed.append("commands")

    try:
        if (await bot.get_my_name()).name != BOT_DISPLAY_NAME:
            await bot.set_my_name(BOT_DISPLAY_NAME)
        done.append("name")
    except (BadRequest, TelegramError) as e:
        logger.warning("Could not set bot name: %s", e)
        failed.append("name")

    photo_path = Path(PROFILE_PHOTO)
    try:
        with photo_path.open("rb") as photo:
            await bot.set_my_profile_photo(InputProfilePhotoStatic(photo))
        done.append("photo")
    except (OSError, BadRequest, TelegramError) as e:
        logger.warning("Could not set bot profile photo from %s: %s", photo_path, e)
        failed.append("photo")

    summary = "Bot profile updated: " + ", ".join(done) + "." if done else "Nothing was updated."
    if failed:
        summary += "\nCould not update: " + ", ".join(failed) + " (see bot logs)."
    await update.message.reply_text(summary)


def register_setup(application) -> None:
    """Register the admin presentation command on the application."""
    from telegram.ext import CommandHandler, filters

    application.add_handler(CommandHandler("set_cmd", set_cmd, filters.ChatType.PRIVATE))
