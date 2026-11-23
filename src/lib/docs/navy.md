---
title: Naval warfare — ships, ports and docks
description: "Step by step: from your first port to a blockaded sea."
order: 22
category: "Conflict & forces"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Naval warfare — ships, ports and docks

The **Navy** tab of [Forces](/training) (`/training?view=navy`) is the command centre for everything that
happens on the water. The ocean is divided into a hexagonal grid. Each move
takes hours and burns fuel; the fleet cron advances every leg every 15 minutes.

<Mermaid label="From a port to a ready ship" chart={"flowchart LR\nC[Coastal region] -->|one port per region| P[Port in its EEZ]\nP -->|build dock| D[Dock with build bays]\nD -->|queue order| Q[Ship under construction]\nQ -->|cron tick| S[Ready ship]\nS -->|move + target hex| F[Hex movement]\nS -->|sonar / SAR| I[Sea intel report]"} />

![Hex sea with EEZ, port, ship and minefield](/images/docs/hex-sea.svg)

## 1. Find a coast

Open the [map](/map) and switch to **Naval** mode. Only the sea and coastal
regions (terrain "shore") are visible; inland regions fade out. Each coastal
region claims an **EEZ** — two rings of offshore water clipped to the real
coastline.

Click a hex to see its EEZ owner, ships, mines and port. "Open in fleet
console" takes you straight to the navy console with that hex selected.

## 2. Build a port

In the navy console pick **Build port**, enter a name and choose one of your
coastal regions. There is exactly **one port per region**; it is placed on the
nearest free hex inside the region's EEZ. A port:

