# UI Style Guide

> Design system and conventions for building a unified, immersive dark UI in PsyOps SV.

---

## Design Philosophy

PsyOps SV uses a **dark, immersive warroom aesthetic**. Every page — whether it's a battle, an election, a factory, or a party — should feel like part of the same command interface: dark slate gradients, monospace accents, compact data-dense layouts, and full-width content. The UI is **mobile-first** and prioritizes clarity and atmosphere over decoration.

**Core principles:**

1. **Mobile-first** — Design for 375px width first, then scale up.
2. **Full-width dark theme** — Pages use `min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950` as the base. No max-width containers for primary pages.
3. **Monospace accents** — Labels, stats, badges, and metadata use `font-mono` for a tactical feel.
4. **Data density** — Show useful information upfront in compact stat strips and inline rows.
5. **Touch-friendly** — Minimum 44px tap targets, generous spacing.
6. **No useless buttons** — If something is a link, make it an `<a>` tag, not a button. Remove "View Details →" buttons; make the entire card clickable.
7. **Consistent sections** — Use bordered card panels with header bars for grouped content.

---

## Page Layout Pattern

Every page follows a two-part structure:

### 1. Command Header (sticky-feeling top bar)

A full-width header with backdrop blur that contains the page identity: logo/emblem, title, status badges, and optional countdown or metadata.

```svelte
<div class="border-b border-{accent}-900/30 bg-slate-900/80 backdrop-blur-xl">
	<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
		<!-- Logo + Title + Status -->
	</div>
</div>
```

### 2. Content Area

Full-width padded content below the header.

```svelte
<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
	<!-- Stats strip, sections, cards -->
</div>
```

### Full Page Template

```svelte
<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<!-- Command Header -->
	<div class="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
		<div class="w-full px-4 sm:px-6 py-4 sm:py-6">
			<div class="flex items-center gap-4">
				<div class="relative flex-shrink-0">
					<div class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
					<Logo src={logoUrl} alt={name} class="relative size-14 sm:size-18 rounded-lg border-2 border-purple-500/30" />
				</div>
				<div class="flex-1 min-w-0">
					<h1 class="text-xl sm:text-2xl font-bold text-white tracking-wide">Page Title</h1>
					<span class="text-xs text-slate-400 font-mono">Subtitle or metadata</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
		<!-- Stats strip -->
		<!-- Section cards -->
	</div>
</div>
```

### When to Use PageContainer

`PageContainer` is still available for pages that benefit from max-width constraints (dashboard, region detail, settings). Use `maxWidth="full"` for data-heavy pages like production.

```svelte
<PageContainer maxWidth="4xl">  <!-- Dashboard, region, settings -->
<PageContainer maxWidth="full"> <!-- Production, data-heavy pages -->
```

---

## Color Palette

| Role                | Color                           | Tailwind                                    | Usage                               |
| ------------------- | ------------------------------- | ------------------------------------------- | ----------------------------------- |
| **Background**      | `#0f172a` → `#020617`           | `from-slate-950 via-slate-900 to-slate-950` | Page background gradient            |
| **Header/Panel bg** | `slate-900/80`                  | `bg-slate-900/80 backdrop-blur-xl`          | Header bars, section headers        |
| **Card surface**    | `slate-900/50` → `slate-950/50` | `from-slate-900/50 to-slate-950/50`         | Content cards                       |
| **Card border**     | `slate-700/50`                  | `border-slate-700/50`                       | Default card borders                |
| **Text primary**    | White                           | `text-white`                                | Headings, names, values             |
| **Text secondary**  | Slate 300–400                   | `text-slate-300`, `text-slate-400`          | Body text, descriptions             |
| **Text muted**      | Slate 500–600                   | `text-slate-500`, `text-slate-600`          | Timestamps, labels                  |
| **Accent**          | Purple                          | `text-purple-400`, `border-purple-500`      | Links, hover states, party/politics |
| **Success**         | Emerald                         | `text-emerald-400`, `border-emerald-500`    | Confirmations, positive             |
| **Warning**         | Amber                           | `text-amber-400`, `border-amber-500`        | Caution, pending, in-progress       |
| **Danger/Attacker** | Red                             | `text-red-400`, `border-red-500`            | Errors, destructive, attackers      |
| **Defender**        | Blue                            | `text-blue-400`, `border-blue-500`          | Defenders, protection               |

