---
title: Society — regions, residence and supply
description: "How people live, move and judge the state."
order: 10
category: "Everyday life & economy"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Society — regions, residence and supply

Every number in a state represents people. This guide covers regions, residence,
travel, population and satisfaction.

<Mermaid label="Life in a region" chart={"flowchart LR\nR[Choose a region] --> W[Home / current residence]\nW --> J[Job & factory]\nJ --> G[Money & supply]\nG --> Z[Satisfaction]\nW --> T[Travel to another region]\nT --> W\nZ --> S[State stability]"} />

## 1. Region and residence

Every player has a **home region** and a current **residence** (`/region/[id]`).
Your residence decides which city, party and state you represent.

## 2. Travel

Book a trip to another region from `/region/[id]`. Travel takes time and is
completed by the cron (`/api/cron/travels`). Some actions are blocked while you
are travelling.

## 3. Population and needs

Regions have inhabitants, infrastructure, education, hospitals and **civilian
needs**. The region page shows what people require — supply, energy, safety and
jobs.

## 4. Visas and migration

States set visa rules (`/visas`). Citizens of other states need an approved
visa to settle permanently; applications appear in `/visas`.

## 5. Patronage and satisfaction

Use `/civic` to support patronage projects. Satisfaction, supply and stability
feed back into elections and internal security.

## 6. Under the hood

The rules are in `population.config.ts`, `civilian-supply.config.ts` and
`stability.config.ts`. For the military side see [Conflict](/docs/conflict).
