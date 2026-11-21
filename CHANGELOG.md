# Changelog

All notable changes to PsyOps will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Bump all dependencies to their latest versions; pin TypeScript to 6.0.3 (7.x breaks
  svelte-kit sync with `ts.sys` errors)
- `/api/cron/*` routes moved out of the `(authenticated)` route group (URLs unchanged) so
  the scheduler reaches them without a session; they are gated by `CRON_SECRET` only

### Added

- Civilian manpower: recruiting a unit draws people from its home region, and
  a region without enough spare civilians above the population floor cannot raise it
- Civilian workers fill factories' free shifts each week, earning wages from the
  company budget, generating revenue and paying income tax into the state treasury
- Civilian supply: food, electricity, heat and water are now basic needs that
  regions must meet for their people. Shortages from blockades, grid attacks,
  cold terrain and poisoned water sour opinion and stability and, when severe,
  kill or drive out civilians; water is also drawn by water-hungry companies,
  whose output throttles when the region runs dry. The region page shows each
  need as a share of demand met
- State debt: bond principal is recorded as debt on the treasury and cleared when
  the bond is repaid or the state is bailed out; the balance and debt show on the
  state dossier and the finance desk
- Bailouts: a president or economy minister can transfer treasury funds to another
  state, clearing its debt and winning over its civilians; the aid, the debt
  relieved and the goodwill gained are all shown on the recipient's dossier
- Civilian stances toward foreign states: declaring war and striking civilians turn
  a population against the aggressor, aid turns it friendly, and both are shown on
  the state dossier and economy page
- One-off field notes explaining a first company and a first presidency, shown once
  on the company dossier and the state dossier respectively
- Civilian opinion now drives a derived regime stability score (0–100): war crimes,
  environmental policy, conscription pressure, education, wages, cyberattacks and
  propaganda all move it, and defending the homeland rallies support. The least
  stable belligerent sets how much war weariness a war can absorb
- Weekly population tick grows or shrinks each region's civilians from births and
  mortality (war, environment, conscription, emigration), respecting the population floor
- Five-domain warfare: air, land, sea, space and cyber. Units carry a domain,
  the edge matrix and combined-arms bonus feed into battles, and the README
  documents what each domain can and cannot do
- Naval warfare: frigate, submarine, carrier, landing ship and marine units;
  sea control from coastal fleets; blockades (trade, energy and smuggling
  effects), shore bombardment, amphibious assaults that open real battles,
  sea-lane raids and minelaying
- Space programme: reconnaissance, navigation, comms and early-warning
  satellites with GPS/recon/C2/early-warning bonuses; anti-satellite, uplink
  jamming and orbital sabotage operations with attribution and casus belli
- Artificial intelligence capability (levels 0–5) bought with money, chips and
  rare earths; improves cyber offence/defence, intel fusion, factory output
  and customs detection
- Smuggling: state-run routes and citizen-run cargoes around sanctions and
  blockades, with interception risk, premiums and fines
- Strategic resources (oil, gas, uranium, rare earths, silicon), fuel and
  enriched-uranium refining, fabrication plants for chips and electronics,
  plus geothermal and fusion power and a grid-diversity efficiency bonus
- Vercel Schedules for the game ticks: battles, bloc elections, elections, premium
  automation, proposals and travels run on the cadences declared in `vercel.json` instead
  of an external scheduler

- War-resolution cron (`/api/cron/wars`, hourly) that ends active wars no other
  system would close: recorded surrenders, capitulation (a side left with no regions),
  stalemate (no battle activity for 7 days) and war exhaustion (white peace at 100%).
  Wars track `exhaustion` and `endedReason`; the war page shows the exhaustion bar
  and how the war ended

- Physics-tuned confetti bursts: shared `burst()` util with gravity, drag, tumbling shapes
  and reduced-motion support, wired into the birthday-reward and premium-gift celebrations
- Telegram bot in `bot/` (from [PXNX/ptb-psyops](https://github.com/PXNX/ptb-psyops)): `/login`
  links the Telegram account to a psyops-sv account, `/premium` grants or extends a premium
  membership (mocked for free, or real payment via Telegram Stars / TON)
- Agent rules in `agents.md` (concurrent sessions, committing, git workflow)
- Observability: OpenTelemetry request tracing plus structured, shareable event
  telemetry in the web app and the Telegram bot (`auth.login.*`, `premium.granted`,
  `cron.run`, …), with request IDs and account/Telegram IDs for correlation
- State bonds with fortnightly coupon returns, a bond desk, company earnings
  reports and an earnings dashboard panel
- NATO DTG timestamps across the interface
- UAV artillery spotting, report retention and more varied terrain imagery;
  destructible air-defence radar and SAR-only reconnaissance imagery
- Company dividends (declared payouts, automatic policy, yield) and market
  quotes at the lowest live offer

## [0.0.1] - 2026-07-06

### Added

- Visa system: purchase and manage visas for cross-region travel
- Ability to delete your own account
- Separate tracking of current region and residence
- Additional push notifications for in-game events

### Changed

- Overhauled the posts editor and publishing flow
- Modernized the market trading interface
- Redesigned the political party UI and reworked bloc mechanics
- Simplified the transactions view
- Improved onboarding and navigation across the app
- More expressive war and battle animations
- Prefer bottom sheets for actions, menus and short forms

### Fixed

- Rich text editor stability and build issues
- Training-related bug fixes

## [0.0.1-rc.1] - 2026-06-12

### Added

- Gaming-style UI with mobile optimization
- Mockable REST backend for local development (rest-mock package)
- Mock data for auth, users, elections and wars
- Animations throughout the interface

### Changed

- Migrated the backend to PostgreSQL running on Bun
- Standardized UI patterns and components
- Switched deployment to the Vercel adapter

### Fixed

- Tailwind v4 build error

## [0.0.1-beta.3] - 2026-03-12

### Added

- Standalone Telegram sign-in and sign-up with OAuth2 integration
- Subscribed posts page and notification settings
- Push notifications for chat messages, travel arrival and factory shift completion
- Introduction page and simplified transactions
- Image cropper component with touch support for uploads
- Open Graph and Twitter Card meta tags for shareable pages
- Confetti animations for region selection, party and company creation
- Persistent theme and image loading settings stored in the database

### Changed

- Improved error handling with request IDs
- Moved profile editing to a dedicated settings sub-page

### Security

- Removed hardcoded Telegram bot token in favour of environment variables

## [0.0.1-beta.2] - 2026-03-02

### Added

- State budget management
- Transaction history
- Newspaper subscriptions and statistics
- Push notifications

### Changed

- Redesigned the newspaper experience
- Nicer chat interface
- Require residence to be set

## [0.0.1-beta.1] - 2026-02-19

### Added

- Interactive market chart

### Changed

- Reworked the trade system
- Editor page fixes and refinements

## [0.0.1-alpha] - 2024-12-26

### Added

- Initial release of the PsyOps political simulation platform
- User registration and authentication system
- Interactive regional map with navigation
- Newspaper creation and rich text editor (TipTap)
- Internationalization (i18n) support
- PostgreSQL-backed persistence
- Core UI foundation with reusable components
