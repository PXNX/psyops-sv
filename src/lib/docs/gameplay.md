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
