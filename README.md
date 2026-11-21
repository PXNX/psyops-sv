# Psyops

A SvelteKit application with Google OAuth, PostgreSQL and Bun, presented through a dark editorial field-ledger interface and optimized for mobile devices.

**Psyops** stands for _psychological operations_ — the name reflects the game's focus on influence, deception and intelligence as much as on combat. **Psyops** is a World War III simulation: players run a state through a global conflict across land, sea, air, space and cyber, managing industry, diplomacy, covert action and information warfare while the world's armies fight.

## Features

- **Google OAuth**: Secure authentication via Google.
- **Telegram bot**: [@BotFather-style auth linking and premium purchases](bot/README.md) — `/login` and `/premium` via a long-polling bot in `bot/` that talks to the same Postgres database.
- **PostgreSQL**: Robust and scalable database management using Drizzle ORM.
- **Bun**: Fast JavaScript runtime and package manager.
- **Editorial field-ledger UI**: A restrained midnight-ink interface with parchment rules, serif headings and amber interaction cues. State and region dropdowns show the corresponding coat of arms.
- **Player-driven cyber & psyops**: Under `/ops/network`, a state's leadership plants assets inside a target, probes its sites, watches the security cameras of power plants and air bases, copies sensitive files into a dossier and covers tracks before the asset's heat burns it. Intrusions are interactive: scan a host, pick an exposed service, escalate, pivot into the right segment, then tap cameras, copy files or deploy a cyber payload. Live footholds improve the odds of ordinary operations in `/ops`.
- **Cascading cyber effects**: communications intercept sharpens recon and gives strike planners the target's true order of battle; air-defence spoofing blinds radars so drones and strikes get through; supply-chain attacks throttle factory output. Grid and C2 attacks still brown out industry and jam sensors.
- **Mobile Optimized**: Responsive layout for seamless experience across devices.
- **Five-domain warfare**: Land, sea, air, space and cyber all shape the same war, from amphibious landings to GPS-guided strikes. See [Five domains](#five-domains).
- **Cabinet and research**: presidents and paired minister portfolios run the state, blocs add High Representatives, and research buys lasting advantages in health, defence, AI, power and industry. See [Cabinet and research](#cabinet-and-research).

## Five domains

Every action in the game belongs to one of five domains. The first three fight;
the last two decide how well the first three see, communicate and strike.

| Domain       | What it does                                                                 | What it cannot do                                                |
| ------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 🪖 **Land**  | Takes and holds regions, digs into terrain, cheapest boots on the ground     | Cannot cross water without the navy; slow to redeploy            |
| ⚓ **Sea**   | Blockades coasts, raids shipping, bombards shore positions and lands marines | Only projects power onto the coast; vulnerable to land-based air |
| ✈️ **Air**   | Deep strikes on industry, reconnaissance, interdiction                       | Needs fuel and airfields; cannot hold ground                     |
| 🛰️ **Space** | GPS precision, wide-area recon, early warning, ASAT and uplink attacks       | No direct combat power; constellations are fragile               |
| 🕸️ **Cyber** | Grid, C2 and treasury attacks, influence and deception                       | No territorial control; effects expire and can be traced         |

**Combined arms.** Units carry a domain (`domains.config.ts`). Air has an edge
against ships, sea power softens coastal defenders, and land forces with good
air defence blunt air attack. A side fielding land, sea _and_ air units gets a
combined-arms bonus in every battle, so a one-domain army is brittle even when
it is large.

**Sea power.** Six hull types (frigate, submarine, carrier, landing ship, plus
marines for the land domain) can be trained like any other unit. Hulls in a
coastal port generate sea control, which drives five naval operations:
blockade (cuts the target's trade, energy imports and smuggling), shore
bombardment, amphibious assault (opens a real battle without a land border),
sea-lane raid (seizes treasury) and minelaying. See `naval.config.ts` and
`services/military/naval.ts`.

**Fleet at sea (`/navy`).** The strategic operations above now have a spatial
layer. The ocean is a bounded axial hex grid; ships steam one hex per leg, burn
fuel, and can be refuelled and loaded at **ports** or built and repaired through
the **dock queue** (`/api/cron/fleet` advances every leg, job and engagement).
A coastal region claims an EEZ — two hex rings of offshore water — and can
hold exactly one port, placed on the nearest free hex inside that zone; ports
and docks expand by level (more fuel storage, more build bays). The hex grid
and EEZs are drawn inside the world SVG on `/map`, clipped to the real
coastline (only water hexes inside a coastal state's EEZ are shown) and
selectable by tap — the selected hex opens its owner, ships, mines and port,
with a link into the fleet console. The map has three modes: **naval** (sea
and coasts only), **land** (regions and forces) and **aerial** (hexes and
regions grouped into Luftraum sectors). Hulls come in four families: capital ships (carrier with fighters, VLS frigate,
ASW helipad cruiser), escorts (support ship, corvette, destroyer, light AA and
a GNSS jammer), submarines (torpedo and VLS) and civilians (container ship,
Ro-Ro ferry, tanker). Minefields can be laid from frigates and submarines:
merchant hulls refuse to enter a mined hex, so a ring of mines blockades a
port, while warships that push through take damage. Hostile fleets in range
exchange fire using each class's weapons — fighters, VLS, ASW helicopters,
light guns, light AA and torpedoes.

**Air arm and progression.** Seven squadron types can be trained — transport,
bomber, tanker aircraft, fighter jet, close air support, naval bomber and
helicopter. Each has a role (airlift, bombing, refuelling, air superiority,
close support, naval strike, ASW), burns fuel on sorties and in battle, and
gains experience from exercises and combat; veterans hit harder. Squadrons can
be tasked directly with strategic bombing, logistic strikes, naval bombing,
airlift, reconnaissance, refuelling and battlefield support from the `/navy`
console — each has a target, flight time, fuel cost and effect. Naval bombers
and helicopters can strike enemy ships from coastal airfields, and the aerial
map mode counts aircraft in each Luftraum sector.

**Sea intel.** Sonar sweeps, maritime patrol radar and satellite SAR target a
hex. Sonar is the only sensor that reliably finds submarines; radar sees
surface hulls and mines. Fresh reports expire after 12 h and drive the map's
fog of war — enemy ships stay hidden until a pass sees them.

**GNSS jamming.** Satellite navigation can be denied from all three domains: a
GNSS jammer ship at sea, air-defence battalions ashore, and fighter squadrons
carrying EW pods in the air. Jamming is summed per hex from every hostile
emitter in range; a jammed ship steams slower and its weapons miss more often.
The effect is shared by the planner and the resolver in `fleet.config.ts` and
`services/military/fleet.ts`.

**Space.** States build constellations of reconnaissance, navigation, comms
and early-warning satellites. Navigation satellites sharpen GPS/laser strikes,
recon satellites improve the intel picture, comms satellites resist C2
disruption and early warning reduces strike casualties. Rivals can blind them
with ASAT strikes, uplink jamming or orbital sabotage, and attribution hands
the victim a casus belli. See `space.config.ts` and `services/military/space.ts`.

**AI.** A state's AI level (0–5) is bought with treasury, chips and rare earths.
It adds a little cyber offence and defence, intel fusion, factory efficiency
and customs detection at every level. See `ai.config.ts` and
`services/military/ai.ts`.

**State debt and bailouts.** Bond principal is carried as state debt until it is
repaid. A president or economy minister can bail out another state from their own
treasury: the aid lands in the recipient's account, clears its debt first, and
makes that state's civilians view the donor more favourably. War declarations and
strikes on civilians sour their stance toward the aggressor. See
`civic.config.ts` and `services/economy/bailout.ts`.

**Smuggling.** Sanctions and blockades create a shadow economy: states open
routes for chips, fuel, rare earths, uranium and weapons, and citizens run
cargo along them. Interception rises with sanctions, blockades, enforcement
and naval patrols; a delivered run pays a premium, a seized one pays a fine.
See `smuggling.config.ts` and `services/economy/smuggling.ts`.

**Supply chains and logistics.** Every region has a carrying capacity from
its infrastructure, borders, port and terrain. Units and factories draw on it;
strikes on bridges, cyber disruption of supplies and naval blockades throttle
it. The resulting supply factor weakens combat output, burns unit supply
faster each round and cuts factory shifts. Smuggled cargo lands in the
destination's strategic stockpile, and seized cargo pays a fine to the
intercepting state. See `logistics.config.ts` and `services/military/logistics.ts`.

**Convoys and repairs.** Leaders can dispatch relief convoys between their own
regions: escorts from the fleet cut interception risk, and a delivered cargo
temporarily raises the destination's carrying capacity. Strategic strikes can
knock down infrastructure for good, but it can be rebuilt with treasury and
machine tools. See `services/military/convoys.ts`.

**Supply autonomy.** Factory inputs are sourced from the state's own stockpile
or producers first, then bloc partners, then paid trade lanes. Domestic supply
runs a line at full output; bloc and trade inputs cost efficiency, and a
blockade or closure throttles the lanes further. Goods nobody can supply leave
a line limping and degrade its quality, so self-sufficient industry — or
reliable bloc partners — is worth far more than fragile imports. See
`autonomy.config.ts` and `services/economy/autonomy.ts`.

**Air and sea trade.** States open air corridors and sea lanes that pay
treasury every six hours. A rival can close its airspace or declare an EEZ
closure (globally or against one state), grounding air freight, choking
shipping, making smuggling riskier and stopping intruding aircraft. Naval
blockades throttle sea lanes as well. See `trade.config.ts` and
`services/economy/trade.ts`.

**Industrial equipment and learning.** A new plant cannot be built without
machine tools (and a fabrication line needs specialized fab equipment), both
made first in an equipment plant. Plants gain efficiency with every clean,
supplied shift and lose it when inputs, tools, power or transport fail; quality
follows efficiency and directly scales output. Strikes and blockades therefore
have a lasting effect long after their immediate damage. See
`equipment.config.ts`.

**Resources, energy and chips.** Mines can now produce oil, gas, uranium,
rare earths and silicon in the regions that have them. Refineries turn oil into
fuel and uranium into enriched uranium; new fabrication plants turn silicon
and rare earths into chips, then electronics. Power plants include geothermal
and fusion alongside coal, gas, nuclear, solar, wind and hydro, and a diverse
grid runs more efficiently than a single-source one. See `energy.config.ts`,
`industry.config.ts` and `resources.config.ts`.

**Regional energy, grids and fuel policy.** Power plants are no longer bought
as an instant line item. A leader sites each plant in a region and it is built
over days from domestic steel, copper and strategic materials plus imported
components bought at fixed world-market prices (a blockade makes those
components 35% dearer). Where it stands decides what it produces: solar peaks
in deserts and low latitudes, wind on coasts and plains, hydro needs water or
a mountain valley, and geothermal needs the right geology. A region's
**grid-network level** is its transmission and distribution system — every
plant needs one, bigger plants need more, and output beyond the grid's capacity
is curtailed. **Battery storage** adds dispatchable capacity and smooths the
dips of solar and wind. Both are built through the ordinary construction
office. Each day the energy tick burns plant fuel, charges upkeep from the
treasury, and splits refined fuel between **civilian heating, a military reserve
that funds naval operations, and export** for treasury, according to a
president's or economy minister's policy. See `energy.config.ts`,
`allocation.config.ts`, `buildings.config.ts` and
`services/economy/energy.ts`; the controls live at `/state/[id]/energy`.

## Cabinet and research

A state is run by a **president** and four **ministers**, each covering a pair
of ministries: **Science & Health**, **Economy & Energy**, **Foreign & Trade**
and **Defence & Interior**. A person may hold several ministries — even from
different portfolios — without giving up any of them. A bloc has a leader and
four **High Representatives** mirroring the same portfolios; a representative
speaks for their own field, while the leader speaks for the whole bloc. The
offices, their titles and the ministry mapping live in `government.config.ts`,
and `services/government/authority.ts` derives every office a player holds
from one place.

**Research** (`research.config.ts`) is the long game behind the domains.
Fourteen fields — public health, antivirus and bio-defence, pharmaceuticals,
power efficiency, production methods, fabrication, AI, trade networks, supply
chains, land/air/naval defence, space systems and interior security — advance in
levels. Each field has a rising treasury cost and a few fields require another
field first, so a state has to choose what to study. Levels give a compounding
bonus to the matching domain: healthier civilians, better epidemic defences,
cheaper power, more factory output, sharper AI and space systems. Presidents
and the minister responsible for a portfolio can fund a field; the treasury is
charged and every level is recorded in the government ledger
(`services/government/research.ts`). Labs and a good AI programme also bank
research points for the daily tick.

## Civilians, opinion and regime stability

Every region holds a civilian population on top of its buildings
(`population.config.ts`). What a state does to those civilians is gathered into
a **regime stability** score (0–100), derived on read by
`services/stability.ts` from the rules in `stability.config.ts`:

- **Civilian opinion** in each region — civic projects, state services,
  fortifications and strike casualties — is the backbone.
- **War crimes** (the decaying IHL score) and **cyberattacks** (active grid,
  C2, supply and radar disruption) pull it down.
- **Environmental policy**: conservation buys goodwill, unrestricted
  extraction costs it.
- **Conscription pressure**: a large standing army relative to the population
  means more draftees and less support at home.
- **Education** and **good factory wages** buy backing; enemy propaganda erodes
  it and your own counter-propaganda steadies it.
- **Rally-round-the-flag**: defending against an attack grants a base bonus.
- **Basic supplies**: food, electricity, heat and water are things civilians
  actually need. A region's land, imports, share of the state grid and water
  infrastructure decide how much of each reaches its households; a blockade,
  a degraded grid or unrestricted extraction that poisons the water table all
  cause shortages. Unmet needs cost opinion and stability, and severe hardship
  raises mortality and drives emigration. Water is shared with industry —
  steel, refineries and fabrication plants draw on the same supply and throttle
  when it runs short. See `civilian-supply.config.ts` and
  `services/civilians/supply.ts`.

Stability is not cosmetic: the least stable belligerent sets how much war
weariness a war can absorb, so an unstable regime is forced to the peace table
sooner. A weekly cron (`/api/cron/population`) moves the population itself —
births against mortality from war, harsh extraction, conscription and
instability-driven emigration. Strike casualties are applied at once by
`reduceRegionPopulation`, and a floor keeps a region from ever emptying fully.

Civilians are also the workforce and the army. Raising a unit pulls a fixed
number of people out of its home region (`manpower.config.ts`), so a large
standing army drains the same pool that works the factories — and pushes the
conscription pressure that sours stability. Each week, every factory fills the
shifts its player roster cannot with civilians from its region: the company
earns revenue from their output, pays them out of its budget, and the state
takes income tax on their wages (`services/economy/civilian-work.ts`,
`/api/cron/workforce`). A company that cannot pay employs fewer people; a
region whose people have been drafted or killed has fewer to give.

Conscription is not a free army. The share of a state's people under arms
defines the band it lives under — volunteer, limited, general or total war —
and a drafted population works less, has fewer children and dies more often
(`conscription.config.ts`). Healthcare is the other limit: wounded soldiers,
recent strike casualties, grid blackouts caused by a hack and disrupted medical
supplies all consume hospital capacity. When hospitals are overwhelmed, extra
civilians die, fewer are born, fewer are well enough to work and the government
is blamed for it. Both pressures are derived on read in
`services/civilians/pressure.ts` and feed the population tick, the workforce
and regime stability together.

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
| `fleet`          | `/api/cron/fleet`          | every 15 min  | Advances ship movements, dock queues, engagements, port fuel and minefields  |
| `population`     | `/api/cron/population`     | weekly        | Advances regional civilian populations from births and mortality             |
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

## Tutorials

The documentation in `src/lib/docs/` (English only, reachable under `/docs`) is
grouped into Getting started, Everyday life & economy, Politics & state,
Conflict & forces and Reference. It covers the whole game — economy, society,
politics, community, conflict, intelligence, naval warfare, air power and map
modes. Each guide has a "Deep dive" section quoting the exact costs, durations,
damage values, odds and formulas from the corresponding `config.ts` file, plus
worked examples. On `/navy` and `/map` an **interactive** tour opens on the first visit:
it highlights the real control for each step and advances when you use it (with
a manual fallback); progress is stored in the browser. Tours are launched from
your profile, the docs index or the relevant docs page with `?tutorial=navy`,
`?tutorial=air` or `?tutorial=map` — there is no floating help button. The docs are the technical explanation behind those steps and
include Mermaid flowcharts/sequence diagrams and SVG illustrations under
`static/images/docs/`.

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
