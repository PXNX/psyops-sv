# UI Style Guide

> One visual language for every PsyOps screen: an **editorial field ledger** — midnight ink surfaces, parchment rules, restrained amber signals, serif headings.

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

Entity detail pages (state, company, user, party, bloc, battle, war) may use a **hero panel** instead of `PageHeader`: a `panel rounded-sm p-5` with logo, `h1 text-3xl font-bold text-[#fff7e8]`, metadata line in `text-[#a89e8e]`, and actions in the top-right corner.

---

## Colour

| Role                 | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| Text — primary       | `text-[#fff7e8]` (never `text-white`)                    |
| Text — strong body   | `text-[#e5d8c1]`                                         |
| Text — body          | `text-[#d9ccb7]`                                         |
| Text — muted / label | `text-[#a89e8e]`                                         |
| Rule / border        | `border-[#dfceb0]/15` (`/10` subtle, `/20` form)         |
| Inset surface        | `bg-[#102239]` / `panel-muted`                           |
| Accent (signal)      | amber `#e6a527`, text `#f7c56b`, hover text `#f2c463`    |

Tinted accents — always the trio *background / border / text*:

| Tone    | Background         | Border               | Text            | Use for                          |
| ------- | ------------------ | -------------------- | --------------- | -------------------------------- |
| amber   | `bg-[#e6a527]/12`  | `border-[#e6a527]/35`| `text-[#f7c56b]`| highlight, pending, warning      |
| sage    | `bg-[#587252]/18`  | `border-[#8fae88]/30`| `text-[#c6dfbf]`| success, money, positive         |
| steel   | `bg-[#315d8d]/18`  | `border-[#7ba0c8]/30`| `text-[#b7d0e6]`| info, defenders, population      |
| plum    | `bg-[#8c709b]/15`  | `border-[#b7a0c5]/30`| `text-[#d5c4df]`| politics, parties, premium-ish   |
| red     | `bg-red-600/10`    | `border-red-500/30`  | `text-red-300`  | errors, destructive, attackers   |

Icon accents use the border hue (`text-[#8fae88]`, `text-[#7ba0c8]`, `text-[#b7a0c5]`, `text-[#f7c56b]`, `text-red-400`).

Do **not** use raw Tailwind hues (`blue-*`, `emerald-*`, `green-*`, `purple-*`, `violet-*`, `indigo-*`, `amber-*`, `yellow-*`, `slate-*`, `gray-*`, `zinc-*`) — map them to the table above. `red-*` is the one allowed raw hue. User-chosen colours (state/party/bloc colour via inline `style`) are fine.

---

## Shape and depth

- `rounded-sm` for panels, cards, buttons, inputs, chips, stat cells, alerts and modals.
- `rounded-full` only for avatars, status dots, progress-bar tracks/fills and circular icon buttons.
- No `rounded-lg` / `rounded-xl` / `rounded-2xl`.
- No decorative `bg-gradient-*`, blurred glow halos (`blur-xl` behind logos), or `hover:scale-*` on cards. Depth comes from the `panel` shadow.

---

## Surfaces

| Need                             | Class                                     |
| -------------------------------- | ----------------------------------------- |
| Content card / section           | `panel rounded-sm p-5` (or `SectionCard`) |
| Clickable card / list row        | `panel-interactive rounded-sm p-4`        |
| Inset block, stat cell, aside    | `panel-muted rounded-sm p-3`              |
| Empty state                      | `EmptyState`                              |

Don't nest `panel` in `panel` — use `panel-muted` for the inner level.

---

## Typography

| Element         | Classes                                                         |
| --------------- | --------------------------------------------------------------- |
| Page title      | `PageHeader` (`text-3xl font-bold text-[#fff7e8]`, serif)       |
| Section heading | `h2.section-title` or `text-lg font-semibold text-[#fff7e8]`    |
| Card title      | `font-bold text-[#fff7e8]`, hover `group-hover:text-[#f2c463]`  |
| Stat label      | `text-[10px] text-[#a89e8e] uppercase tracking-wide`            |
| Stat value      | `text-sm`–`text-2xl font-bold text-[#fff7e8]`                   |
| Body            | `text-sm text-[#d9ccb7]`                                        |
| Metadata        | `text-xs text-[#a89e8e]`                                        |

`font-mono` only for numbers that tick (countdowns, IDs, codes, prices) — not for labels or headings.

---

## Controls

- Buttons: `<Button>` / `<IconButton>` from `#lib/component/ui`. One `primary` per screen; `secondary` for the rest; `soft-*` for tinted secondary actions; `danger` / `soft-red` for destructive. A link that looks like a button is `<Button href=…>`.
- Raw `btn` with hand-picked colours is not allowed; if a component can't be used, apply `buttonClass({...})`.
- Inputs / selects / textareas: `field-control rounded-sm px-3 py-2.5 w-full`, labels `field-label`, hints `field-hint`, errors `field-error`.
- Status chips: `<Badge tone=…>`.

### Feedback messages

```svelte
<div class="bg-[#587252]/18 border border-[#8fae88]/30 text-[#c6dfbf] rounded-sm p-4 flex items-center gap-3">…</div>
<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">…</div>
```

---

## Stat cell

```svelte
<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
	<FluentPeople20Filled class="size-4 text-[#7ba0c8] shrink-0" />
	<div class="min-w-0">
		<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Population</p>
		<p class="text-sm font-bold text-[#fff7e8] truncate">{population.toLocaleString()}</p>
	</div>
</div>
```

---

## Behaviour

- Make whole cards/rows links instead of adding "View" buttons.
- Mobile-first; test at 375px. Tap targets ≥ 40px.
- `BottomSheet` for action menus and short confirmations, `Modal` for longer content.