- stores fuel (slowly refilled from the state's military reserve),
- holds cargo for loading and unloading,
- can be expanded to level 5 for more fuel storage.

## 3. Build and expand a dock

Click **Build dock** in the same panel. A dock has as many build bays as its
level (up to 4). Each level costs more money and steel, but runs more jobs in
parallel and repairs hulls faster.

## 4. Order ships

In the **Shipyard** choose a dock and a ship class. The order enters the queue;
work starts as soon as a bay is free. When the timer ends, the ship appears in
the port at full health with fuel.

| Class | Role |
| --- | --- |
| Carrier | Fighters, long aerial reach |
| Frigate | VLS, can lay mines |
| Helipad cruiser | Anti-submarine helicopters |
| Support ship / tanker | Refuel other ships at sea |
| Corvette / destroyer / light AA | Escort, VLS, air defence |
| Torpedo / VLS submarine | Stealth, torpedoes or missiles |
| Container / Ro-Ro / tanker | Cargo between ports |

## 5. Move ships

Select a ship on the map or in the fleet list, click **Move**, then click a
destination hex. The ship advances one hex per tick and burns fuel. **Hold**
cancels the order. Civilian hulls route around foreign minefields; warships
sail through and take damage.

<Mermaid label="How a blockade works" chart={"flowchart TD\nM[Minelayer in a hex] -->|Lay mines| F[Minefield, 48 h]\nF --> Z{Civilian or warship?}\nZ -->|civilian| S[Passage denied — port blockaded]\nZ -->|warship| D[Damage on entry]\nD -->|strength spent| X[Minefield disappears]"} />

## 6. Refuel and cargo

At one of your ports click **Refuel**. Cargo ships load and unload goods with
the Goods / Amount / Load–Unload form. Tankers and support ships can also
refuel neighbouring ships at sea.

## 7. Mines and blockade

Ships with minelaying gear (frigate, submarine) can **Lay mines** on their
current hex. Merchant hulls refuse to enter a mined hex, so a ring around a
port blockades it. Warships that push through take damage. Mines expire after
48 hours.

## 8. GNSS jamming

GNSS jamming can come from a jammer ship at sea, an air-defence battalion on
land or fighter squadrons with EW pods in the air. All hostile emitters in
range add up per hex. A jammed ship steams slower and hits less often; the
strength is shown on its ship card.

## 9. Sea intelligence

Select a hex and launch an EO, IR, SAR, sonar or radar sweep under **Sea intel**
— either here in the Navy tab or from a hex's panel on the [map](/map). EO names
hull types in clear conditions, IR works at night, SAR sees through cloud, sonar
finds submarines, and maritime radar sweeps a wide area. Reports expire
after 12 hours and drive the map's fog of war.

## 10. Next steps

Aircraft and directed sorties are covered in [Air power](/docs/air), map modes
in [Map & airspace](/docs/map-modes).


## Deep dive: exact numbers

All values below come from `fleet.config.ts` and `naval.config.ts`.
The sea grid is `q = 0–59`, `r = 0–29` (1,800 cells, about 6° per cell);
`HEX_SIZE = 45` is only the radius of the standalone console helpers. The grid
is laid out in the world map's 1400×600 space, so `hexToLatLon` reads positions
off the map projection. An EEZ reaches `EEZ.radiusHexes = 2` rings from the
sampled coastline and a port sits one hex offshore.

**Fleets and commanders.** Several ships can be formed into a fleet on the
Navy tab; Ctrl/Cmd-click hexes on `/map` and assign the fleet to hold them. The
state officer academy graduates commanders (24 h, 75,000 credits and 250
steel); each has 0–3 traits, ten small experience levels and can be wounded or
killed when ships under their command are lost. Assign one to a fleet,
airgroup or division from that group's panel. Coastal regions can be stormed
by naval landing or paradrop when sea or air dominance is established.

### Ship classes (`SHIP_CLASSES`)

| Class | Category | HP | h/hex | Fuel / per hex | Build (money / steel / hours) | Weapons |
| --- | --- | --- | --- | --- | --- | --- |
| carrier | capital | 220 | 2.0 | 240 / 8 | 3,500,000 / 3,000 / 48 | fighters 3/16, light AA 2/12 |
| frigate | capital | 140 | 1.5 | 160 / 5 | 1,200,000 / 1,100 / 20 | VLS 3/22, light AA |
| helipad cruiser | capital | 170 | 1.8 | 190 / 6 | 1,600,000 / 1,500 / 26 | ASW heli 2/18, light guns 1/10 |
| support ship | escort | 110 | 2.0 | 300 / 6 | 650,000 / 700 / 14 | — (fuel transfer, 300 fuel cargo) |
| corvette | escort | 90 | 1.0 | 100 / 3 | 320,000 / 320 / 8 | light guns 1/10 |
| destroyer | escort | 130 | 1.2 | 150 / 4 | 900,000 / 850 / 16 | VLS 3/22, light AA |
| light AA | escort | 80 | 1.0 | 90 / 3 | 280,000 / 280 / 7 | light AA 2/12, AA 16 |
| GNSS jammer | escort | 95 | 1.2 | 140 / 4 | 780,000 / 520 / 13 | jammer 3/0, light AA |
| torpedo sub | submarine | 70 | 1.5 | 120 / 3 | 700,000 / 600 / 15 | torpedo 1/34, stealth 10 |
| VLS sub | submarine | 80 | 1.6 | 130 / 3 | 1,050,000 / 900 / 19 | VLS 3/22, stealth 8 |
| container ship | civilian | 80 | 2.5 | 140 / 4 | 420,000 / 450 / 12 | 900 container cargo |
| Ro-Ro ferry | civilian | 90 | 2.0 | 110 / 3 | 300,000 / 330 / 10 | 500 vehicle cargo |
| tanker | civilian | 85 | 2.2 | 130 / 4 | 380,000 / 400 / 11 | 1,200 fuel cargo |

Capital sea-control points (`SEA_CONTROL_POINTS`): frigate **3**, submarine
**2**, carrier **5**, landing ship **1**. Sea control strength is
`points / (points + 10) × (1 − min(0.6, (air + sea) × 0.02))`.

### Facilities and queues

| Item | Cost | Limit |
| --- | --- | --- |
| Port | 800,000 + 600 steel | one per coastal region, max level 5 |
| Port upgrade | 600,000 × next level + 500 × next level steel | adds fuel storage |
| Dock | 1,000,000 + 900 steel × level | max level 4 |
| Minefield | 40,000 + 20 steel | 48 h lifetime |
| Port fuel | 400 base + 250 per level, +12/h regen | from state reserve |

Repairs cost `(build money / hp) × missing × 0.6` (minimum 1,000); repair time
is `(missing / hp) × build hours / dock level`. New construction takes
`build hours / dock level`.

### Combat and mines

`hitChance = 0.82 − (distance−1)×0.13 − GNSS penalty − target AA × weight −
sub stealth × 0.01`, clamped to **0.05–0.95**. AA weight is 0.035 for
fighters/VLS, 0.02 for light AA and 0.012 otherwise.

A mine detonation costs **35** strength and deals `strength × 1.1` to civilians
or `strength × 0.7` to warships; the field disappears at strength 0.

GNSS jamming strengths are **12** (sea), **6** (land air-defence battalion) and
**8** (air fighter squadron), capped at **30**. Each point slows ships by 2.5%
(minimum speed factor 0.45) and reduces accuracy by 1.2% (cap 35%).

### Legacy naval operations (`naval.config.ts`)

| Operation | Cost | Duration | Cooldown | Success base |
| --- | --- | --- | --- | --- |
| blockade | 120,000 | 48 h | 24 h | 0.75 |
| shore bombardment | 90,000 | 6 h | 6 h | 0.80 |
| amphibious assault | 150,000 | instant | 24 h | 0.70 |
| sea-lane raid | 60,000 | 12 h | 12 h | 0.70 |
| minelaying | 40,000 | 24 h | 12 h | 0.85 |

A blockade cuts trade by **45%**, energy imports by **25%**, adds **50%** to
intercepted smuggling and drains 4,000/hour from the target. Bombardment hits
on **0.65** (minus defence), removes one infrastructure level and harms 4
civilians per 1,000 in the danger zone.

### Worked example — moving a frigate through jamming

A frigate with 160 fuel crosses 10 hexes at 5 fuel/hex = **50 fuel**. If enemy
GNSS strength is 12, `gnssSpeedFactor(12) = 1 − 12×0.025 = 0.70`, so each 1.5 h
leg takes **2.1 h** and the trip takes about **21 h** instead of 15.
