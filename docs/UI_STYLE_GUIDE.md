# UI Style Guide

> Design system and conventions for building modern, mobile-friendly game UI in PsyOps SV.

---

## Design Philosophy

PsyOps SV uses a **dark, futuristic gaming aesthetic** with **neon cyan accents**. The UI should feel like a military command interface — clean, data-dense, but readable. Every page must be **mobile-first** since most players will be on phones.

**Core principles:**

1. **Mobile-first** — Design for 375px width first, then scale up.
2. **Dark theme** — Slate/gray backgrounds, white text, cyan/purple accents.
3. **Data density** — Show useful information upfront, don't hide behind tabs.
4. **Touch-friendly** — Minimum 44px tap targets, generous spacing.
5. **Fast** — Minimal animations, no heavy assets, instant feedback.

---

## Color Palette

| Role                 | Color                            | Tailwind Class                         | Usage                           |
| -------------------- | -------------------------------- | -------------------------------------- | ------------------------------- |
| **Background**       | `#0f172a` → `#1a1f3a`            | `bg-slate-950`, `bg-slate-900`         | Page background (gradient)      |
| **Card surface**     | `slate-900/80` to `slate-950/80` | `gaming-card` utility                  | All cards, panels               |
| **Primary accent**   | Cyan `#00ffff`                   | `text-cyan-300`, `border-cyan-500`     | Headers, values, active states  |
| **Secondary accent** | Purple `#8b5cf6`                 | `text-purple-400`, `border-purple-500` | Gradients, secondary highlights |
| **Success**          | Emerald `#10b981`                | `text-emerald-400`                     | Positive values, confirmations  |
| **Warning**          | Amber `#f59e0b`                  | `text-amber-400`                       | Caution states                  |
| **Danger**           | Red `#ef4444`                    | `text-red-400`                         | Errors, destructive actions     |
| **Text primary**     | White                            | `text-white`                           | Headings, important text        |
| **Text secondary**   | Gray 300–400                     | `text-gray-300`, `text-gray-400`       | Body text, descriptions         |
| **Text muted**       | Gray 500                         | `text-gray-500`                        | Timestamps, metadata            |

### Semantic Color Coding (used in broadcasts, factions, etc.)

| Context        | Background          | Border                  | Icon Color         |
| -------------- | ------------------- | ----------------------- | ------------------ |
| System / Admin | `bg-red-600/10`     | `border-red-500/20`     | `text-red-400`     |
| State          | `bg-purple-600/10`  | `border-purple-500/20`  | `text-purple-400`  |
| Party          | `bg-emerald-600/10` | `border-emerald-500/20` | `text-emerald-400` |
| Attacker       | `bg-red-600/10`     | `border-red-500/20`     | `text-red-400`     |
| Defender       | `bg-blue-600/10`    | `border-blue-500/20`    | `text-blue-400`    |

---

## Typography

| Element         | Classes                                       | Notes                |
| --------------- | --------------------------------------------- | -------------------- |
| Page title      | `text-2xl sm:text-3xl font-bold text-white`   | Via `PageHeader`     |
| Section heading | `text-xl font-bold text-white`                | Inside `SectionCard` |
| Stat value      | `text-lg font-bold text-cyan-300`             | `gaming-stat-value`  |
| Body text       | `text-sm text-gray-300`                       | Default content      |
| Label           | `text-xs font-medium uppercase tracking-wide` | Meta labels          |
| Timestamp       | `text-xs text-gray-500`                       | Dates, times         |

**Font:** `HPSimplified` (custom) → system-ui → sans-serif fallback.

---

## Custom Gaming Utilities

Defined in `app.css` as `@utility` directives. Use these instead of building from scratch.

### `gaming-card`

The primary container for content sections.

```html
<div class="gaming-card rounded-xl p-4 sm:p-6">
	<!-- content -->
</div>
```

- Gradient background (slate-900 → slate-950)
- Cyan border glow (`border-cyan-500/30`)
- Backdrop blur
- Subtle inner glow

### `gaming-card-hover`

Card with hover effects. For clickable cards/links.

```html
<a href="/state/1" class="gaming-card gaming-card-hover rounded-xl p-4">
	<!-- content -->
</a>
```

### `gaming-button`

Primary action button with neon styling.

```html
<button class="gaming-button">Deploy Units</button>
```

- Cyan-to-purple gradient
- Neon glow on hover
- Lift effect on hover (translateY -2px)
- Press effect on click

### `gaming-input`

Styled form input.

```html
<input type="text" class="gaming-input w-full p-3" placeholder="Unit name" />
```

### `gaming-badge`

Small inline label.

```html
<span class="gaming-badge">Active</span>
```

### `gaming-header`

Text with neon text-shadow.

```html
<h2 class="gaming-header text-xl">Battle Status</h2>
```

### `gaming-stat` / `gaming-stat-value`

Stat display row.

```html
<div class="gaming-stat">
	<span class="text-gray-400">Organization</span>
	<span class="gaming-stat-value">87%</span>
</div>
```

### `gaming-progress` / `gaming-progress-bar`

Progress bar.

