id: 5a4b5569-5d3c-4377-a238-a71523d7ef3b
sessionId: 2d9724d6-0d72-4e1b-b4a8-6a1254b7445c
date: '2026-07-06T15:22:14.114Z'
label: Premium membership with Telegram bot purchase, automation, gifting
---
# Premium Membership Feature

## Goal
Let users buy a **premium membership** (in-game currency or via a **Telegram bot** using Telegram Stars). While premium is active, an automation job automatically performs **production**, **military training**, and **factory work** on the user's behalf. Premium can be **gifted** to other users. Premium users get a **colorful animated glow** behind the hero card on their profile page.

## Data Model (src/lib/server/schema.ts)
- `userProfiles`: add `premiumUntil timestamp` (nullable) and `premiumAutomation boolean default true`.
- `transactionTypeEnum`: add `premium_purchase`.
- Migration file `migrations/add_premium_membership.sql`.

## Config
- `src/lib/config/game/production.config.ts`: extract `PRODUCTION_RECIPES` (currently inline in production/+page.server.ts) for reuse.
- `src/lib/config/features/premium.config.ts`: `PREMIUM_PLANS` (days, currencyPrice, telegramStars) + `isPremiumActive()` helper.
- Register both in `src/lib/config/index.ts`.

## Server
- `src/lib/server/telegram.ts`: Bot API helpers (`sendMessage`, `sendInvoice`, `answerPreCheckoutQuery`).
- `src/lib/server/service/premium.ts`:
  - `grantPremium(accountId, days, tx?)`, `getPremiumStatus(accountId)`
  - `buyPremiumWithCurrency(accountId, planId)`, `giftPremium(gifterId, recipientId, planId)`
  - `runPremiumAutomationForUser(accountId)` reusing `factoryWork` service + recipes + military templates
  - `runPremiumAutomation()` iterate active premium users.

## Routes
- Cron: `src/routes/(authenticated)/api/cron/premium/+server.ts` -> `runPremiumAutomation()`. Register in `vercel.json`.
- Telegram webhook: `src/routes/(unauthenticated)/api/telegram/webhook/+server.ts` — `/start` & `/premium` send invoice; `pre_checkout_query` -> answer ok; `successful_payment` -> grant premium to linked account (by telegramId).
- Premium page: `src/routes/(authenticated)/(dock)/premium/+page.{server.ts,svelte}` — buy with currency, gift to user, toggle automation, show status + Telegram bot instructions.
- Link to `/premium` from settings page.

## Profile glow
- `user/[id]/+page.server.ts`: add `isPremium` to `data.user`.
- `user/[id]/+page.svelte`: colorful animated glow behind hero card when premium.

## Verification
- `bun run check` (svelte-check) passes.
- `bun run lint` passes.
