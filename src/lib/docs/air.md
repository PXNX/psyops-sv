---
title: Air power and missions
description: Train squadrons, manage fuel and experience, and task missions.
order: 23
category: "Conflict & forces"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Air power and missions

Aircraft are trained under **Forces** (`/training`) and controlled in the navy
console under **Air operations**. Every squadron has a role, burns fuel and
gains experience.

<Mermaid label="Life cycle of a sortie" chart={"flowchart LR\nT[Forces: train squadron] --> E[Experience + fuel]\nE --> A[Air operations: choose task]\nA --> R{Role matches?}\nR -->|no| X[rejected]\nR -->|yes| L[Launch mission — fuel spent now]\nL --> C[Cron: flight time]\nC --> W[Effect + experience gain]"} />

![Luftraum sectors on the map](/images/docs/luftraum.svg)

## 1. Train squadrons

On the **Forces** page choose one of these types. Training takes several hours
and costs money and materials.

| Type | Role | What it does |
| --- | --- | --- |
| Transport aircraft | Airlift | Moves troops and supply between regions |
| Bomber | Strategic bombing | Hits industry and infrastructure |
| Tanker aircraft | Refuelling | Passes fuel to ships or units |
| Fighter jet | Air superiority | Intercepts enemy aircraft |
| Close air support | Close support | Eases pressure on a front line |
| Naval bomber | Naval strike | Attacks ships from coastal airfields |
| Helicopter | Utility / ASW | Small loads, best submarine hunter |

## 2. Fuel and experience

- **Fuel** is burned in combat and on missions. An empty squadron fights at
  half strength. The cron refills tanks from the state's military reserve; the
  FUEL bar on the Forces page shows the current level.
- **Experience** rises through exercises (+10) and every mission or battle in
  which the squadron fired. Veterans deal more damage (recruit 1.0 → elite
  1.2). Casualties dilute experience.

## 3. Task a mission

In the navy console open **Air operations**:

1. select a ready squadron (fuel and experience shown),
2. choose a mission type,
3. pick a target — regions via the dropdown, sea targets via a map hex,
4. click **Launch mission**.

The mission requires the matching role; a fighter jet cannot fly strategic
bombing, for example. Fuel is deducted immediately and the effect lands when
the flight timer completes.

| Mission | Target | Effect |
| --- | --- | --- |
| Strategic bombing | Region | Infrastructure and economy reduced |
| Logistic strike | Region | Supply cut for 12 h |
| Naval bombing | Hex | Enemy ship in the hex damaged |
| Airlift | Own region | Supply boost for 12 h |
| Reconnaissance | Hex | Sea intel report with contacts and mines |
| Refuel | Own region | Ships at the port refuelled |
| Battlefield support | Region | Supply pressure eased for 6 h |

<Mermaid label="Role determines mission" chart={"flowchart TD\nB[Bomber] --> SB[Strategic bombing]\nB --> LS[Logistic strike]\nN[Naval bomber / helicopter] --> NB[Naval bombing]\nN --> ASW[Submarine hunt at sea]\nTR[Transport aircraft] --> AL[Airlift]\nTK[Tanker] --> RF[Refuel]\nF[Fighter jet] --> AO[Air superiority]\nCS[Close air support] --> BS[Battlefield support]\nH[Helicopter · utility] --> RC[Reconnaissance]"} />

## 4. Airspace on the map

In **Aerial** mode on the [map](/map), several hexes and the regions above them
are grouped into one **Luftraum** sector (LR-A1 …). The label counts regions,
ships and ready aircraft.

## 5. A typical opening

1. Train a tanker and a transport squadron first.
2. Start sea reconnaissance over a hex (sonar for submarines).
3. Send a naval bomber against the detected ship.
4. Refuel and check experience after combat.
5. Lay mines to stop enemy merchant traffic at the entrance.


## Deep dive: exact numbers

Values come from `aircraft.config.ts`, `military.config.ts` and
`exercise.config.ts`.

### Squadron stats (`AIRCRAFT`)

| Type | Attack / defence | Range (hexes) | Special | Fuel capacity / per sortie |
| --- | --- | --- | --- | --- |
| transport aircraft | 8 / 20 | 7 | transport 400 | 160 / 20 |
| bomber | 80 / 22 | 9 | bombing | 240 / 40 |
| tanker aircraft | 6 / 25 | 8 | refuel 300 | 200 / 25 |
| fighter jet | 65 / 45 | 6 | air superiority | 180 / 30 |
| close air support | 55 / 30 | 4 | close support | 140 / 22 |
| naval bomber | 75 / 28 | 8 | ASW 8, naval strike | 220 / 36 |
| helicopter | 22 / 24 | 3 | ASW 10, transport 80 | 120 / 18 |

### Directed missions (`AIR_MISSIONS`)

| Mission | Role | Target | Duration | Fuel | Magnitude |
| --- | --- | --- | --- | --- | --- |
| strategic bombing | bombing | region | 3 h | 40 | 2 levels |
| logistic strike | bombing | region | 2 h | 30 | 25 supply |
| naval bombing | naval strike | hex | 2 h | 35 | 45 damage |
| airlift | transport | own region | 2 h | 25 | 120 supply |
| reconnaissance | utility | hex | 1 h | 20 | full picture |
| refuel | refuel | own region | 1 h | 15 | 200 fuel |
| battlefield support | close support | region | 1 h | 25 | 20 supply |

Only the helicopter carries the **utility** role, so it is the squadron that
can fly the reconnaissance mission. Strategic bombing removes 2 infrastructure
and 1 economy from the target region; naval bombing has an 80% hit chance and
deals 45 damage (or 15 on a miss).

### Training and experience (`exercise.config.ts`)

- Exercise: **8 h**, **+10** experience, requires organization ≥ **30**,
  costs **25** organization, **20** supply and **15%** of build cost.
- Exercise experience cap: **50**. Combat can push to **100**.
- Combat grants **+3** experience per firing round and burns **4** fuel;
  air sorties burn **12** fuel.
- Levels: recruit 0 (×1.00), trained 20 (×1.05), regular 40 (×1.10), veteran
  60 (×1.15), elite 80 (×1.20).
- Refuelling restores **15** fuel per unit per cron tick from the state reserve.

### Worked example — one naval bombing run

A naval bomber (220 fuel, 36 per sortie) can fly **6 sorties** before needing
refuel. Each sortie takes 2 h and deals 45 damage on an 80% roll — expected
**36 damage per sortie**. After three hits a frigate (140 HP) is down to 12 HP;
a fourth sortie sinks it. The crew gains +3 experience per strike, reaching
veteran (60) after twenty successful missions.
