"""
private/premium.py
──────────────────
Game integration handlers for the private bot:

  * ``/login``   – sends a Telegram login button that signs the user into the
                   game website (reusing the game's existing
                   ``/auth/callback/telegram`` endpoint, which verifies the
                   Telegram hash and creates a session).
  * ``/premium`` – lets a linked user buy a premium membership with either
                   **Telegram Stars** (native invoice) or **TON** (on-chain
                   transfer verified via the toncenter API).

Premium membership is stored in the game database (``user_profiles``); see
``data/game_db.py``.

Integration in main.py
───────────────────────
    from private.premium import register_premium, schedule_ton_verification
    register_premium(application)
    schedule_ton_verification(application)   # requires the job-queue extra
"""

import logging
import secrets
import time
from dataclasses import dataclass
from typing import Dict, Optional

import httpx
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    LabeledPrice,
    LoginUrl,
    Update,
)
from telegram.ext import (
    Application,
    CallbackContext,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    PreCheckoutQueryHandler,
    filters,
)

from data.game_db import find_account_by_telegram_id, grant_premium
from settings.config import (
    APP_URL,
    MOCK_STARS_PAYMENTS,
    TON_API_KEY,
    TON_WALLET_ADDRESS,
    TONCENTER_API_URL,
)

logger = logging.getLogger(__name__)


# ─── Premium plans ──────────────────────────────────────────────────────────
@dataclass(frozen=True)
class PremiumPlan:
    plan_id: str
    label: str
    days: int
    stars: int      # price in Telegram Stars (XTR)
    ton: float      # price in TON


# Mirrors PREMIUM_PLANS in psyops-sv/src/lib/config/features/premium.config.ts
PREMIUM_PLANS: Dict[str, PremiumPlan] = {
    "monthly": PremiumPlan("monthly", "1 Month", 30, 500, 1.5),
    "semiannual": PremiumPlan("semiannual", "6 Months", 180, 2500, 7.0),
}

# Pending TON payments live in ``bot_data`` under this key so PicklePersistence
# keeps them across restarts. Maps a unique comment code -> payment details.
TON_PENDING_KEY = "ton_pending"
TON_PENDING_TTL = 60 * 60  # forget unpaid TON invoices after one hour
NANO = 1_000_000_000       # nanotons per TON


# ─── Payload helpers (shared format with the game webhook) ───────────────────
def _build_payload(plan_id: str, account_id: str) -> str:
    return f"premium:{plan_id}:{account_id}"


def _parse_payload(payload: str) -> Optional[tuple[str, str]]:
    parts = payload.split(":")
    if len(parts) != 3 or parts[0] != "premium" or parts[1] not in PREMIUM_PLANS:
        return None
    return parts[1], parts[2]


# ─── /login ──────────────────────────────────────────────────────────────────
async def login_cmd(update: Update, _: CallbackContext) -> None:
    """Send a Telegram login button that authenticates the user on the website."""
    button = InlineKeyboardButton(
        "🎮 Log in to the game",
        login_url=LoginUrl(url=f"{APP_URL}/auth/callback/telegram"),
    )
    await update.message.reply_text(
        "Tap below to securely log in to the game with your Telegram account.\n\n"
        "After logging in you can buy a <b>Premium membership</b> here with /premium.",
        reply_markup=InlineKeyboardMarkup.from_button(button),
    )


# ─── /premium ─────────────────────────────────────────────────────────────────
def _plans_keyboard() -> InlineKeyboardMarkup:
    rows = []
    for plan in PREMIUM_PLANS.values():
        stars_label = f"{plan.label} · free (mock)" if MOCK_STARS_PAYMENTS else f"{plan.label} · ⭐ {plan.stars}"
        buttons = [
            InlineKeyboardButton(
                stars_label,
                callback_data=f"prem_stars_{plan.plan_id}",
            )
        ]
        if TON_WALLET_ADDRESS:
            buttons.append(
                InlineKeyboardButton(
                    f"💎 {plan.ton:g} TON",
                    callback_data=f"prem_ton_{plan.plan_id}",
                )
            )
        rows.append(buttons)
    return InlineKeyboardMarkup(rows)


def _login_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup.from_button(
        InlineKeyboardButton(
            "🎮 Log in to the game",
            login_url=LoginUrl(url=f"{APP_URL}/auth/callback/telegram"),
        )
    )