```html
<div class="gaming-progress">
	<div class="gaming-progress-bar" style="width: 75%"></div>
</div>
```

---

## Layout Components

### PageContainer

Wraps page content with max-width and padding.

```svelte
<PageContainer maxWidth="4xl">
	<!-- page content -->
</PageContainer>
```

Use `maxWidth`: `"sm"`, `"md"`, `"lg"`, `"xl"`, `"2xl"`, `"4xl"`.

### PageHeader

Page title with optional icon, subtitle, and action buttons.

```svelte
<PageHeader title="Battle #42" subtitle="War for Corsica" icon={FluentMilitaryHelmet} />
```

### SectionCard

A `gaming-card` with consistent padding and border radius.

```svelte
<SectionCard>
	<h2 class="text-xl font-bold text-white mb-4">Units</h2>
	<!-- section content -->
</SectionCard>
```

### EmptyState

Shown when a list has no items.

```svelte
<EmptyState icon={FluentPeople} title="No party members" description="Be the first to join!" />
```

### Logo

Renders a user/party/state logo with fallback icon.

```svelte
<Logo src={logoUrl} alt="State flag" size="lg" placeholderIcon={FluentFlag} />
```

### ProfileItem

Clickable row with avatar, name, and metadata.

```svelte
<ProfileItem href="/user/{userId}" name={userName} logoUrl={userLogo} subtitle="President" />
```

### Modal

DaisyUI-based modal dialog.

```svelte
<Modal bind:open={showModal} title="Confirm Action">
	<!-- modal body -->
</Modal>
```

---

## Mobile-First Patterns

### Responsive Grid

```html
<!-- 1 col mobile, 2 cols tablet, 3–4 cols desktop -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
	<!-- items -->
</div>
```

### Responsive Text

```html
<h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Title</h1>
<p class="text-sm sm:text-base text-gray-300">Description</p>
```

### Responsive Padding

```html
<div class="p-3 sm:p-4 lg:p-6">
	<!-- content -->
</div>
```

### Stack on Mobile, Row on Desktop

```html
<div class="flex flex-col sm:flex-row gap-3 sm:items-center">
	<div>Left content</div>
	<div class="sm:ml-auto">Right content</div>
</div>
```

### Tap Target Sizing

- Buttons: minimum `h-10` (40px), ideally `h-12` (48px) on mobile.
- Links in lists: full-width tap area with `p-3` or `p-4` padding.
- Icon-only buttons: `size-10` or `size-12`.

```html
<button class="btn btn-primary h-12 w-full sm:w-auto">Full width on mobile</button>
```

### Bottom Sheet Pattern (for mobile actions)

Instead of popovers or dropdowns, use slide-up sheets on mobile:

```html
<div class="fixed inset-x-0 bottom-0 bg-slate-900 border-t border-cyan-500/30 p-4 rounded-t-2xl animate-slide-up z-50">
	<!-- actions -->
</div>
```

---

## Bottom Dock Navigation

The primary navigation is a **fixed bottom dock** (mobile tab bar pattern).

```
┌──────────────────────────────────────┐
│  Dashboard  Posts  Training  Prod  Me │
└──────────────────────────────────────┘
```

- Fixed to bottom of viewport.
- 5 icons: Dashboard, Posts, Training, Production, Profile.
- Active tab glows cyan.
- Hidden on fullscreen pages (article editor, onboarding).

**Dock breakpoints:**
| Screen | Dock Height | Icon Size |
|---|---|---|
| `> 768px` | `h-16` | `size-6` |
| `480–768px` | `h-14` | `size-5` |
| `< 480px` | `h-12` | `size-5` (full-width items) |

**Main content area** must account for dock:

- `h-[calc(100dvh-3.5rem)]` on mobile
- `h-[calc(100dvh-4rem)]` on desktop

---

## DaisyUI Component Usage

Use DaisyUI for standard UI elements. The dark theme is the default.

### Buttons

```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-ghost">Secondary</button>
<button class="btn btn-error btn-outline btn-sm">Delete</button>
<button class="btn btn-sm">Small Button</button>
```

For hero actions, use `gaming-button` instead of DaisyUI buttons.

### Badges

```html
<span class="badge badge-primary">Active</span>
<span class="badge badge-error">Banned</span>
<span class="badge badge-sm">Small</span>
```

### Form Controls

```html
<input type="text" class="input input-bordered w-full" />
<select class="select select-bordered w-full">
	...
</select>
<textarea class="textarea textarea-bordered w-full"></textarea>
```

For gaming-themed inputs, use `gaming-input`.

### Loading States

```html
<span class="loading loading-ring loading-md"></span> <span class="loading loading-spinner loading-sm"></span>
```

Full-page loading (used during navigation):

```svelte
{#if navigating.to}
	<div class="flex flex-col h-dvh">
		<span class="loading loading-ring loading-md m-auto"></span>
	</div>
{/if}
```

---

## Icons

Use **unplugin-icons** with `~icons/` prefix.

### Primary Icon Sets

