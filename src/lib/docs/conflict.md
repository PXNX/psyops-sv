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


## Deep dive: exact numbers

### Battle phases and width (`combat.config.ts`)

- Preparation **24 h**, planning **48 h**; planning bonus up to **50%**, gained
  **1%/hour**.
- Base combat width **80**. Terrain: plains 1.0, fields 1.05, forest 0.8,
  hills 0.7, mountain 0.5, urban 0.6, desert 0.9, jungle 0.6, lake 0.3,
  shore 0.7, city 0.45, town 0.6.
- Rounds are **1 h**; base damage multiplier **1.0**. Fortifications reduce
  incoming damage **15% per level**.
- Organization: exhausted at **20**, retreat at **10**, recovers **10/day**.
  Strength recovers **5/day**, destroyed at **0**. Retreat takes **1.5×**
  damage.

### Unit templates (`military.config.ts`, selected)

| Unit | Atk / Def | Width | Training (h) | Cost | Key materials |
| --- | --- | --- | --- | --- | --- |
| infantry | 15 / 20 | 2 | 6 | 50,000 | steel 50, rifles 500, ammo 1,000 |
| armor | 50 / 40 | 4 | 12 | 200,000 | steel 500, vehicles 50, ammo 2,000 |
| artillery | 40 / 15 | 3 | 8 | 100,000 | ammo 3,000, artillery 20 |
| air defence | 25 / 25 | 2 | 10 | 175,000 | steel 400, artillery 15 |
| fighter squadron | 60 / 35 | 4 | 16 | 300,000 | steel 600, ammo 2,500 |
| bomber squadron | 70 / 20 | 5 | 18 | 350,000 | steel 700, explosives 500 |
| frigate | 45 / 35 | 4 | 20 | 260,000 | steel 800, ammo 1,500 |
| carrier | 30 / 55 | 6 | 40 | 900,000 | steel 1,500, vehicles 20 |

Manpower cost (civilians per unit, `manpower.config.ts`): infantry **8,000**,
armor **5,000**, frigate **2,000**, submarine **1,500**; a region must keep at
least **1,000** civilians.

### War exhaustion (`war.config.ts`)

Exhaustion grows **0.5/hour** from the declaration date and is capped at
**100**, which forces white peace. Seven days without battle activity
(`STALEMATE_DAYS: 7`) also ends the war.

### Domains (`domains.config.ts`)

Combined arms grants **+8%** per extra fighting domain (1.00 → 1.08 → 1.16).
Domain edges: sea → land **×1.10**, air → sea **×1.12**, land → sea ×1.06,
sea → air ×0.90, air → land ×0.92.

### Strike weapons (`strike.config.ts`)

| Weapon | Cost | Accuracy | Unit damage | Tiers |
| --- | --- | --- | --- | --- |
| cruise missile | 120,000 | 0.90 | 30 | strategic, operational |
| ballistic missile | 200,000 | 0.70 | 45 | strategic, operational |
| guided bomb | 40,000 | 0.95 | 40 | all (3 hops) |
| GPS bomb | 30,000 | 0.85 | 35 | operational, tactical |
| unguided bombs | 15,000 | 0.50 | 55 | operational, tactical |
| attack drone | 8,000 | 0.85 | 15 | operational, tactical |
| close air support | 20,000 | 0.90 | 35 | tactical |

Cooldowns: strategic **8 h**, operational **3 h**, tactical **1 h**; sortie
cooldown **4 h**. Intelligence changes accuracy: blind ×0.55, full picture
×1.1. Violating IHL costs **40** points for protected targets, **20** for
indiscriminate and **10** for disproportionate strikes.

### Worked example — a front in a forest

Base width 80 × forest 0.8 = **64**. Two infantry (2+2) and one armor (4) fit;
a second armor would need 8 more width. With a level-2 fortification the
defender takes 30% less damage, and 48 hours of planning adds up to +50%
attack output.
