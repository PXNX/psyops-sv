---
title: Conflict — armies, battles and wars
description: "From training to peace treaty."
order: 20
category: "Conflict & forces"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Conflict — armies, battles and wars

Land, sea, air, space and cyber all interact. This guide covers the land and
war layer; sea and air have their own tutorials.

<Mermaid label="From training to peace" chart={"flowchart TD\nT[Forces: train unit] --> U[Unit with experience & fuel]\nU --> D[Station in a region]\nD --> K[Declare war]\nK --> B[Battle: deploy units]\nB --> R[Rounds: damage, experience, supply]\nR --> E{Victory?}\nE -->|yes| G[Territory / reparations]\nE -->|no| W[Losses & experience]\nG --> F[Peace / capitulation]"} />

## 1. Train units

Under `/training` recruit infantry, armour, artillery, air defence, squadrons
and the new aircraft types. Training costs money and materials, takes hours and
grants experience. Every unit carries **fuel**; empty units fight at half
strength.

## 2. Drill and gain experience

Exercising in `/training` raises experience to 50. Higher levels (veteran,
elite) require real combat. Experienced units deal more damage; casualties cost
experience.

## 3. Wars

Wars start with a declaration or a parliamentary proposal
(`/state/[id]/proposal/create`). The cron checks exhaustion, stalemate and
capitulation (`/api/cron/wars`). Allies and blocs can join the fight.

## 4. Battles

`/battle/[id]` shows phase, participants, rounds and axes of attack. Units are
deployed from their region. Each round consumes supply; poor infrastructure and
blocked roads make it worse.

## 5. Airstrikes and domains

`/domains` plans airstrikes, missiles and operations in **Space** (satellites,
ASAT) and **Cyber** (grid, C2, uplink). The [intelligence guide](/docs/intel)
explains how to find targets first.

## 6. Sea and air

See [Naval warfare](/docs/navy) for fleets, [Air power](/docs/air) for
directed missions and [Map & airspace](/docs/map-modes) for the map modes.