| Set             | Import Prefix          | Usage                  |
| --------------- | ---------------------- | ---------------------- |
| Fluent (filled) | `~icons/fluent/`       | UI action icons        |
| Fluent Color    | `~icons/fluent-color/` | Decorative icons       |
| Fluent Emoji    | `~icons/fluent-emoji/` | Dock nav, fun elements |
| MDI             | `~icons/mdi/`          | Supplementary icons    |

### Example

```svelte
<script>
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
</script>

<FluentPeople20Filled class="size-5 text-cyan-300" />
```

### Icon Sizing

| Context      | Size Class            |
| ------------ | --------------------- |
| Inline text  | `size-4`              |
| Button icon  | `size-5`              |
| Card icon    | `size-5` or `size-6`  |
| Section icon | `size-8` or `size-10` |
| Empty state  | `size-14 sm:size-16`  |
| Dock nav     | `size-5 md:size-6`    |

---

## Animation

Keep animations minimal and purposeful:

| Animation    | Usage                      | CSS Class                  |
| ------------ | -------------------------- | -------------------------- |
| Fade in      | Page transitions           | `transition:fade` (Svelte) |
| Slide up     | Bottom sheets, toasts      | `.animate-slide-up`        |
| Neon glow    | Header accents (sparingly) | `.animate-neon-glow`       |
| Button pop   | Touch feedback             | `.flinch` class            |
| Fade in      | New content appearing      | `.fade_in`                 |
| Loading ring | Data loading               | DaisyUI `.loading`         |

**Rules:**

- Page transitions: `fade` only.
- Interactive elements: Use `.flinch` for tap feedback.
- No scroll-triggered animations.
- No auto-playing animations except loading spinners.
- Prefer `transition-all duration-300` for hover/focus states.

---

## Page Layout Template

Standard page structure used across the app:

```svelte
<script lang="ts">
	import PageContainer from "$lib/component/PageContainer.svelte";
	import PageHeader from "$lib/component/PageHeader.svelte";
	import SectionCard from "$lib/component/SectionCard.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
</script>

<PageContainer maxWidth="4xl">
	<PageHeader title="Page Title" subtitle="Optional subtitle" />

	<!-- Alert/banner section (if needed) -->

	<SectionCard>
		<h2 class="text-xl font-bold text-white mb-4">Section Title</h2>
		<!-- Section content -->
	</SectionCard>

	<SectionCard>
		<h2 class="text-xl font-bold text-white mb-4">Another Section</h2>
		<!-- More content -->
	</SectionCard>
</PageContainer>
```

---

## Card Pattern Examples

### Stat Card

```html
<div class="gaming-card rounded-xl p-4">
	<div class="flex items-center gap-3 mb-3">
		<div class="size-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
			<IconComponent class="size-5 text-cyan-400" />
		</div>
		<div>
			<p class="text-xs text-gray-500 uppercase tracking-wide">Label</p>
			<p class="text-lg font-bold text-white">Value</p>
		</div>
	</div>
</div>
```

### List Item Card

```html
<a href="/link" class="gaming-card gaming-card-hover rounded-xl p-4 flex items-center gap-3">
	<div class="size-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
		<img src="{logo}" alt="" class="size-8 rounded" />
	</div>
	<div class="flex-1 min-w-0">
		<h3 class="text-white font-semibold truncate">Title</h3>
		<p class="text-sm text-gray-400 truncate">Subtitle</p>
	</div>
	<span class="gaming-badge">Badge</span>
</a>
```

### Broadcast Banner

```html
<div class="bg-purple-600/10 rounded-xl border border-purple-500/20 p-5">
	<div class="flex items-start gap-3">
		<div class="size-10 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
			<Icon class="size-5 text-purple-400" />
		</div>
		<div class="flex-1 min-w-0">
			<span class="text-xs font-medium text-purple-400 uppercase tracking-wide">Label</span>
			<h3 class="text-white font-bold">Title</h3>
			<p class="text-gray-300 text-sm mt-1">Content</p>
			<p class="text-xs text-gray-500 mt-2">Meta info</p>
		</div>
	</div>
</div>
```

---

## Do's and Don'ts

### ✅ Do

- Use `gaming-card` for all content containers.
- Use `PageContainer` + `PageHeader` + `SectionCard` for page structure.
- Use `rounded-xl` for cards, `rounded-lg` for nested elements.
- Use `gap-3` or `gap-4` between items.
- Use `truncate` on text that might overflow.
- Use `shrink-0` on fixed-size elements (icons, avatars).
- Use `min-w-0` on flex children that contain truncated text.
- Provide `alt` text for all images.
- Use semantic HTML (`<nav>`, `<main>`, `<section>`).
- Test at 375px width.

### ❌ Don't

- Don't use white/light backgrounds.
- Don't use borders heavier than `border-*-500/30`.
- Don't make touch targets smaller than 40px.
- Don't use horizontal scrolling (except tables/code).
- Don't rely on hover states for essential interactions (no hover on mobile).
- Don't use `px` units for font sizes — use Tailwind classes.
- Don't nest `gaming-card` inside `gaming-card` (use plain `div` for inner sections).
- Don't use auto-playing animations that cause layout shift.
- Don't hardcode colors — use Tailwind/DaisyUI utilities.
