---
title: "What's new — a field guide to the latest systems"
description: "Civilians at work, company finance, factory strikes, ministries, stock trading, map history and the new console visuals."
order: 20
category: "Updates & deep dives"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";
</script>

# What's new — a field guide to the latest systems

This guide pulls together the systems added and rebuilt across the game. Each
section says **what changed**, **where to find it** and **which rules decide the
numbers**. The exact values always live in the config modules named below.

<Mermaid label="The new systems at a glance" chart={"flowchart LR\nP[People & education] --> W[Civilian workforce]\nW --> F[Factory output & strikes]\nF --> E[EBITDA & earnings]\nE --> C[Company valuation]\nC --> S[IPO & share trading]\nG[President / ministers] --> B[Bond offerings]\nG --> M[Ministry desks]\nB --> T[State treasury]\nT --> F"} />

## 1. Civilians work — and education decides how many

A region's population is no longer just a headline number. The share of
civilians who can take a factory job is derived from the region's **education
level**: a region with no schools offers 20% of its people as labour, every
school level adds 5 percentage points, and the share is capped at 70%. Recruitment,
hospital strain and conscription still shrink the effective pool.

<DocArt kind="needs" label="A workforce is more than a headcount" caption="Education opens the labour pool; hardship and conscription take people out of it." />

- **Where:** the civilian workforce line on `/region/[id]`, and the weekly
  `/api/cron/workforce` run that staffs free factory shifts.
- **Rules:** `LABOUR_SHARE_BASE`, `LABOUR_SHARE_PER_LEVEL`, `LABOUR_SHARE_MAX`
  in `game/workforce.config.ts`. The wage, output and revenue functions there
  are shared with the cron, so the UI and the simulation agree.
- **Effect:** educated regions fill more shifts, their companies book more
  revenue and the state collects more income tax on the wages.

## 2. Company shares: a determined price, a 72-hour listing and a real market

Going public is no longer "type any price you like". The issue price is
**determined** from the company's own book value:

```
price per share = max(1, floor((cash + factories × 100,000) / 1,000))
```

That price is shown before filing, along with the breakdown. The float is not
tradable immediately: the IPO is filed at once, but shares reach the order book
only **72 hours later**, when the hourly `/api/cron/share-listings` cron creates
the offering. Until then the company page shows a pending-listing notice with
the date.

Once listed, shares trade on the **market page** (`/market`) as well as on the
company page. The Stocks board shows each company's quote, cheapest ask, shares
on offer and your holding. Buy the cheapest open offer or post your own sell
order; the same service (`services/economy/stock-market.ts`) enforces the
embargo, wallet, founder locked-block and transaction rules for both screens.

| Stage | Who acts | Delay |
| --- | --- | --- |
| File IPO | Company owner | immediate |
| Determine price | Game (cash + factories) | at filing |
| Float listed | Listing cron | 72 hours |
| Buy / sell | Any investor | continuous |

<Mermaid label="From filing to trading" chart={"sequenceDiagram\nparticipant O as Company owner\nparticipant C as Company\nparticipant K as Listing cron\nparticipant M as Market\nO->>C: File for IPO\nC->>C: Price from cash + factories\nK->>M: Create float after 72 h\nM-->>O: Buy / sell from the board"} />

## 3. Factories: expansion, fair pay, strikes and EBITDA

### Expansion costs money and time

Adding five posts to a factory costs **20,000 per post**, paid from the company
budget, and the works take **24 hours**. The hourly `/api/cron/factory-expansion`
cron brings the new posts online. A pending expansion is shown on the factory
page with its completion date.

### Unfair pay causes strikes

A weekly cycle (`/api/cron/strikes`) judges each factory's wage against four
realistic pressures:

1. a **living wage** baseline (1,500),
2. the **average wage of other factories in the region** (local labour market),
3. **regional hardship** — food, water, power and heat shortfalls raise what
   workers need,
4. what the company can **plainly afford** from its budget per worker.

The bigger the gap between the posted wage and that fair wage, the higher the
strike severity and the deeper the output cut (down to a skeleton shift). A
crew can walk out at most **once every seven days**. A strike ends only when the
owner pays the demanded wage — which then becomes that factory's **minimum
wage**, so the pay cannot quietly slip back.

### Uninterrupted work makes you faster

Each clean shift extends an `uninterruptedShifts` streak worth +0.5%
productivity, capped at +50%. A strike or a dry shift resets it. Both the
productivity bonus and the strike penalty feed player shifts, civilian work and
the fortnightly earnings report.

### Proper EBITDA

Factories and companies now show **EBITDA** — the value of output minus wages
and material inputs, before interest, tax, depreciation and amortisation. The
factory page shows per-shift revenue, costs, EBITDA and margin; the company page
shows a total and an EBITDA column in the earnings table. The earnings report
stores the figure, so the fortnightly history remains comparable.

All of these rules live in `game/factory-finance.config.ts`.

## 4. State borrowing is a ministerial act

A state can no longer borrow just because an investor wants to lend. Its
**president or economy minister** opens a bond offering on the state's debt
page, naming how much the treasury will borrow. Investors buy slices of that
offering on `/bonds`; every bond records who handed it out. The guarded
decrement on the offering's remaining amount stops two buyers racing for the
last slice.

- **Authority:** derived from the shared government roles
  (`canManagePortfolio(..., "economy_energy")`).
- **Data:** `state_bond_offerings`, plus `offeringId`/`issuedBy` on `state_bonds`.
- **Investor view:** the bonds desk lists live offerings with the issuer's name.