### War/Battle Color Coding

| Side           | Text             | Border                | Background          |
| -------------- | ---------------- | --------------------- | ------------------- |
| Attacker       | `text-red-400`   | `border-red-500/30`   | `from-red-950/30`   |
| Defender       | `text-blue-400`  | `border-blue-500/30`  | `from-blue-950/30`  |
| Active/Ongoing | `text-amber-400` | `border-amber-500/30` | `from-amber-950/30` |

---

## Typography

| Element        | Classes                                                                    | Notes                 |
| -------------- | -------------------------------------------------------------------------- | --------------------- |
| Page title     | `text-xl sm:text-2xl font-bold text-white tracking-wide`                   | In command header     |
| Section header | `text-sm font-bold text-slate-200 font-mono uppercase tracking-wide`       | In section header bar |
| Stat value     | `text-xl sm:text-2xl font-bold text-white font-mono`                       | In stat strips        |
| Stat label     | `text-[10px] sm:text-xs text-slate-500 font-mono uppercase tracking-wider` | Above stat values     |
| Body text      | `text-sm text-slate-300`                                                   | General content       |
| Metadata       | `text-xs text-slate-500 font-mono`                                         | Dates, IDs, counts    |
| Badge text     | `text-[10px] font-mono font-bold uppercase`                                | Status indicators     |

**Font:** `HPSimplified` (custom) → system-ui → sans-serif fallback. Monospace (`font-mono`) for tactical/data elements.

---

## Stats Strip

A compact 2–4 column grid of key metrics. Used on nearly every page.

```svelte
<div class="grid grid-cols-3 gap-3">
	<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
		<div class="flex items-center gap-2 mb-1.5">
			<Icon class="size-4 text-purple-400" />
			<span class="text-[10px] sm:text-xs text-slate-500 font-mono uppercase tracking-wider">Label</span>
		</div>
		<div class="text-xl sm:text-2xl font-bold text-white font-mono">42</div>
	</div>
	<!-- more stat cells -->
</div>
```

- Always use `font-mono` for values
- Icon + label on top row, value below
- Use accent colors for icons matching the domain (red for war, purple for politics, emerald for economy)

---

## Section Card Panel

Grouped content uses a bordered card with a header bar.

```svelte
<div class="bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden">
	<!-- Header bar -->
	<div class="bg-slate-900/80 border-b border-slate-700/50 px-4 sm:px-5 py-3">
		<h2 class="text-sm font-bold text-slate-200 font-mono uppercase tracking-wide flex items-center gap-2">
			<Icon class="size-4 text-purple-400" />
			Section Title
		</h2>
	</div>
	<!-- Content -->
	<div class="p-3 sm:p-4 space-y-2">
		<!-- rows -->
	</div>
</div>
```

---

## List Item Row

The standard pattern for clickable items in a list (members, states, battles, etc.).

```svelte
<a
	href="/target/{id}"
	class="flex items-center gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg p-3 hover:border-slate-600/60 transition-all group"
>
	<Logo src={logo} alt={name} class="size-10 sm:size-12 rounded-lg" />
	<div class="flex-1 min-w-0">
		<p class="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">{name}</p>
		<p class="text-xs text-slate-500 font-mono">{metadata}</p>
	</div>
	<span class="text-slate-600 group-hover:text-slate-400 transition-colors text-sm">→</span>
</a>
```

- The entire row is a link — no separate "View" buttons
- Arrow `→` appears as navigation hint, color-shifts on hover
- Use `group-hover:text-purple-400` on the title for hover feedback

---

## Active War Card

Used on region, state, and bloc pages to show ongoing wars. Always a link, never a button.