async def premium_cmd(update: Update, _: CallbackContext) -> None:
    user_id = update.effective_user.id
    account_id = await find_account_by_telegram_id(user_id)

    if not account_id:
        await update.message.reply_text(
            "You need to link your Telegram account first. "
            "Log in to the game with the button below, then run /premium again.",
            reply_markup=_login_keyboard(),
        )
        return

    if MOCK_STARS_PAYMENTS:
        intro = "Premium is currently <b>free</b> — just pick a plan:"
    else:
        intro = "Choose a plan and pay with Telegram Stars" + (" or TON:" if TON_WALLET_ADDRESS else ":")

    lines = [
        "With a <b>Premium membership</b> the game automatically runs production, "
        "military training and factory work for you.",
        "",
        intro,
    ]
    await update.message.reply_text(
        "\n".join(lines),
        reply_markup=_plans_keyboard(),
    )


# ─── Telegram Stars purchase ─────────────────────────────────────────────────
async def buy_with_stars(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    plan_id = query.data[len("prem_stars_"):]
    plan = PREMIUM_PLANS.get(plan_id)
    if plan is None:
        await query.answer("Unknown plan.", show_alert=True)
        return

    account_id = await find_account_by_telegram_id(query.from_user.id)
    if not account_id:
        await query.answer()
        await query.message.reply_text(
            "Please log in to the game first.", reply_markup=_login_keyboard()
        )
        return

    await query.answer()

    if MOCK_STARS_PAYMENTS:
        # MOCK: grant premium immediately for free instead of charging Stars.
        # Mirrors psyops-sv's old webhook behaviour while real payments are
        # disabled. Flip MOCK_STARS_PAYMENTS=false to charge for real.
        premium_until = await grant_premium(account_id, plan.days)
        if premium_until is None:
            await query.message.reply_text("⚠️ Something went wrong updating your account. Please try again.")
            return
        await query.message.reply_text(
            f"✅ Your <b>{plan.label}</b> premium (currently free) is active until "
            f"{premium_until:%Y-%m-%d %H:%M} UTC. Automation is now working for you."
        )
        return

    await context.bot.send_invoice(
        chat_id=query.message.chat_id,
        title=f"{plan.label} Premium",
        description=(
            f"{plan.days} days of premium: automatic production, military "
            f"training and factory work."
        ),
        payload=_build_payload(plan_id, account_id),
        provider_token="",          # empty provider token => Telegram Stars
        currency="XTR",
        prices=[LabeledPrice(f"{plan.label} Premium", plan.stars)],
    )


async def precheckout(update: Update, _: CallbackContext) -> None:
    query = update.pre_checkout_query
    if _parse_payload(query.invoice_payload) is None:
        await query.answer(ok=False, error_message="This purchase is no longer valid.")
        return
    await query.answer(ok=True)


async def successful_payment(update: Update, _: CallbackContext) -> None:
    payment = update.message.successful_payment
    parsed = _parse_payload(payment.invoice_payload)
    if parsed is None:
        logger.error("Successful payment with invalid payload: %s", payment.invoice_payload)
        return

    plan_id, account_id = parsed
    plan = PREMIUM_PLANS[plan_id]
    premium_until = await grant_premium(account_id, plan.days)

    if premium_until is None:
        await update.message.reply_text(
            "⚠️ Payment received but your account could not be updated. "
            "Please contact support with your payment reference."
        )
        return

    await update.message.reply_text(
        f"✅ Thank you! Your <b>{plan.label}</b> premium is active until "
        f"{premium_until:%Y-%m-%d %H:%M} UTC. Automation is now working for you."
    )


# ─── TON purchase ─────────────────────────────────────────────────────────────
def _ton_pending(context: CallbackContext) -> Dict[str, dict]:
    return context.application.bot_data.setdefault(TON_PENDING_KEY, {})


async def buy_with_ton(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    plan_id = query.data[len("prem_ton_"):]
    plan = PREMIUM_PLANS.get(plan_id)
    if plan is None or not TON_WALLET_ADDRESS:
        await query.answer("TON payments are not available.", show_alert=True)
        return

    account_id = await find_account_by_telegram_id(query.from_user.id)
    if not account_id:
        await query.answer()
        await query.message.reply_text(
            "Please log in to the game first.", reply_markup=_login_keyboard()
        )
        return

    await query.answer()

    comment = f"MNP-{secrets.token_hex(4)}"
    nano = int(round(plan.ton * NANO))
    _ton_pending(context)[comment] = {
        "plan_id": plan_id,
        "account_id": account_id,
        "chat_id": query.message.chat_id,
        "user_id": query.from_user.id,
        "nano": nano,
        "created": time.time(),
    }

    transfer_url = (
        f"ton://transfer/{TON_WALLET_ADDRESS}?amount={nano}&text={comment}"
    )
    keyboard = InlineKeyboardMarkup(
        [
            [InlineKeyboardButton(f"💎 Pay {plan.ton:g} TON", url=transfer_url)],
            [InlineKeyboardButton("✅ I've paid — check now", callback_data=f"prem_toncheck_{comment}")],
        ]
    )
    await query.message.reply_text(
        f"To activate <b>{plan.label}</b> premium, send exactly "
        f"<b>{plan.ton:g} TON</b> to:\n<code>{TON_WALLET_ADDRESS}</code>\n\n"
        f"You <b>must</b> include this comment so we can match your payment:\n"
        f"<code>{comment}</code>\n\n"
        "Use the button below to pay from your wallet, then tap "
        "\"I've paid\". Verification can take a minute after the transaction "
        "is confirmed on-chain.",
        reply_markup=keyboard,
    )


async def _fetch_ton_transactions() -> Dict[str, int]:
    """Return a map of {comment: max nanoton value} for recent incoming TON txs."""
    params = {"account": TON_WALLET_ADDRESS, "limit": 100, "sort": "desc"}
    headers = {"X-API-Key": TON_API_KEY} if TON_API_KEY else {}
    result: Dict[str, int] = {}
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{TONCENTER_API_URL}/transactions", params=params, headers=headers
        )
        resp.raise_for_status()
        data = resp.json()

    for tx in data.get("transactions", []):
        in_msg = tx.get("in_msg") or {}
        decoded = (in_msg.get("message_content") or {}).get("decoded") or {}
        comment = decoded.get("comment")
        if not comment:
            continue
        try:
            value = int(in_msg.get("value") or 0)
        except (TypeError, ValueError):
            continue
        # Keep the largest value seen for a comment (in case of duplicates).
        if value > result.get(comment, 0):
            result[comment] = value
    return result


async def _settle_ton_payments(application: Application) -> None:
    pending: Dict[str, dict] = application.bot_data.get(TON_PENDING_KEY, {})
    if not pending or not TON_WALLET_ADDRESS:
        return

    # Drop expired invoices first.
    now = time.time()
    expired = [c for c, p in pending.items() if now - p.get("created", now) > TON_PENDING_TTL]
    for comment in expired:
        pending.pop(comment, None)
    if not pending:
        return

    try:
        received = await _fetch_ton_transactions()
    except Exception as e:  # noqa: BLE001 - network errors shouldn't kill the job
        logger.warning("TON verification: failed to fetch transactions: %s", e)
        return

    for comment, payment in list(pending.items()):
        value = received.get(comment)
        if value is None or value < payment["nano"]:
            continue

        plan = PREMIUM_PLANS[payment["plan_id"]]
        premium_until = await grant_premium(payment["account_id"], plan.days)
        pending.pop(comment, None)

        if premium_until is None:
            logger.error("TON payment %s could not update account %s", comment, payment["account_id"])
            continue

        try:
            await application.bot.send_message(
                payment["chat_id"],
                f"✅ TON payment received! Your <b>{plan.label}</b> premium is "
                f"active until {premium_until:%Y-%m-%d %H:%M} UTC. Automation is "
                f"now working for you.",
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("TON verification: could not notify %s: %s", payment["chat_id"], e)


async def check_ton_now(update: Update, context: CallbackContext) -> None:
    """Manual verification triggered by the user's 'I've paid' button."""
    query = update.callback_query
    comment = query.data[len("prem_toncheck_"):]
    pending = _ton_pending(context)

    if comment not in pending:
        await query.answer("This payment was already processed or has expired.", show_alert=True)
        return

    await query.answer("Checking the TON blockchain…")
    await _settle_ton_payments(context.application)

    if comment in pending:
        await context.bot.send_message(
            query.message.chat_id,
            "We couldn't find your payment yet. If you just sent it, wait for "
            "on-chain confirmation and tap the button again.",
        )


async def _ton_verification_job(context: ContextTypes.DEFAULT_TYPE) -> None:
    await _settle_ton_payments(context.application)


# ─── Registration ─────────────────────────────────────────────────────────────
def register_premium(app: Application) -> None:
    app.add_handler(CommandHandler("login", login_cmd, filters.ChatType.PRIVATE))
    app.add_handler(CommandHandler("premium", premium_cmd, filters.ChatType.PRIVATE))
    app.add_handler(CallbackQueryHandler(buy_with_stars, r"^prem_stars_"))
    app.add_handler(CallbackQueryHandler(buy_with_ton, r"^prem_ton_[a-z]+$"))
    app.add_handler(CallbackQueryHandler(check_ton_now, r"^prem_toncheck_"))
    app.add_handler(PreCheckoutQueryHandler(precheckout))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment))


def schedule_ton_verification(app: Application) -> None:
    """Poll the TON blockchain periodically to settle pending TON payments."""
    if not TON_WALLET_ADDRESS:
        logger.info("TON_WALLET_ADDRESS not set; TON payment verification disabled.")
        return
    if app.job_queue is None:
        logger.warning("Job queue unavailable; TON payments will only settle on user request.")
        return
    app.job_queue.run_repeating(_ton_verification_job, interval=60, first=30)
