# UI Style Guide

> One visual language for every PsyOps screen: a **grand-strategy war room** in the spirit of Hearts of Iron IV — olive field-grey metal panels with brass frames and bevels, saturated gold / green / blue signal colours, gold small-caps section headers.

The tokens live in `src/app.css` (`panel`, `panel-interactive`, `panel-muted`, `field-control`, `field-label`, `field-hint`, `field-error`, `section-title`) and `src/lib/component/ui/styles.ts` (buttons, badges). Reference implementations: `src/routes/(authenticated)/(dock)/state/+page.svelte` and `bloc/+page.svelte`.

---

## Page shell

Every dock page uses `PageContainer` + `PageHeader`. Never hand-roll `max-w-* mx-auto` wrappers (inside the dock's flex column they shrink to content width) and never add `min-h-screen` or page-level background gradients — the body already paints the ledger grid.

```svelte
<PageContainer maxWidth="6xl">
	<PageHeader title="All States" subtitle="42 states available" backHref="/state/1" backLabel="State">
		{#snippet actions()}
			<Button variant="secondary" href="/fallen" icon={FluentBuildingBank20Filled}>Fallen States</Button>
		{/snippet}
	</PageHeader>
	…
</PageContainer>
```

| Page type                     | `maxWidth` |
| ----------------------------- | ---------- |
| Lists / grids / dashboards    | `6xl`      |
| Entity detail pages           | `5xl`      |
| Single-column content, admin  | `4xl`      |
| Create / edit forms, settings | `3xl`      |

Exceptions: full-height layouts (chat threads, map, fullscreen editors) keep their own shell but use the same tokens inside.

Entity detail pages (state, company, user, party, bloc, battle, war) may use a **hero panel** instead of `PageHeader`: a `panel rounded-sm p-5` with logo, `h1 text-3xl font-bold text-[#f5efd8]`, metadata line in `text-[#a8a083]`, and actions in the top-right corner.

---

## Colour

| Role                 | Value                                                |
| -------------------- | ---------------------------------------------------- |
| Text — primary       | `text-[#f5efd8]` (never `text-white`)                |
| Text — strong body   | `text-[#e6ddbf]`                                     |
| Text — body          | `text-[#d3caa9]`                                     |
| Text — muted / label | `text-[#a8a083]`                                     |
| Rule / border        | `border-[#c8b47a]/15` (`/10` subtle, `/20` form)     |
| Inset surface        | `bg-[#1a1f15]` / `panel-muted`                       |
| Accent (signal)      | gold `#f2b01e`, text `#ffd35c`, hover text `#ffcf47` |

Tinted accents — always the trio _background / border / text_:

| Tone   | Background        | Border                | Text             | Use for                        |
| ------ | ----------------- | --------------------- | ---------------- | ------------------------------ |
| gold   | `bg-[#f2b01e]/12` | `border-[#f2b01e]/35` | `text-[#ffd35c]` | highlight, pending, warning    |
| green  | `bg-[#3f8a2a]/18` | `border-[#6fd14a]/30` | `text-[#b9f29a]` | success, money, positive       |
| blue   | `bg-[#2369b5]/18` | `border-[#5eaef5]/30` | `text-[#b3dcff]` | info, defenders, population    |
| purple | `bg-[#8a4fc0]/15` | `border-[#c08cf0]/30` | `text-[#e3cbfb]` | politics, parties, premium-ish |
| red    | `bg-red-600/10`   | `border-red-500/30`   | `text-red-300`   | errors, destructive, attackers |

Icon accents use the border hue (`text-[#6fd14a]`, `text-[#5eaef5]`, `text-[#c08cf0]`, `text-[#ffd35c]`, `text-red-400`).

Do **not** use raw Tailwind hues (`blue-*`, `emerald-*`, `green-*`, `purple-*`, `violet-*`, `indigo-*`, `amber-*`, `yellow-*`, `slate-*`, `gray-*`, `zinc-*`) — map them to the table above. Signal colours are deliberately saturated so states, sides and outcomes read at a glance, like a strategy-game HUD. `red-*` is the one allowed raw hue. User-chosen colours (state/party/bloc colour via inline `style`) are fine.

---

## Shape and depth

- `rounded-sm` for panels, cards, buttons, inputs, chips, stat cells, alerts and modals.
- `rounded-full` only for avatars, status dots, progress-bar tracks/fills and circular icon buttons.
- No `rounded-lg` / `rounded-xl` / `rounded-2xl`.
- No ad-hoc `bg-gradient-*`, glow halos or `hover:scale-*` in page markup. The metal sheen, bevel and hover glow live in the `panel*` utilities and `Button` variants, so every surface gets them consistently.

---

## Surfaces

| Need                          | Class                                     |
| ----------------------------- | ----------------------------------------- |
| Content card / section        | `panel rounded-sm p-5` (or `SectionCard`) |
| Clickable card / list row     | `panel-interactive rounded-sm p-4`        |
| Inset block, stat cell, aside | `panel-muted rounded-sm p-3`              |
| Empty state                   | `EmptyState`                              |

Don't nest `panel` in `panel` — use `panel-muted` for the inner level.

---

## Typography

| Element         | Classes                                                        |
| --------------- | -------------------------------------------------------------- |
| Page title      | `PageHeader` (`text-3xl font-bold text-[#f5efd8]`, serif)      |
| Section heading | `h2.section-title` (gold uppercase, tracked)                   |
| Card title      | `font-bold text-[#f5efd8]`, hover `group-hover:text-[#ffcf47]` |
| Stat label      | `text-[10px] text-[#a8a083] uppercase tracking-wide`           |
| Stat value      | `text-sm`–`text-2xl font-bold text-[#f5efd8]`                  |
| Body            | `text-sm text-[#d3caa9]`                                       |
| Metadata        | `text-xs text-[#a8a083]`                                       |

`font-mono` only for numbers that tick (countdowns, IDs, codes, prices) — not for labels or headings.

---

## Controls

- Buttons: `<Button>` / `<IconButton>` from `#lib/component/ui`. One `primary` per screen; `secondary` for the rest; `soft-*` for tinted secondary actions; `danger` / `soft-red` for destructive. A link that looks like a button is `<Button href=…>`.
- Raw `btn` with hand-picked colours is not allowed; if a component can't be used, apply `buttonClass({...})`.
- Inputs / selects / textareas: `field-control rounded-sm px-3 py-2.5 w-full`, labels `field-label`, hints `field-hint`, errors `field-error`.
- Status chips: `<Badge tone=…>`.

### Feedback messages

```svelte
<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">…</div>
<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">…</div>
```

---

## Stat cell

```svelte
<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
	<FluentPeople20Filled class="size-4 text-[#5eaef5] shrink-0" />
	<div class="min-w-0">
		<p class="text-[10px] text-[#a8a083] uppercase tracking-wide">Population</p>
		<p class="text-sm font-bold text-[#f5efd8] truncate">{population.toLocaleString()}</p>
	</div>
</div>
```

---

## Behaviour

- Make whole cards/rows links instead of adding "View" buttons.
- Mobile-first; test at 375px. Tap targets ≥ 40px.
- `BottomSheet` for action menus and short confirmations, `Modal` for longer content.

---

## Feedback, confirmation and titles

- **Toasts, never `alert()`**: `toast.success / error / info / warning` from `#lib/ui/toast.svelte.js`. In a `use:enhance` callback, `toastResult(result)` shows the action's `message` / `error`.
- **Confirm sheets, never `confirm()`**: `use:confirmSubmit={{ title, body?, confirmLabel?, danger? }}` on a `<form>` (before `use:enhance`), or `await confirmAction({...})` in code.
- **Refresh data, never reload**: after a change, `invalidateAll()` (or `update()` inside `use:enhance`), not `location.reload()`.
- **Tab titles**: `PageHeader` sets `"<title> · PsyOps"`. Pages without a `PageHeader` add `<svelte:head><title>… · PsyOps</title></svelte:head>`; pages with their own title pass `documentTitle={false}`.
- **Tap targets**: shared buttons carry `tap-target`, which gives anything smaller a 40px hit area on touch screens. Hand-made clickable elements can add the class too.

## Motion

Quick, springy, and always off under `prefers-reduced-motion`.

| Need                    | Use                                                               |
| ----------------------- | ----------------------------------------------------------------- |
| Page sections arriving  | automatic: `PageContainer` cascades its children (`rise-stagger`) |
| A single block arriving | `animate-rise-in` (lift) or `animate-pop-in` (scale overshoot)    |
| Pressable surface       | `press-spring` (already on buttons and `panel-interactive`)       |
| Quiet idle artwork      | `animate-idle-float`                                              |
| Dialogs / sheets        | `Modal` and `BottomSheet` animate themselves                      |
| A success moment        | `celebrate(element)` from `#lib/utils/celebrate.js` (glow + lift) |
| Something approved      | `animate-stamp` on a stamp/seal element (rubber stamp landing)    |
| A number that changed   | `animate-tick` (brief gold glow)                                  |

Entrance animations are skipped while a page-swap view transition is running (`#lib/utils/motion.ts`), so they never get frozen into its snapshot. Use `fill-mode: backwards` for new entrance keyframes so the final frame can't override hover/press transforms.

---

## Players

Every time a player is named, use `UserLink` from `#lib/component/UserLink.svelte` (avatar + name + optional party tag and subtitle, linking to the profile). `size="xs"` inside running text, `sm` in lists, `md` on cards; `plain` drops the avatar. Don't hand-roll `<a href="/user/...">`.

## Make it look like the real thing

Screens model real objects where one exists, so they read at a glance without explanations:

- a newspaper is a front page (masthead, lead story, columns),
- a visa or residence permit is a passport page with a stamp,
- a ballot is a ballot paper with boxes to mark,
- a proposal or law is a bill (number, title, clauses, vote tally, PASSED / REJECTED stamp),
- money movements are a bank statement, a war is a front report, etc.

Don't add explainer boxes ("How it works", "About…", tips, notes) that restate what the screen already shows. Say a rule in a few words exactly where it bites (next to a disabled button, in a validation message).

No confetti. Celebrate with `celebrate()`, `animate-stamp` and `feedback()`.
