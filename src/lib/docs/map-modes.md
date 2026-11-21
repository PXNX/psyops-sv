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
