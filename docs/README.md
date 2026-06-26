# PsyOps SV — Project Reference for Claude

> **Purpose**: This document gives Claude (or any AI assistant) a complete overview of the project's tech stack, directory structure, conventions, and how to navigate the codebase. Read this first before working on any task.

---

## Tech Stack

| Layer                 | Technology                                                                          | Version / Notes                                                             |
| --------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Runtime**           | [Bun](https://bun.sh)                                                               | Fast JS runtime + package manager. All scripts use `bun`.                   |
| **Framework**         | [SvelteKit](https://kit.svelte.dev)                                                 | Full-stack framework with SSR, file-based routing, form actions.            |
| **UI Library**        | [Svelte 5](https://svelte.dev)                                                      | Runes mode (`$props`, `$state`, `$derived`, `$effect`).                     |
| **Styling**           | [Tailwind CSS v4](https://tailwindcss.com)                                          | Utility-first. Uses `@theme`, `@utility`, `@layer` directives.              |
| **Component Library** | [DaisyUI v5](https://daisyui.com)                                                   | Tailwind plugin — provides `btn`, `card`, `modal`, etc. Dark theme default. |
| **Database**          | PostgreSQL                                                                          | Managed via Drizzle ORM.                                                    |
| **ORM**               | [Drizzle ORM](https://orm.drizzle.team)                                             | Type-safe SQL builder. Schema in `src/lib/server/schema.ts`.                |
| **Auth**              | Google OAuth + Telegram OAuth                                                       | Session-based via cookies. Arctic library for OAuth flows.                  |
| **Validation**        | [Valibot](https://valibot.dev) + [Superforms](https://superforms.rocks)             | Schema validation + SvelteKit form handling.                                |
| **i18n**              | [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)            | Compile-time i18n. Messages in `messages/en.json`, `messages/de.json`.      |
| **Icons**             | [unplugin-icons](https://github.com/unplugin/unplugin-icons)                        | Auto-imports from Fluent, MDI, Logos icon sets. `~icons/fluent/...`         |
| **Rich Text**         | [TipTap v3](https://tiptap.dev) + ProseMirror                                       | WYSIWYG editor for articles.                                                |
| **File Storage**      | Backblaze B2 (S3-compatible)                                                        | Logos, images. Signed URLs via `$lib/server/backblaze`.                     |
| **Deployment**        | [Vercel](https://vercel.com)                                                        | Uses `@sveltejs/adapter-vercel`.                                            |
| **Testing**           | [RSTest](https://rstest.dev)                                                        | Rust-based test runner. Config in `rstest.config.ts`.                       |
| **Charts**            | [LayerChart](https://layerchart.com) + [SveltePlot](https://svelteplot.dev)         | Data visualization.                                                         |
| **Maps**              | [Leaflet](https://leafletjs.com) + [Sveaflet](https://github.com/sveaflet/sveaflet) | Interactive world map.                                                      |

---

## Directory Structure

```
psyops-sv/
├── docs/                          # ← YOU ARE HERE. Spec sheets & guides
├── messages/                      # i18n message files (en.json, de.json)
├── migrations/                    # SQL migration files
├── packages/
│   └── rest-mock/                 # Mock REST API server for dev
├── static/                        # Public assets (icons, fonts, images)
│   ├── units/                     # Military unit SVG icons
│   └── fonts/                     # HPSimplified font
├── tools/                         # Dev tools (map SVGs, region data scripts)
├── src/
│   ├── app.css                    # Global styles (gaming theme, utilities)
│   ├── app.html                   # HTML shell
│   ├── app.d.ts                   # Global type declarations
│   ├── hooks.server.ts            # Server hooks (auth, rate-limit, i18n)
│   ├── hooks.ts                   # Client hooks
│   ├── service-worker.js          # PWA service worker
│   ├── lib/
│   │   ├── config/                # Game constants & configuration
│   │   │   ├── index.ts           # Barrel export
│   │   │   ├── game/
│   │   │   │   ├── military.config.ts
│   │   │   │   ├── combat.config.ts
│   │   │   │   ├── economy.config.ts
│   │   │   │   └── buildings.config.ts
│   │   │   └── features/
│   │   │       └── party.config.ts
│   │   ├── component/             # Reusable Svelte components
│   │   │   ├── PageContainer.svelte
│   │   │   ├── PageHeader.svelte
│   │   │   ├── SectionCard.svelte
│   │   │   ├── Modal.svelte
│   │   │   ├── Logo.svelte
│   │   │   ├── EmptyState.svelte
│   │   │   ├── ProfileItem.svelte
│   │   │   ├── TravelProgress.svelte
│   │   │   ├── edit/              # Edit-mode components
│   │   │   └── ...
│   │   ├── server/                # Server-only code
│   │   │   ├── schema.ts          # Drizzle DB schema (ALL tables)
│   │   │   ├── db.ts              # Database connection
│   │   │   ├── auth.ts            # Session management
│   │   │   ├── backblaze.ts       # File storage (S3)
│   │   │   ├── rate-limit.ts      # Token bucket rate limiter
│   │   │   ├── taxes.ts           # Tax calculation helpers
│   │   │   └── service/           # Business logic services
│   │   ├── utils/                 # Shared utility functions
│   │   │   └── formatting.ts      # Date/number formatting
│   │   ├── paraglide/             # Generated i18n code (DO NOT EDIT)
│   │   └── themes.ts              # Theme configuration
│   └── routes/                    # SvelteKit file-based routing
│       ├── +layout.svelte         # Root layout (minimal shell)
│       ├── +layout.server.ts      # Root server layout (session)
│       ├── +error.svelte          # Error page
│       ├── (authenticated)/       # Requires login
│       │   ├── (dock)/            # Bottom nav dock layout
│       │   │   ├── +layout.svelte # Dock nav bar
│       │   │   ├── +page.svelte   # Dashboard (home)
│       │   │   ├── battle/[id]/   # Battle detail
│       │   │   ├── war/[id]/      # War detail
│       │   │   ├── user/[id]/     # User profile + career
│       │   │   ├── state/[id]/    # State detail
│       │   │   ├── region/[id]/   # Region detail
│       │   │   ├── party/         # Party list + detail + create
│       │   │   ├── company/       # Company list + detail + create
│       │   │   ├── factory/       # Factory detail + create
│       │   │   ├── market/        # Marketplace
│       │   │   ├── training/      # Military unit training
│       │   │   ├── production/    # Resource → Product crafting + jobs
│       │   │   ├── chat/          # Global, state, party, DM chat
│       │   │   ├── inbox/         # Private messages
│       │   │   ├── newspaper/     # Newspaper list + detail + create
│       │   │   ├── posts/         # Article feed
│       │   │   ├── map/           # World map (Leaflet)
│       │   │   ├── bloc/          # Bloc (alliance) management
│       │   │   ├── visas/         # Visa applications
│       │   │   ├── transactions/  # Transaction history
│       │   │   ├── giftcode/      # Gift code redemption
│       │   │   ├── settings/      # User settings + profile edit
│       │   │   └── moderators/    # Moderation panel
│       │   ├── (fullscreen)/      # No dock nav
│       │   │   ├── posts/         # Article editor (new/edit)
│       │   │   └── welcome/       # Onboarding flow
│       │   ├── api/               # Auth'd API routes
│       │   │   └── travel/        # Travel arrival endpoint
│       │   └── report/            # Report submission
│       ├── (unauthenticated)/     # Public routes
│       │   ├── auth/              # Login, logout, OAuth callbacks
│       │   └── test/              # TipTap editor test page
│       ├── api/                   # Public API routes
│       │   └── push/              # Push notification endpoints
│       ├── admin/                 # Admin panel (giftcode, broadcast)
│       ├── moderation/            # Moderation dashboard
│       └── docs/                  # In-app documentation
```

---

## Key Conventions

### Routing Pattern

SvelteKit file-based routing with route groups:

- `(authenticated)` — Requires `locals.account`. Checked in `+layout.server.ts`.
- `(dock)` — Shows bottom navigation dock. Most game pages live here.
- `(fullscreen)` — No dock. Used for editors and onboarding.
- `(unauthenticated)` — Public pages (login, etc.).

### Data Flow

```
+page.server.ts (load)  →  data  →  +page.svelte (renders UI)
+page.server.ts (actions)  ←  form submit  ←  +page.svelte
```

- **`load` functions** fetch data from DB via Drizzle and return it as props.
- **`actions`** handle form submissions (POST). Use `fail()` for errors, return objects for success.
- No separate API layer — all data flows through SvelteKit's load/action pattern.

### Database Access

```typescript
import { db } from "$lib/server/db";
import { tableName } from "$lib/server/schema";
import { eq, and, desc } from "drizzle-orm";

// Query
const result = await db.query.tableName.findFirst({ where: eq(tableName.column, value) });

// Insert
await db.insert(tableName).values({ ... });

// Update
await db.update(tableName).set({ ... }).where(eq(tableName.id, id));

// Transaction
await db.transaction(async (tx) => { ... });
```

### Component Patterns

- All components use **Svelte 5 runes**: `$props()`, `$state()`, `$derived()`.
- Layout components: `PageContainer`, `PageHeader`, `SectionCard`.
- Icons: `import FluentXxx from "~icons/fluent/icon-name"`.
- Forms: Native `<form method="POST" action="?/actionName">` with SvelteKit enhance.

### Config Access

```typescript
import { MILITARY_UNIT_TEMPLATES, COMBAT_CONFIG, ECONOMY_CONFIG } from "$lib/config";
```

All game constants are centralized in `$lib/config/`. Never hardcode game values.

### Styling

- **Tailwind CSS v4** with custom `@utility` classes (see `app.css`).
- Gaming theme utilities: `gaming-card`, `gaming-button`, `gaming-input`, `gaming-badge`, `gaming-header`.
- DaisyUI components: `btn`, `btn-primary`, `modal`, `card`, `badge`, etc.
- Mobile-first responsive: Default = mobile, use `sm:`, `md:`, `lg:` for larger screens.

---

## How to Work on This Project

### Before Making Changes

1. Read the relevant **spec sheet** in `docs/SPEC_*.md` to understand the domain.
2. Read the **UI Style Guide** in `docs/UI_STYLE_GUIDE.md` for visual conventions.
3. Check the **schema** in `src/lib/server/schema.ts` for table definitions.
4. Check the **config** in `src/lib/config/` for game constants.

### File Naming

- Route pages: `+page.svelte`, `+page.server.ts`
- Layouts: `+layout.svelte`, `+layout.server.ts`
- Components: `PascalCase.svelte` in `src/lib/component/`
- Config files: `kebab-case.config.ts`
- Services: `camelCase.ts` in `src/lib/server/service/`

### Common Tasks

| Task               | Command                   |
| ------------------ | ------------------------- |
| Dev server         | `bun dev`                 |
| Dev with mock data | `bun dev:mock`            |
| Build              | `bun run build`           |
| Type check         | `bun run check`           |
| Run tests          | `bun test`                |
| Format             | `bun run format`          |
| DB migrations      | `bun drizzle-kit migrate` |
| Generate i18n      | `bun run i18n`            |

### Environment Variables

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TELEGRAM_BOT_TOKEN=...
DATABASE_URL=postgresql://...
BACKBLAZE_KEY_ID=...
BACKBLAZE_APP_KEY=...
BACKBLAZE_BUCKET_ID=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

---

## Spec Sheet Index

| Document                                                     | Covers                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| [`SPEC_BATTLE_AND_WAR.md`](./SPEC_BATTLE_AND_WAR.md)         | Wars, battles, combat system, military units, terrain    |
| [`SPEC_USER_AND_AUTH.md`](./SPEC_USER_AND_AUTH.md)           | Accounts, profiles, sessions, OAuth, wallets             |
| [`SPEC_STATE_AND_POLITICS.md`](./SPEC_STATE_AND_POLITICS.md) | States, blocs, elections, parliament, proposals, taxes   |
| [`SPEC_ECONOMY.md`](./SPEC_ECONOMY.md)                       | Companies, factories, workers, production, market        |
| [`SPEC_GEOGRAPHY.md`](./SPEC_GEOGRAPHY.md)                   | Regions, borders, travel, residency, map                 |
| [`SPEC_MESSAGING.md`](./SPEC_MESSAGING.md)                   | Chat (global/state/party/DM), inbox, blocking            |
| [`SPEC_MEDIA.md`](./SPEC_MEDIA.md)                           | Newspapers, journalists, articles, upvotes               |
| [`SPEC_MODERATION.md`](./SPEC_MODERATION.md)                 | Reports, warnings, restrictions, bans, content flags     |
| [`SPEC_IMMIGRATION.md`](./SPEC_IMMIGRATION.md)               | Visas, border control, sanctions, residency applications |
| [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md)                   | Visual design system, mobile patterns, component usage   |
