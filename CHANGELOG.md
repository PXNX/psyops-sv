# Changelog

All notable changes to PsyOps will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
