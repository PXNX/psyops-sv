---
title: "The state desk — residents, civilians, debt and power"
description: "How the four dossier subpages work and exactly how their numbers are derived."
order: 25
category: "Updates & deep dives"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";
</script>

# The state desk

A state's dossier used to put everything on one page. It now keeps the cover,
government and key figures on the front page and links four detailed ledgers:
**Residents**, **Civilians**, **Debt** and **Power rating**. Each one has its
own server load, so opening the dossier no longer computes every statistic.

<Mermaid label="The state dossier and its linked desks" chart={"flowchart TD\nD[State dossier] --> R[/state/id/residents]\nD --> C[/state/id/civilians]\nD --> B[/state/id/debt]\nD --> P[/state/id/power]\nR --> RP[Region population registers]\nB --> BL[Budget ledger]\nP --> PR[All states ranked]"} />

## Finding the desks

Every figure in the **Key Figures** block is a link. The number stays visible
on the dossier; clicking it opens the page that explains it. The Regions figure
still goes to the region index, and Energy stays on the front page.

If you ever enter an ID in a form, do it through the searchable dropdown, never
a number field. Options are labelled `Name (#id)` — for example
`Lower Austria (#4)`. This is a repository rule for new forms as well as old
ones.

## Residents — the players who live there

`/state/{id}/residents` answers two questions:

- **By region** — every region the state holds, with the number of player
  residences in it, sorted largest first. Each row links to that region's
  population register.
- **Over time** — a 90-day sparkline of the resident count.

Residents are player accounts, tracked by the `residences` table. A player's
`regionId` is where they currently are; their `homeRegionId` is their permanent
citizenship. State counts use the current region joined to `regions.stateId`,
so a traveller is counted where they are standing.

<DocArt kind="clock" label="Resident history" caption="Daily snapshots make recent days exact; earlier days are estimated from arrival times." />

The history comes from `snapshot-history.ts`. New daily world snapshots carry
an exact `residents` count per region and per state. Before the first snapshot
there is nothing stored, so the series is estimated from each current
resident's `regionChangedAt` and the region ownership recorded in any
snapshots that do exist. The estimate is a lower bound — it cannot know about
people who left — and the page says so in its caption.

## Civilians — the people who are not players

`/state/{id}/civilians` covers the non-player population. Civilians are a
number derived from each region, not individual accounts. The page shows:

- the state-wide civilian total (`statePopulation`, the sum of
  `regionPopulation` over the state's regions);
- a 90-day sparkline read from `stateSeries()` in the world snapshots;
- a region table with population, density and available workforce;
- the **Civilian Stance** section: which foreign states this state's civilians
  react to, and how those civilians view other states, plus recent bailouts.

The workforce column uses `labourShare(education)` and `civilianLabour(...)`
from `workforce.config.ts`: education decides how much of the population can
take a shift. The tooltip shows the share.

## Debt — what the treasury owes, and who holds it

`/state/{id}/debt` puts three numbers side by side: **outstanding debt**, an
estimated **GDP**, and **debt/GDP** as a percentage.

GDP is derived from observable activity, not invented out of thin air:

1. Sum the last 12 months of `tax_revenue` rows for the state.
2. Take the average rate of the state's active `state_taxes` rows. Gross the
   receipts up by that rate to estimate the taxable base. If no tax is active,
   `GDP_DEFAULT_TAX_RATE` (15%) is used.
3. Add household consumption: `population × GDP_PER_CAPITA` (1,200 credits).
4. `debt/GDP = debt ÷ (base + consumption)`, rounded to one decimal.

The page shows each of those steps in a table, so the result is auditable.

The **Who holds the debt** list is built from `state_bonds` where
`redeemed_at IS NULL`. Outstanding bonds are grouped by lender, so you can see
who bought how much, how many bonds they hold, when they first bought and when
the bonds mature. Self-purchases never earned karma, but bonds have no such
restriction.

## Power rating — an explainable score

`/state/{id}/power` replaces the old modal. It shows the weighted components
for this state and a ranked table of every state. The stored `states.rating`
is displayed separately: it is editor-controlled and can remain zero, while
the computed score always reflects live data.

| Component | What it measures | Weight |
|---|---|---|
| Territory | Regions held + their local ratings | 12 per region |
| Population | Civilians (stored, else derived) | 1 per 1,000 |
| Armed forces | Sum of unit attack + defence | 2 per 10 points |
| Fleet | Hulls in `fleet_ships` | 15 per hull |
| Industry | Installed plant capacity | 20 per 100 MW |
| Energy grid | State energy production | 0.5 per MW |
| Infrastructure | Sum of region levels | 8 per level |
| Education | Sum of region levels | 6 per level |
| Hospitals | Sum of region levels | 6 per level |
| Fortifications | Sum of region levels | 5 per level |
| Radar coverage | Sum of region levels | 4 per level |
| Power grid | Sum of region levels | 7 per level |
| Energy storage | Sum of region levels | 5 per level |

The seven building components were added so that a state cannot be strong only
on paper: buildings that protect, supply and connect its people all count. The
region's `economy` column (the power-plant building level) is deliberately **not**
a separate component — its output is already counted by Industry and Energy,
and adding it again would double-count.

Every weight lives in `POWER_WEIGHTS` in `state-metrics.ts`. Changing a weight
changes both the breakdown and the ranking, because both call the same
`componentsFor` function.