## 5. Map history lives on the map

The separate `/map/history` page is gone. The **History** button in the map
toolbar now opens a date picker and a strip of saved days on the map itself.
Choosing one reloads `/map?history=YYYY-MM-DD`: the same map is recoloured with
that day's owners, residents and bloc allegiances, while live-only layers
(installations, intel, strikes, fleets, wars) are hidden. A day without a
snapshot falls back to the nearest saved one, and a banner links back to the
live map. The URL makes any historic view shareable.

## 6. State ministries

Every state now has a proper cabinet section at `/state/[id]/ministry`:

- an **index** listing all eight ministries with their holder, portfolio and a
  one-line description of their remit;
- a **desk page per ministry** (`/state/[id]/ministry/{ministry}`) showing the
  office holder, a handful of live figures the minister actually acts on and
  links to the relevant desks (treasury, market, grid, residents, forces, …).

The eight ministries are grouped into four portfolios — Science & Health,
Economy & Energy, Foreign & Trade and Defence & Interior. Opening a desk is
restricted to the state's president or the minister of the covering portfolio;
the roster itself is public. Metadata (icons, blurbs, tool links) lives in
`game/government.config.ts`.

## 7. Commanders and formations

Units are now grouped **under a commander**, not just filed into a text list.
The Force tab shows each airgroup and division as a card with its commander,
its icon-bearing roster and one-click detach buttons. The unassigned pool is a
grid of selectable unit tiles; tick units, then move them into a formation or
create one with the commander chosen in the same step. A commander's traits
then scale every unit in that formation in combat and air missions.

When a unit type has no silhouette SVG, the icon falls back to an APP-6 friendly
tactical symbol, so every unit has a visible glyph.

## 8. Reporting, costs and small-screen polish

- One shared **report-reason list** is used for chat messages, profiles and
  comments. Reports are deduplicated, and post previews show the comment count.
- The existing `ResourceRequirements` component is the single cost overview:
  navy, operations, network, academy, defence upgrades and factory extras all
  use it. The rule "always show the full cost" is recorded in the project README.
- Passport **stamps** use speckled ink, rough edges and a multiply blend, so
  they read as rubber-stamped rather than as flat text.

## 9. Civilian vitals and biological diseases

The state's civilian page now explains its people, not just counts them. It
shows **fertility** and **mortality** per 1,000 per year, the total **workforce**
(the educated share able to take a job), the **manpower available for war** with
the current conscription regime and soldiers under arms, and a labelled list of
everything that moves the population: births, natural and war mortality,
environmental and conscription tolls, healthcare shortfalls, hardship,
emigration and disease.

Biological diseases add an outbreak pressure of their own. Three illnesses —
influenza, cholera and typhus — each have a **daily spread rate**, a **daily
mortality rate** and a recovery rate, plus weights saying which protection
actually helps against them. A daily cron grows active cases, kills civilians,
lets people recover and can pass an infection to neighbouring regions. Outbreaks
emerge where water and food are failing, so broken water works and empty markets
have a real epidemiological cost.

| Protection | What it is | Effect |
| --- | --- | --- |
| Hospitals | State hospital levels, plus completed field clinics | Treats the sick, cutting spread and deaths |
| Clean water | Water sufficiency, improved by water works | Strongest against cholera |
| Nutrition | Food sufficiency | Strengthens the workforce against typhus |
| Field clinics | Completed civic `clinic` projects | Extra capacity where state hospitals are thin |

The disease rules live in `game/diseases.config.ts`, the simulation in
`services/civilians/diseases.ts`, and the daily tick is `/api/cron/diseases`.

## 10. Energy usage, explained like the power rating

The state dossier now has an **Energy usage** page next to the power rating.
It opens the energy ledger and shows how consumed power splits between homes,
the forces and exports (with the minister's policy shares), the refined-fuel
pools, the fuel and maintenance factors that throttle the network, and the
plant/grid/storage figures behind it all. Two sparklines plot 90 days of
generation and consumption, and a ranking compares every state by total and
per-capita use. The figures are derived from the same live tables as the energy
desk, so the two pages never disagree.

## 11. Animated consoles

The Domains and Intel pages were rebuilt as visual consoles: small theme-aware
SVG vignettes (rolling convoys, sweeping radars, orbiting satellites, pulsing
neural nets, decrypting INTREPs), staggered entrance animations and a combined
hero diagram. Every animation stops under `prefers-reduced-motion`, so the
visuals never get in the way of the information.

## Reference: scheduled jobs behind these features

| Cron | Schedule | What it does |
| --- | --- | --- |
| `workforce` | Weekly | Staffs factories from the educated civilian pool, pays wages, taxes them |
| `strikes` | Weekly (Mon 04:00) | Starts/resolves fair-pay strikes, sets wage floors |
| `factory-expansion` | Hourly | Brings paid factory expansions online |
| `share-listings` | Hourly | Lists IPO floats after their 72-hour window |
| `earnings` | Weekly | Publishes fortnightly reports, including EBITDA |
| `world-snapshot` | Daily | Captures the map day replayed by `?history=` |
| `diseases` | Daily (00:30) | Spreads/recovers outbreaks, applies mortality, seeds new ones |

See [Society](/docs/society) for population, [Economy](/docs/economy) for
companies and money, [Conflict](/docs/conflict) for how commanders change
combat, and [Map modes](/docs/map-modes) for the map layers and history.
