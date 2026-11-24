---
title: Intelligence — recon, cyber and cover
description: "Find targets, exfiltrate data and cover your tracks."
order: 21
category: "Conflict & forces"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
  import DocArt from "../component/docs/DocArt.svelte";
  import SensorMatrix from "../component/docs/SensorMatrix.svelte";

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

<SensorMatrix />

<DocArt kind="intel" label="No single sensor sees everything" caption="Drone EO spots infantry, SAR sees metal through cloud, sonar finds submarines. Combine passes to raise confidence." />

## 2. Sea intelligence

Sonar, maritime radar and SAR sweep hexes. Sonar is the only sensor that
reliably finds submarines. Reports expire after 12 hours and drive the
[fog of war](/docs/map-modes).

<DocArt kind="fog" label="Fresh reports only" caption="A sonar sweep reveals the ships in one hex, but the contact disappears again after 12 hours." />

## 3. Cyber and infiltration

Under `/ops` and `/ops/network` you place assets inside hostile networks:

1. recruit and insert an asset,
2. scan a host and find exposed services,
3. escalate privileges and pivot into other segments,
4. watch cameras, copy files and deploy payloads,
5. cover tracks before the asset burns.

Successful footholds improve uplink jamming, GNSS denial, C2 interception and
strike accuracy.

<DocArt kind="cyber" label="A quiet intrusion" caption="Scan, escalate, pivot, copy files — each step raises heat. Cover tracks before the asset burns." />

## 4. Cover and countermeasures

Buildings, weather and night reduce detection. Radar, air defence and cyber
defence make enemy passes harder. Use covert operations in `/ops` to hide your
own activity.

## 5. Under the hood

Rules live in `recon.config.ts`, `intel.ts`, `cyber.config.ts` and
`infiltration.config.ts`. Sea sensors are defined in `SEA_SENSORS`.

<Mermaid label="Asset heat" chart={"stateDiagram-v2\n[*] --> Inserted: Recruit and insert\nInserted --> Access: Scan and probe\nAccess --> Foothold: Escalate and pivot\nFoothold --> Burned: Heat reaches 100\nFoothold --> Hidden: Cover tracks (−35 heat)\nHidden --> Foothold: Keep working\nBurned --> [*]"} />


## Deep dive: exact numbers

### Land sensors (`recon.config.ts` → `SENSORS`)

| Sensor | Cost | Duration | Cooldown | Base detection (inf / veh / arty / air) |
| --- | --- | --- | --- | --- |
| drone EO | 1,500 | 10 min | 30 min (user) | .85 / .90 / .85 / .80 |
| drone IR | 2,500 | 10 min | 30 min (user) | .55 / .90 / .90 / .85 |
| satellite EO | 6,000 | 30 min | 180 min (state) | .70 / .85 / .80 / .90 |
| satellite IR | 8,000 | 30 min | 240 min (state) | .35 / .80 / .85 / .80 |
| satellite SAR | 10,000 | 30 min | 360 min (state) | .10 / .90 / .85 / .90 |

Detection threshold **0.20**, estimate error ±`0.6 × (1 − p)`. Reports stay
valid **24 h**, decay by **0.5** with age and are retained **14 days**.
Confidence bands: low 0.15, medium 0.45, high 0.75. Weather changes every
**3 h** (clear 45%, cloudy 30%, rain 15%, fog 10%); night is 20:00–06:00.
Drone EO at night falls to ×0.35, satellite EO to 0, while IR sensors get ×1.1.

### Sea sensors (`SEA_SENSORS`)

| Sensor | Cost | Duration | Cooldown | Radius | surface / sub / mine |
| --- | --- | --- | --- | --- | --- |
| sonar | 4,000 | 15 min | 30 min (user) | 1 | .25 / .90 / .65 |
| naval radar | 6,000 | 20 min | 45 min (user) | 2 | .90 / 0 / .35 |
| satellite SAR | 8,000 | 30 min | 180 min (state) | 2 | .80 / 0 / .25 |

Sea reports expire after **12 hours** (`SEA_INTEL_VALID_HOURS`).

### Cyber operations (`cyber.config.ts`)

| Operation | Cost | Success | Attribution | Duration | Cooldown |
| --- | --- | --- | --- | --- | --- |
| grid attack | 60,000 | .60 | .35 | 12 h | 24 h |
| C2 disruption | 45,000 | .60 | .30 | 6 h | 12 h |
| financial theft | 30,000 | .45 | .45 | instant | 48 h |
| comms intercept | 38,000 | .62 | .28 | 12 h | 18 h |
| air-defence spoof | 52,000 | .55 | .40 | 8 h | 24 h |
| supply chain | 48,000 | .58 | .35 | 18 h | 30 h |

Cyber defence max level **5**, each level −7% enemy success and +6%
attribution; upgrade cost `40,000 × (level+1)`. Each network asset adds +4%
success and −3% attribution (cap 3 assets). Theft is capped at **200,000** and
you keep **50%**.

### Infiltration (`infiltration.config.ts`)

Assets: relay 18,000 (access 1), agent 42,000 (2), botnet 28,000 (2), implant
55,000 (3), insider 80,000 (4). Actions: probe 1,000 / +4 heat / .95 chance,
camera 2,500 / +10 / .85, files 6,000 / +20 / .70, cover 9,000 / −35 / 1.00.
`actionChance = base + (access − security) × 0.1 − heat / 500`, clamped
**0.15–0.98**. Heat decays **3/hour**, max **100**.

Interactive intrusions (`intrusion.config.ts`): scan 900, access 1,800,
escalate 1,500, pivot 2,200; base chances .62 / .68 / .72, modified by
`(access − security) × 0.09` and vector bonuses up to +0.30.

### Satellites (`space.config.ts`)

Recon 250,000 / 12 h / +0.12 recon; navigation 300,000 / 16 h / +0.08 GPS;
comms 180,000 / 8 h / +0.10 resilience; early warning 350,000 / 20 h / +0.15.
GPS bonus caps at **25%**. ASAT strike costs 400,000 with .55 base success;
space defence max level 4, −6% success per level.

### Worked example — finding a submarine

A submarine has stealth 10. Satellite SAR has a **0** sub detection chance, so
it will never see it. A sonar sweep at 4,000 credits has **0.90** detection in
its one-hex radius and costs 15 minutes plus a 30-minute cooldown.
