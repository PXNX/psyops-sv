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

The **Navy** console (`/navy`) is the command centre for everything that
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

Select a hex and launch a sonar, radar or SAR sweep under **Sea intel**. Sonar
finds submarines; radar and SAR find surface hulls and mines. Reports expire
after 12 hours and drive the map's fog of war.

## 10. Next steps

Aircraft and directed sorties are covered in [Air power](/docs/air), map modes
in [Map & airspace](/docs/map-modes).
