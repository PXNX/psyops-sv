# PsyOps SV

A SvelteKit application with Google OAuth, PostgreSQL and Bun, presented through a dark editorial field-ledger interface and optimized for mobile devices.

## Features

- **Google OAuth**: Secure authentication via Google.
- **Telegram bot**: [@BotFather-style auth linking and premium purchases](bot/README.md) — `/login` and `/premium` via a long-polling bot in `bot/` that talks to the same Postgres database.
- **PostgreSQL**: Robust and scalable database management using Drizzle ORM.
- **Bun**: Fast JavaScript runtime and package manager.
- **Editorial field-ledger UI**: A restrained midnight-ink interface with parchment rules, serif headings and amber interaction cues.
- **Mobile Optimized**: Responsive layout for seamless experience across devices.

## Setup

### Prerequisites

- Bun (v1.x or higher)
- PostgreSQL database

### 1. Clone the repository

```bash
git clone https://github.com/pxnx/psyops-sv.git
cd psyops-sv
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```dotenv
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
DATABASE_URL="postgresql://user:password@host:port/database_name"
CRON_SECRET="a_long_random_string"
```

Replace `your_google_client_id`, `your_google_client_secret`, and the `DATABASE_URL` with your actual credentials. The `DATABASE_URL` should point to your PostgreSQL instance. `CRON_SECRET` is the Bearer token Vercel Schedules sends to the `/api/cron/*` endpoints (see [Scheduled jobs](#scheduled-jobs-vercel-schedules)).

### 3. Install Dependencies

> **Use Bun, not yarn.** This project uses Bun exclusively for dependency management and running scripts. Do not use `yarn` (or `npm`) — always use `bun` (e.g., `bun install`, `bun add`, `bun run`).

```bash
bun install
```

### 4. Run Drizzle Migrations

Ensure your database schema is up-to-date by running Drizzle migrations:

```bash
bun drizzle-kit migrate
```

### 5. Run the Application

```bash
bun dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Mock mode (no database or accounts needed)

```bash
bun run dev:mock
```

Boots an in-memory Postgres (PGlite), creates every table from `src/lib/server/schema.ts`, seeds a small demo world (`src/lib/server/mock-seed.ts`) and signs you in as the seeded admin. Nothing is persisted; restart the dev server for a fresh world. Mock mode only exists in the dev server: production builds ignore `USE_MOCK`.

## Scheduled jobs (Vercel Schedules)

The game's background ticks run on [Vercel Schedules](https://vercel.com/docs/schedules), declared in `vercel.json`. Each schedule sends a `GET` request to a `/api/cron/*` route with `Authorization: Bearer <CRON_SECRET>` — the routes are protected by that secret, not by a session, so they live outside the `(authenticated)` route group.

| Schedule         | Route                      | Cadence (UTC) | What it does                                                                 |
| ---------------- | -------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `battles`        | `/api/cron/battles`        | hourly        | Moves battles between phases and resolves one combat round per active battle |
| `bloc-elections` | `/api/cron/bloc-elections` | daily         | Opens and closes bloc leader elections and bloc membership applications      |
| `elections`      | `/api/cron/elections`      | hourly        | Activates and tallies state parliament elections                             |
| `premium`        | `/api/cron/premium`        | every 15 min  | Runs the premium automation (production, training, factory shifts)           |
| `proposals`      | `/api/cron/proposals`      | every 15 min  | Closes finished parliament proposals and applies passed ones                 |
| `travels`        | `/api/cron/travels`        | every 15 min  | Completes travels whose arrival time has passed                              |
| `wars`           | `/api/cron/wars`           | hourly        | Ends wars by exhaustion, stalemate, capitulation or recorded surrender       |

Set `CRON_SECRET` in the project's environment variables on Vercel — without it every schedule gets a 403. Schedules apply when a deployment becomes current; each one can be run manually from the dashboard's **Schedules** tab or with `vercel schedules invoke <name>`. The cadences respect the Hobby plan's 15-minute minimum interval; on Pro/Enterprise runs land within the jitter window (default 1 minute) of the scheduled time.

## Telemetry

The web app and the Telegram bot emit **the same event names** with a `source` field (`web` / `telegram_bot`), so a user journey — bot `/login` → web session → bot premium purchase — can be followed across both. No vendor or extra service is required: every event is a structured JSON log line, and web events additionally increment OpenTelemetry counters.

- `src/instrumentation.server.ts` registers `@vercel/otel`. Set the standard `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL` and `OTEL_EXPORTER_OTLP_HEADERS` variables (or use a Vercel observability integration) to ship traces and metrics to a collector. `OTEL_SERVICE_NAME` overrides the default service name.
- `src/lib/server/telemetry.ts` is the web emitter; `bot/bot/util/telemetry.py` is the bot emitter. The bot can also forward its JSON events to an HTTP collector via `TELEMETRY_ENDPOINT` (see [bot/README.md](bot/README.md)).
- `handleError` and each response share a `request_id` (also returned as `X-Request-Id`); events carry it plus the active OTel `trace_id`/`span_id` when tracing is enabled.

Key events and their attributes:

| Event                                                                     | Emitted by              | Attributes                                                                                                             |
| ------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `auth.login.success` / `auth.login.failure`                               | web                     | `provider`, `source` (`telegram_bot`, `telegram_widget`, `web`), `account_id`, `telegram_id`, `is_new_user` / `reason` |
| `premium.granted`                                                         | web + bot               | `account_id`, `telegram_id` (bot), `days`, `plan` (bot), `method` (bot), `source`                                      |
| `premium.checkout.*`, `premium.payment.*`, `premium.grant.failed`         | bot                     | `account_id`, `telegram_id`, `plan`, `method`, `reason`                                                                |
| `premium.automation.run`                                                  | web                     | `members`, `errors`                                                                                                    |
| `cron.run`                                                                | web (all `/api/cron/*`) | `job`, `method`, `route`, `status`, `outcome`                                                                          |
| `http.server.request` (histogram) + `app.error`                           | web                     | `method`, `route`, `status`, `request_id`, `kind`, `account_id`                                                        |
| `telegram.command`, `ton.*`, `app.started`, `app.error`, `db.unavailable` | bot                     | `command`, `telegram_id`, `reference`, `error_type`, …                                                                 |

Only account/telegram ids are exported — never emails, usernames, tokens or payment details. Locally, no OTLP endpoint is configured, so only the structured console events are produced (no connection errors).

## Tests

```bash
bun run test
```

Unit tests plus integration tests (`*.integration.test.ts`) that run the real services against a fresh seeded in-memory Postgres per suite, so they need no database, network or Docker.

```bash
bun run smoke
```

Starts the app in mock mode, requests every page route and fails if any of them returns a server error. Point it at a server you already run with `SMOKE_URL=http://localhost:5173 bun run smoke`.

## UI Styling and Mobile Optimization

The application uses a dark editorial interface inspired by operational field notes: midnight-ink surfaces, parchment-toned rules, serif hierarchy and carefully reserved amber feedback. It remains optimized for mobile screens with responsive navigation and content layouts.

## Development

- **Removed `.vscode`**: Editor-specific configurations have been removed to ensure consistency across different development environments.
- **Bun Workflow**: All scripts and package management now exclusively use Bun. Use `bun`, not `yarn` (or `npm`), for installing dependencies and running scripts.

## Contributing

Feel free to fork the repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.
