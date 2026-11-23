---
title: Society — regions, residence and supply
description: "How people live, move and judge the state."
order: 10
category: "Everyday life & economy"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";

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

<DocArt kind="needs" label="Four needs, one threshold" caption="Food, water, electricity and heat are weighted 35/30/20/15. Below 0.85 coverage, hardship grows." />

A region's **education level** decides how many of its civilians can work in a
company: **20%** with no schools, **+5 percentage points per school level**, up
to **70%**. Each weekly tick (`/api/cron/workforce`) fills a factory's free
shifts from that pool, pays a wage out of the company budget, books the output
as revenue for the company and collects income tax for the state. A company
that cannot pay the wage simply employs fewer civilians; a drafted or sick
population shrinks the pool (see [Conflict](/docs/conflict)).

## 4. Visas and migration

States set visa rules (`/visas`). Citizens of other states need an approved
visa to settle permanently; applications appear in `/visas`.

## 5. Patronage and satisfaction

Use `/civic` to support patronage projects. Satisfaction, supply and stability
feed back into elections and internal security.

<Mermaid label="From supply to stability" chart={"flowchart LR\nF[Food · water · power · heat] --> H{Coverage ≥ 0.85?}\nH -->|no| SH[Hardship]\nSH --> O[Opinion −20 × hardship]\nSH --> T[Stability −14 × hardship]\nH -->|yes| C[Content citizens]\nC --> E[Elections: goodwill and votes]"} />

## 6. Under the hood

The rules are in `population.config.ts`, `civilian-supply.config.ts` and
`stability.config.ts`. For the military side see [Conflict](/docs/conflict).


## Deep dive: exact numbers

### Population (`population.config.ts`)

Population is clamped between **50,000** and **2,000,000** (floor 1,000). Each
region level adds people: infrastructure **80,000**, education **30,000**,
hospitals **30,000**, economy **20,000**. Terrain multipliers include city
**1.9**, urban **1.6**, town **1.3**, shore **1.1**, plains **1.0**, forest
**0.7**, mountain **0.5**, desert **0.45**, lake **0.35**. The base roll is
`60,000 + roll² × 900,000`, rounded to 100.

### Civilian work (`workforce.config.ts`)

`labourShare(educationLevel)` = **min(0.70, 0.20 + 0.05 × education)**. The
weekly cron passes that share of each region's population (further reduced by
conscription and hospital strain) into its factories' free slots. A civilian
earns **40%** of the factory's posted wage (`civilianWage`); their output is
valued per good (`civilianRevenue`, 60% of the posted production rate) and
credited to the company budget, while the wage is taxed as state income.

### Civilian needs (`civilian-supply.config.ts`)

Per civilian per day: **1 food**, **1 water**, **0.00005 MW electricity** and
**0.00005 MW heat**. Weights: food **0.35**, water **0.30**, electricity
**0.20**, heat **0.15**. The shortage threshold is **0.85**; food imports cover
up to **85%** of demand and water works serve **80,000** civilians.

Hardship feeds back into the state:

- `opinionLossFromHardship` = hardship × **20**,
- `stabilityFromHardship` = −hardship × **14**,
- extra deaths start above hardship 0.3: `((h−0.3)/0.7) × 0.02`,
- extra emigration starts above 0.2: `((h−0.2)/0.8) × 0.03`.

### Stability (`stability.config.ts`)

Base stability is **50**, opinion weight **0.4**, scale 0–100. Labels: loyal
≥70, stable ≥48, uneasy ≥32, unrest ≥18, collapsing ≥0.

| Modifier | Value |
| --- | --- |
| War crime per point | −0.4 (cap −25) |
| Conservation / standard / industrial / unrestricted environment | +6 / 0 / −6 / −12 |
| Conscription per permille | −1.2 (cap −18) |
| Education per level | +1.2 (cap +12) |
| Wage vs 1,500 reference | ±8 × normalized gap (min −10, max +10) |
| Cyber per point | −0.25 (cap −10) |
| Rally defence | +8 |
| Services penalty | −14 |
| Hospital shortfall | −12 |

Stability scales combat morale by **0.9–1.1×** and the war exhaustion limit by
**0.8–1.2×** (`stabilityMoraleFactor`, `stabilityWarLimitFactor`).

### Population dynamics

Births **1.2%/yr**, deaths **0.9%/yr**, war deaths **2%/yr**; unrestricted
exploitation adds **0.8%** annual deaths, industrial **0.3%**. Emigration
starts below stability **35** at **2%/yr**; total annual change is capped at
**5%**.

### Civic projects (`civic.config.ts`)

| Building | Wallet cost | Opinion | Days |
| --- | --- | --- | --- |
| water works | 25,000 | +6 | 5 |
| housing block | 40,000 | +8 | 8 |
| market hall | 30,000 | +5 | 6 |
| clinic | 55,000 | +9 | 10 |
| school annex | 45,000 | +7 | 9 |
| power relay | 60,000 | +8 | 12 |

A visa (`economy.config.ts`) costs **5,000**, lasts **30 days** and carries a
**20%** visa tax.

### Worked example — a healthy region

A city region (population factor 1.9) with infrastructure 3, education 2,
hospitals 1 and economy 2 starts from
`60,000 + roll² × 900,000`, multiplied by 1.9 and plus roughly
`3×80,000 + 2×30,000 + 1×30,000 + 2×20,000 = 370,000` from levels. Supply must
cover `0.35 food + 0.30 water + 0.20 power + 0.15 heat`; dropping below 0.85 in
any of them creates hardship and pushes stability down by up to 14 points.
