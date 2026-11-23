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

- Brings the sea hex grid, EEZs and coastal regions to the front. Regions stay
  visible; land units, battles and army intel are hidden.
- Each coastal region's **EEZ** is the band of coloured water between its
  shoreline and the hex grid — there are no hex outlines inside it. The hex
  map starts at the EEZ's dashed seaward edge and covers the rest of the sea,
  clipped so no hexes sit on land.
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

Click a hex and use **Sea intel** in its panel to launch EO, IR, SAR, sonar or
radar over it. EO identifies hulls, IR works at night, SAR sees through cloud,
sonar finds submarines and radar sweeps wide. The report also produces a
procedural sensor frame — open **View imagery** to see the sea state, contacts
and, for a coast, the region's real outline with its beach, cliffs and palms.
Enemy ships only appear if a fresh
sea intel report (EO, IR, SAR, sonar, radar or air
reconnaissance) saw their hex in the last 12 hours. Without reconnaissance the
sea is blank.


## Deep dive: exact numbers

- Sea grid (`fleet.config.ts`): `HEX_BOUNDS` q **0–49**, r **0–24** = **1,250**
  hexes, about 7° per cell — large enough to pick out individual cells on the
  1400×600 map. The grid lives in the map's own coordinates; `HEX_SIZE = 54` is
  only the radius used by the standalone console helpers. Each cell carries a
  sea state: ❄ icy at high latitude, ≋ stormy on a rolling six-hour roll.
- EEZ (`EEZ`): `radiusHexes = 2`. A coastal region's claim is grown from the
  **sampled outline of its actual shoreline**, not from its centroid: the
  nearest coastline owns each water hex. Those two rings form the EEZ band —
  filled with the region's colour but drawn without hex outlines — so the hex
  grid ends at its dashed seaward edge. Everything is painted before the land
  paths, so the real (non-hexagonal) coast clips the band to the shoreline.
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
  position into the map and then reads the hex under that point (q 0…49,
  r 0…24).

Ctrl/Cmd-click (or the multi-select rail button) holds several hexes for a
fleet order. A fleet formed in the Navy console can then be ordered to hold
that area; its commander's traits affect every ship in it.

Coastal regions remain visible in naval mode. With sea dominance you can make a
**naval landing** there; with air dominance a **paradrop**. Coastal air
defence and fortifications raise the failure risk of both.