```svelte
<a
	href="/war/{war.id}"
	class="flex items-center gap-3 bg-gradient-to-r from-red-950/25 to-slate-900/50 border border-red-500/20 rounded-xl p-4 hover:border-red-400/40 transition-all group"
>
	<div class="relative flex-shrink-0">
		<div class="absolute inset-0 bg-red-500/20 blur-lg rounded-full animate-pulse"></div>
		<div class="relative size-10 bg-red-950/60 rounded-lg border border-red-500/30 flex items-center justify-center">
			<span class="text-xl">⚔️</span>
		</div>
	</div>
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2 mb-0.5">
			<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
			<span class="text-[10px] text-red-400/70 font-mono uppercase tracking-widest">Active War</span>
		</div>
		<div class="text-sm text-slate-300">
			<span class="font-bold text-red-400">{attacker}</span>
			<span class="text-slate-600 mx-1">vs</span>
			<span class="font-bold text-blue-400">{defender}</span>
		</div>
	</div>
	<span class="text-slate-600 group-hover:text-red-400 transition-colors">→</span>
</a>
```

---

## Logo with Glow

Used in command headers for page identity elements.

```svelte
<div class="relative flex-shrink-0">
	<div class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
	<Logo src={logoUrl} alt={name} class="relative size-14 sm:size-18 rounded-lg border-2 border-purple-500/30" />
</div>
```

- The glow uses the page's accent color (purple for politics, red for war, emerald for economy)
- `blur-xl` creates the ambient halo
- Border uses the same accent at `/30` opacity

---

## Buttons and Actions

### Primary Action Button

Full-width gradient button with monospace text.

```svelte
<button
	class="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold font-mono uppercase tracking-wide transition-all"
>
	<span class="flex items-center justify-center gap-2">
		<Icon class="size-5" />
		Action Label
	</span>
</button>
```

### Compact Action Link

Small inline action (edit, chat, etc.).

```svelte
<a
	href="/target"
	class="px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/30 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-mono"
>
	<Icon class="size-3.5" />
	Label
</a>
```

### Destructive Action

```svelte
<button
	class="px-3 py-1.5 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 rounded-lg text-red-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
>
	<Icon class="size-3.5" />
	Leave
</button>
```

### Icon-Only Action

For inline management actions (promote, demote, kick).

```svelte
<button class="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Promote">
	<FluentArrowUp20Filled class="size-4" />
</button>
```

---

## Status Indicators

### Live Pulse Dot

```html
<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
```

### Status Badge (monospace)

```html
<span class="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 font-mono font-bold">
	⚔️ LIVE
</span>
```

### Outcome Badge

```html
<!-- Attacker won -->
<span class="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-mono font-bold">
	🔴 CAPTURED
</span>

<!-- Defender won -->
<span class="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400 font-mono font-bold">
	🔵 DEFENDED
</span>
```

---

## Countdown Timer

Used for elections, battle preparation, and time-limited events.

```svelte
<div class="flex items-center justify-center gap-2 sm:gap-3">
	{#each [{ value: hours, label: "HRS" }, { value: minutes, label: "MIN" }, { value: seconds, label: "SEC" }] as segment, i}
		{#if i > 0}
			<div class="text-xl sm:text-2xl font-bold text-purple-500/50">:</div>
		{/if}
		<div class="text-center">
			<div
				class="text-2xl sm:text-4xl font-mono font-bold text-purple-400 bg-slate-950/80 rounded px-2 sm:px-4 py-1 sm:py-2 min-w-[60px] sm:min-w-[90px] border border-purple-500/20"
			>
				{String(segment.value).padStart(2, "0")}
			</div>
			<div class="text-xs text-slate-500 mt-1 sm:mt-1.5 font-mono">{segment.label}</div>
		</div>
	{/each}
</div>
```

---

## Territory / Progress Bar

For territory control, battle momentum, shift progress, etc.

```svelte
<div class="relative h-8 sm:h-10 bg-slate-950/80 rounded-lg border border-slate-700/50 overflow-hidden">
	<div
		class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000"
		style="width: {attackerPercent}%"
	></div>
	<div
		class="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-blue-600 to-blue-500 transition-all duration-1000"
		style="width: {defenderPercent}%"
	></div>
	<div class="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
		<span class="text-white font-bold text-xs font-mono drop-shadow-lg">{leftLabel}</span>
		<span class="text-white font-bold text-xs font-mono drop-shadow-lg">{rightLabel}</span>
	</div>
</div>
```

---

## ThreeJS Animation

The `ThreeAnimation` component renders a short full-screen particle effect overlay. Use it for impactful moments.

