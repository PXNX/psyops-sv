---
title: Gameplay overview
description: The core systems of Psyops at a glance.
order: 2
category: "Getting started"
---

<script>
  import DocArt from "../component/docs/DocArt.svelte";
  import DocPhoto from "../component/docs/DocPhoto.svelte";
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Gameplay overview

<DocPhoto src="/images/docs/five-domains.webp" alt="The five domains of warfare" label="Land, sea, air, space and cyber shape the same war." />

Psyops is a game about inherited power. You start with money from a late relative
and spend it to build influence, buying offices, commanding soldiers and shaping
what people believe. Every system below is one way to apply force:

- **Politics** — parties, elections, cabinets and blocs decide who may act.
- **Force** — armies, fleets, aircraft and wars decide what happens when they do.
- **Money** — companies, factories, markets and your wallet fund the other levers.
- **Influence** — newspapers, intelligence and reputation decide what the world accepts.

<DocArt kind="levers" label="Politics, force, money, influence" caption="Most victories start with money, are made possible by influence, are legitimised by politics and only end with force." />

This page summarises the central systems; each one has its own tutorial.

<Mermaid label="One world, many levers" chart={"flowchart TD\nP[Politics] --> S[State: laws, budget, wars]\nM[Money] --> F[Factories, companies, markets]\nI[Influence] --> O[Opinion, media, intel]\nF --> S\nO --> S\nS --> B[Battles, strikes, fleets]\nB --> R[Territory and reputation]\nR --> I\nR --> M"} />

| Area | Tutorial |
| --- | --- |
| Making money, factories, companies, market | [Economy](/docs/economy) |
| Regions, residence, travel, population | [Society](/docs/society) |
| Parties, elections, proposals, cabinet | [Politics](/docs/politics) |
| Chat, posts, newspapers | [Community](/docs/community) |
| Armies, battles, wars, strikes | [Conflict](/docs/conflict) |
| Reconnaissance, cyber, infiltration | [Intelligence](/docs/intel) |
| Hex sea, ports, docks, ships, mines | [Naval warfare](/docs/navy) |
| Aircraft types and directed missions | [Air power](/docs/air) |
| Map modes and hex selection | [Map & airspace](/docs/map-modes) |

## How the world ticks

Background jobs advance production, elections, battles, travel, energy and the
fleet every few minutes. You can see the schedule in `vercel.json` and the
implementation under `src/routes/api/cron/`.

<DocArt kind="clock" label="The world tick" caption="Some jobs run every 15 minutes, others hourly or daily — the world moves even while you are offline." />

## Domains

Every action belongs to one of five domains: land, sea, air, space and cyber.
A side that fields several domains fights better than a one-domain army. See
`domains.config.ts` for the details.

<DocArt kind="domains" label="Combined arms" caption="Land, sea and air fight; space and cyber decide how well they see, communicate and strike." />


## Deep dive: the numbers behind the loop

Every tutorial links to a config file with the exact values. A few anchors:

| System | Concrete value | Source |
| --- | --- | --- |
| Starting inheritance | 100,000 | `welcome/create/+page.server.ts` |
| Default factory wage | 1,500 | `economy.config.ts` |
| Default tax rates | mining 10%, production 15%, market 5%, income 20% | `economy.config.ts` |
| Battle preparation / planning | 24 h / 48 h | `combat.config.ts` |
| Combat round | 1 h | `combat.config.ts` |
| War exhaustion | +0.5/hour, forced peace at 100 | `war.config.ts` |
| Exercise | 8 h, +10 experience (cap 50) | `exercise.config.ts` |
| Fleet tick | every 15 minutes | `vercel.json` |
| Sea intel freshness | 12 hours | `recon.config.ts` |
| Hex sea grid | 16 × 11 hexes | `fleet.config.ts` |

See the [Reference](/docs/reference) for the full config map.
