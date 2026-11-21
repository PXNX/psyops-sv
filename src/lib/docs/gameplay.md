---
title: Gameplay overview
description: The core systems of Psyops at a glance.
order: 2
category: "Getting started"
---

# Gameplay overview

Psyops combines economics, politics and warfare in one shared world. This page
summarises the central systems; each one has its own tutorial.

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

## Domains

Every action belongs to one of five domains: land, sea, air, space and cyber.
A side that fields several domains fights better than a one-domain army. See
`domains.config.ts` for the details.


## Deep dive: the numbers behind the loop

Every tutorial links to a config file with the exact values. A few anchors:

| System | Concrete value | Source |
| --- | --- | --- |
| Starting wallet | 10,000 | `economy.config.ts` |
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
