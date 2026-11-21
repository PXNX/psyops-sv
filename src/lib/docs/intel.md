---
title: Intelligence — recon, cyber and cover
description: "Find targets, exfiltrate data and cover your tracks."
order: 21
category: "Conflict & forces"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Intelligence — recon, cyber and cover

Whoever sees the enemy first wins. This guide links ground reconnaissance, sea
intel, cyber operations and tradecraft.

<Mermaid label="The intel chain" chart={"flowchart LR\nS[Sensor / asset] --> M[Launch mission]\nM --> W[Flight / scan time]\nW --> I[Intel report]\nI --> P[Picture & confidence]\nP --> Z[Battle / strike planner]\nI --> E[Exfiltration]\nE --> D[Dossier]"} />

## 1. Ground reconnaissance

From `/intel` launch drone and satellite passes over regions. Each sensor has
its own detection rates for infantry, vehicles, artillery and aircraft. Weather,
time of day, cover and air defence all affect the result.

Passes fuse into one **intel picture** per region, showing cover, units,
buildings and confidence. Battle planners use it.

## 2. Sea intelligence

Sonar, maritime radar and SAR sweep hexes. Sonar is the only sensor that
reliably finds submarines. Reports expire after 12 hours and drive the
[fog of war](/docs/map-modes).

## 3. Cyber and infiltration

Under `/ops` and `/ops/network` you place assets inside hostile networks:

1. recruit and insert an asset,
2. scan a host and find exposed services,
3. escalate privileges and pivot into other segments,
4. watch cameras, copy files and deploy payloads,
5. cover tracks before the asset burns.

Successful footholds improve uplink jamming, GNSS denial, C2 interception and
strike accuracy.

## 4. Cover and countermeasures

Buildings, weather and night reduce detection. Radar, air defence and cyber
defence make enemy passes harder. Use covert operations in `/ops` to hide your
own activity.

## 5. Under the hood

Rules live in `recon.config.ts`, `intel.ts`, `cyber.config.ts` and
`infiltration.config.ts`. Sea sensors are defined in `SEA_SENSORS`.
