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
