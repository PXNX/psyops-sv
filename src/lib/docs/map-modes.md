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
4. "Open in fleet console →" opens `/training?view=navy&hex=q,r` with that hex preselected.

<Mermaid label="Fog of war" chart={"sequenceDiagram\nparticipant P as Player\nparticipant M as Map\nparticipant S as Sea intel\nP->>S: Launch sonar sweep over hex\nS-->>P: Report (valid 12 h)\nP->>M: Open naval mode\nM->>M: Filter enemy ships by fresh report\nM-->>P: Contacts visible, rest hidden"} />

Enemy ships only appear if a fresh sea intel report (sonar, radar, SAR or air
reconnaissance) saw their hex in the last 12 hours. Without reconnaissance the
sea is blank.


## Deep dive: exact numbers

- Sea grid (`fleet.config.ts`): `HEX_BOUNDS` q **0–89**, r **0–44** = **4,050**
  hexes, about 4° per cell and roughly the size of one region. The grid lives
  in the 1400×600 map's own coordinates; `HEX_SIZE = 30` is only the radius used
  by the separate fleet console view.
- EEZ (`EEZ`): `radiusHexes = 2`. A coastal region's claim is grown from the
  **sampled outline of its actual shoreline**, not from its centroid: the
  nearest coastline owns each water hex. Hexes are painted before the land
  paths, so the real (non-hexagonal) coast clips them and a partial hex hugs
  the shore.
- Airspace (`AIRSPACE`): **4 columns × 3 rows = 12** sectors, labelled
  LR-A1 … LR-C4. Each sector is drawn as **one union-shaped region**: the
  hexes it contains (and their EEZs, shown as `H`) plus the land regions above
  them (`R`), not a bounding box.
- Projection (`src/lib/utils/military.ts`): the map is 1400×600; `latLonToMap`
  inverts a cubic fit of `mapToLatLon` (median error about 90 km). Because that
  projection is not linear, the hex grid is laid out in map space and
  `hexToLatLon` reads each centre's position off the projection.
- Fog of war (`SEA_INTEL_VALID_HOURS`): a sea report is fresh for **12 h**; only
  hexes covered by a fresh report reveal enemy ships.
- Ship positions come from `hexFromLatLon(lat, lon)`, which projects the
  position into the map and then reads the hex under that point (q 0…89,
  r 0…44).

Example: a region at 45°N, 10°E projects to about map point (736, 155), which
  falls on hex **54,9**; its EEZ covers the water hexes within two steps of
  the nearest sampled point of its coastline.
