---
title: Map and airspace
description: Use the naval, land and aerial modes and select hexes.
order: 24
category: "Conflict & forces"
---

<script>
  import Mermaid from "../component/Mermaid.svelte";
</script>

# Map and airspace

The [map](/map) has three modes in the top-left corner. Each shows a different
view of the same world.

<Mermaid label="Which mode for which question" chart={"flowchart TD\nQ[What do I want to know?] --> S[Where are ships and mines?]\nQ --> L[Where are my armies fighting?]\nQ --> A[Where does my air force cover?]\nS --> NM[Naval mode: EEZ, hexes, ports]\nL --> LM[Land mode: regions, units, battles]\nA --> AM[Aerial mode: Luftraum sectors LR-A1 …]\nNM --> H[Click a hex → detail panel → navy console]\nAM --> H"} />

![Luftraum sectors](/images/docs/luftraum.svg)

## Naval mode

- Shows only the sea and coastal regions. Inland regions fade out and land
  units, battles and army intel are hidden.
- Hexes exist only inside a coastal state's EEZ and are clipped to the real
  coastline — there are no hexes on land.
- Ports (⚓), ships and minefields (✳) sit on their hexes.
- Clicking a hex opens a panel with coordinates, EEZ owner, port, ships and
  mines, plus a link to the navy console.

## Land mode

Shows regions, land and air forces, battles, reconnaissance and airstrikes as
before. Sea overlays are hidden.

## Aerial mode

Several hexes and the regions above them are grouped into a **Luftraum**
(LR-A1 … LR-C4). Each sector shows the number of regions, ships and ready
aircraft.

## Selecting a hex

1. Switch to **Naval** or **Aerial**.
2. Click a hex (not a region).
3. The panel shows coordinates `q,r`, the EEZ owner and all contacts.
4. "Open in fleet console →" opens `/navy?hex=q,r` with that hex preselected.

<Mermaid label="Fog of war" chart={"sequenceDiagram\nparticipant P as Player\nparticipant M as Map\nparticipant S as Sea intel\nP->>S: Launch sonar sweep over hex\nS-->>P: Report (valid 12 h)\nP->>M: Open naval mode\nM->>M: Filter enemy ships by fresh report\nM-->>P: Contacts visible, rest hidden"} />

Enemy ships only appear if a fresh sea intel report (sonar, radar, SAR or air
reconnaissance) saw their hex in the last 12 hours. Without reconnaissance the
sea is blank.


## Deep dive: exact numbers

- Sea grid (`fleet.config.ts`): `HEX_BOUNDS` q **0–15**, r **0–10** = **176**
  hexes; SVG radius `HEX_SIZE = 30`.
- EEZ (`EEZ`): `radiusHexes = 2`; a port is placed one hex offshore
  (`portDistanceHexes = 1`) on the nearest free water hex.
- Airspace (`AIRSPACE`): **4 columns × 3 rows = 12** sectors, labelled
  LR-A1 … LR-C4.
- Projection (`src/lib/utils/military.ts`): the map is 1400×600; `latLonToMap`
  inverts a cubic fit of `mapToLatLon` (median error about 90 km).
- Fog of war (`SEA_INTEL_VALID_HOURS`): a sea report is fresh for **12 h**; only
  hexes covered by a fresh report reveal enemy ships.
- Ship positions are derived from `hexFromLatLon(lat, lon)`, which maps longitude
  −180…180 onto q 0…15 and latitude 90…−90 onto r 0…10.

Example: a port built for a region at 45°N, 10°E lands on
`q = round((190/360)×15) = 8`, `r = round((45/180)×10) = 3` — hex **8,3**,
with its EEZ covering hexes within two steps of it that are not on land.
