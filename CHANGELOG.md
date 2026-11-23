# Changelog

All notable changes to PsyOps will be documented in this file.

Releases are labelled by date and build number (`YYYY-MM-DD.build`), so every
entry says when it shipped rather than implying a semver contract.

## [2026-11-23.2]

### Fixed

- fix(ci): run rstest under Bun's runtime and give builds a DATABASE_URL
- fix(changelog): label releases by date and build number
- fix(ci): align Bun version with the development toolchain

### Changed

- Bump dependencies to latest; keep TypeScript pinned to 6.0.3

## [2026-11-23.1]

### Fixed

- fix(map): end the hex grid before each coast so the EEZ reads as a band of water between shore and hexes
- fix(map): clip coastal hexes to the real shoreline and keep regions visible in naval mode
- fix(mermaid): resolve theme CSS variables to hex so diagrams render with readable colours
- fix(navy): offset the standalone hex-map viewBox so edge hexes are not clipped

### Added

- feat(bloc): defence-spending guideline with member compliance
- feat(bloc): declare and lift trade embargoes
- feat(posts): Mermaid diagrams, polls, comments with upvotes and reports, YouTube players and internal link previews
- feat(users): community karma separate from civilian reputation
- feat(site): history timelines for states, blocs and parties
- feat(site): redesigned about hub with licenses, support and changelog pages
- feat(pwa): app icon, theme-colour sync, notification test and install shortcuts
- feat(changelog): in-app changelog grouped by type and scope
- feat(commander): academy, traits, portraits and ten experience levels
- feat(navy): fleets, airgroups, divisions and battlefield command
- feat(navy): naval landings and paradrops gated on sea/air dominance
- feat(map): larger hexes, sea states and hover conditions
- feat(map): multi-select sea hexes and fleet area assignment
- feat(intel): procedural sea and coastal sensor imagery

## [2026-11-22.1]

### Fixed

- fix(population): keep full precision in a region's share of the grid
- fix(domains): import stateAutonomy used by the domains dashboard
- fix(cyber): type the record date helper used by file templates
- fix(dock): declare personalPromise before the load uses it
- fix(build): build without storage credentials and prerender docs reliably

### Added

- feat(intel): EO/IR sea sweeps from hexes and show all branch units
- feat(map): coast-anchored EEZ hex sea, union airspace and unified Forces page
- feat(air): directable bombing, logistic, naval, transport, recon, refuel and support missions

## [2026-11-21.1]

### Added

- feat(industry): hardware and datacenter chain with power and water constraints
- feat(trade): air and sea lanes, closures and relief convoys
- feat(government): cabinet portfolios, bloc representatives and research fields
- feat(civilians): conscription, hospital strain and basic-need shortages shape population
- feat(cyber): realistic intrusions with cascading attack effects

## [2026-07-06.1]

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

## [2026-06-12.1]

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

## [2026-03-12.1]

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

## [2026-03-02.1]

### Added

- State budget management
- Transaction history
- Newspaper subscriptions and statistics
- Push notifications

### Changed

- Redesigned the newspaper experience
- Nicer chat interface
- Require residence to be set

## [2026-02-19.1]

### Added

- Interactive market chart

### Changed

- Reworked the trade system
- Editor page fixes and refinements

## [2024-12-26.1]

### Added

- Initial release of the PsyOps political simulation platform
- User registration and authentication system
- Interactive regional map with navigation
- Newspaper creation and rich text editor (TipTap)
- Internationalization (i18n) support
- PostgreSQL-backed persistence
- Core UI foundation with reusable components
