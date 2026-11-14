# PTB-PSYOPS: Auth & Premium Purchase Bot

Lives in the psyops-sv repository under `bot/` (its history came from
[PXNX/ptb-psyops](https://github.com/PXNX/ptb-psyops), which was extracted from the
account-linking / premium-purchase logic that once lived in psyops-sv's Telegram webhook route).
It runs as a long-polling bot instead of a serverless webhook.

It talks directly to psyops-sv's Postgres database (`account` / `user_profiles` tables) — it does
not own its own schema.

## Funktionen

- **`/login`** — schickt einen nativen Telegram-Login-Button (`LoginUrl`), der den Nutzer direkt
  über `psyops-sv`s `/auth/callback/telegram`-Endpoint einloggt.
- **`/premium [monthly|semiannual]`** — kauft/verlängert die Premium-Mitgliedschaft. Solange
  `MOCK_STARS_PAYMENTS=true` (Default) ist, wird Premium kostenlos gewährt. Bei `false` wird
  stattdessen über **Telegram Stars** (native Invoice) oder, falls `TON_WALLET_ADDRESS` gesetzt
  ist, über **TON** (On-Chain-Überweisung, verifiziert per Hintergrund-Job gegen die toncenter-API)
  echt abgerechnet.
- Prüft vor jedem Kauf, ob der Telegram-Account bereits über `/login` mit einem psyops-sv-Account
  verknüpft ist.

## Layout

| Path                         | What                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bot/`                       | python-telegram-bot app (long polling). Owns every update, including `pre_checkout_query` and `successful_payment`. |
| `test/`                      | pytest unit tests (payload format, premium logic).                                                                  |
| `Dockerfile`, `compose.yaml` | Optional container builds for local development.                                                                    |
| `ptb-psyops.container`       | Quadlet unit for the deployment host (uses the plain `python:3.13-slim` image, like the other in-repo bots).        |

The paths in the table below are relative to `bot/` (the folder you are in when running the bot).

## Run locally

```sh
python -m venv venv && venv\Scripts\pip install -r requirements.txt
copy .env.example .env   # fill in TELEGRAM, GAME_DATABASE_URL, APP_URL
run.bat
set TEST_DATABASE_URL=postgresql://...   # an empty database, if you want to run the tests against one
venv\Scripts\python -m pytest test
```

## Deployment

Deployed as a quadlet container on the deployment host, the same way as the other bots that live
inside their app's repository:

```sh
# on the host, from a checkout of this repository
cp ptb-psyops.container ~/.config/containers/systemd/

# .env at bot/.env next to this README (see .env.example); the bot needs the
# same Postgres database the app uses and the same bot token the app's
# TELEGRAM_BOT_TOKEN uses (BotFather /setdomain must point to APP_URL).

systemctl --user daemon-reload
systemctl --user start ptb-psyops
systemctl --user status ptb-psyops
journalctl --user -u ptb-psyops -f
```

The unit runs the plain `python:3.13-slim` image and installs `requirements.txt` at start, so no
custom image has to be published.

**Wichtig:** Für `/login` muss dieser Bot mit demselben Bot-Token laufen, das psyops-sv als
`TELEGRAM_BOT_TOKEN` verwendet — Telegram prüft die über BotFather (`/setdomain`) hinterlegte
Domain gegen `APP_URL`.

## Konfiguration

| Variable              | Beschreibung                                                                          |
| --------------------- | ------------------------------------------------------------------------------------- |
| `TELEGRAM`            | Telegram Bot Token (identical with psyops-sv's `TELEGRAM_BOT_TOKEN`)                  |
| `GAME_DATABASE_URL`   | Postgres-Verbindungs-URL (dieselbe DB wie psyops-sv)                                  |
| `GAME_DB_SSL`         | `true`, falls die DB-Verbindung SSL benötigt und die URL es nicht schon enthält       |
| `APP_URL`             | Öffentliche Basis-URL von psyops-sv, für den `/login`-Button                          |
| `MOCK_STARS_PAYMENTS` | `true` (Default) = Premium kostenlos gewähren, `false` = echt via Stars/TON abrechnen |
| `TON_WALLET_ADDRESS`  | Optional: Wallet für TON-Zahlungen; leer = nur Telegram Stars                         |
| `TONCENTER_API_URL`   | Optional: toncenter-kompatible API zum Verifizieren von TON-Zahlungen                 |
| `TON_API_KEY`         | Optional: API-Key für toncenter                                                       |
| `LOG_GROUP_ID`        | Optional: Telegram-Gruppe für Fehler-Reports                                          |
| `THREAD_ID`           | Optional: Thema/Topic in der Fehler-Report-Gruppe                                     |
| `CONTAINER`           | `true` wenn im Container ausgeführt                                                   |

The premium plans in `private/premium.py` mirror `PREMIUM_PLANS` in
`src/lib/config/features/premium.config.ts`, and the granting logic in `data/game_db.py` mirrors
`grantPremium` in `src/lib/server/service/premium.ts` (remaining premium time stacks on top of any
purchase). Keep them in sync when plans change.