```svelte
<script>
	import ThreeAnimation from "$lib/component/ThreeAnimation.svelte";
	let showAnim = $state(false);
</script>

{#if showAnim}
	<ThreeAnimation variant="battle" onComplete={() => (showAnim = false)} />
{/if}
```

| Variant      | Usage                                  | Character                                                                 |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------- |
| `battle`     | Combat round execution, war page entry | Multi-origin edge-to-edge explosions, 900 particles, violent camera shake |
| `vote`       | Casting a vote                         | Purple/blue dignified upward rise                                         |
| `collect`    | Collecting wages                       | Golden fountain                                                           |
| `company`    | Company creation                       | Blue-gold starburst                                                       |
| `party`      | Party creation                         | Confetti celebration                                                      |
| `production` | Starting production                    | Spinning mechanical pulse                                                 |
| `training`   | Training units                         | Green disciplined columns                                                 |

The battle variant uses 3 explosion origins spread across the screen, ultra-fast sparks that reach screen edges, edge smoke, and a blood-red afterglow. Duration is 3200ms.

---

## Icons

Use **unplugin-icons** with `~icons/` prefix.

| Set             | Import Prefix          | Usage           |
| --------------- | ---------------------- | --------------- |
| Fluent (filled) | `~icons/fluent/`       | UI action icons |
| Fluent Emoji    | `~icons/fluent-emoji/` | Dock nav        |

### Sizing

| Context             | Size                   |
| ------------------- | ---------------------- |
| Inline/metadata     | `size-3` to `size-4`   |
| Stat strip icon     | `size-4`               |
| Section header icon | `size-4`               |
| Header logo area    | `size-14` to `size-20` |
| Dock nav            | `size-5 md:size-6`     |

---

## Bottom Dock Navigation

Fixed bottom bar with 5 items: Dashboard, Posts, Training, Production, Profile.

- Active tab glows cyan
- Hidden on fullscreen pages (editor, onboarding)
- Main content accounts for dock height: `h-[calc(100dvh-3.5rem)]` mobile, `h-[calc(100dvh-4rem)]` desktop

---

## Mobile Patterns

### Responsive Text

```html
<h1 class="text-xl sm:text-2xl font-bold text-white">Title</h1>
<p class="text-xs sm:text-sm text-slate-400 font-mono">Metadata</p>
```

### Responsive Padding

```html
<div class="p-3 sm:p-4"><!-- content --></div>
<div class="px-4 sm:px-6 py-4 sm:py-6"><!-- full-width content --></div>
```

### Stack on Mobile, Row on Desktop

```html
<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
	<div>Left</div>
	<div>Right</div>
</div>
```

---

## BottomSheet vs Modal

| Scenario                                | Use             |
| --------------------------------------- | --------------- |
| Action menu, confirmations, short forms | **BottomSheet** |
| Context menu on messages/items          | **BottomSheet** |
| Complex multi-step forms                | Modal           |
| Large content (rules, terms)            | Modal           |

---

## Do's and Don'ts

### ✅ Do

- Use `min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950` as page base.
- Use `font-mono` for stats, labels, badges, metadata.
- Use the command header + content area layout pattern.
- Make entire cards/rows clickable links — no separate "View" buttons.
- Use stat strips (grid of 2–4 compact stat cells) for key metrics.
- Use section card panels with header bars for grouped content.
- Use `border-slate-700/50` for card borders, `border-{accent}-500/30` for themed borders.
- Use logo glow effect (`blur-xl` + accent color) in page headers.
- Use `truncate` on text that might overflow, `min-w-0` on flex containers.
- Use `transition-all` for hover states.
- Test at 375px width.

### ❌ Don't

- Don't use white/light backgrounds.
- Don't add "View Details" buttons — make the row a link.
- Don't use `max-w-*` containers on primary pages (use full width).
- Don't use DaisyUI `btn` classes for primary actions — use gradient buttons with `font-mono`.
- Don't use verbose description paragraphs explaining what a section is.
- Don't make touch targets smaller than 40px.
- Don't nest cards inside cards.
- Don't use auto-playing animations that cause layout shift.
- Don't use dropdown menus — use `BottomSheet` instead.
- Don't add hover outlines or glow effects to dock navigation items.
- Don't use `text-gray-*` — use `text-slate-*` for consistency.
