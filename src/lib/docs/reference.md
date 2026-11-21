---
title: Reference — where the rules live
description: How to find and verify the exact numbers behind every tutorial.
order: 98
category: "Reference"
---

# Reference — where the rules live

Every number quoted in these tutorials comes from a config file in
`src/lib/config/`. The client and the server import the **same** modules, so a
value shown in the UI is the value the resolver uses. When a guide and the game
disagree, the config file wins — and the guide should be updated.

## Config map

| File | What it defines |
| --- | --- |
| `game/economy.config.ts` | Wages, resource and product prices, money flows |
| `game/production.config.ts` | Factory recipes, input/output, cycle times |
| `game/buildings.config.ts` | Building costs, levels and effects |
| `game/military.config.ts` | Unit templates: attack, defence, width, training time and costs |
| `game/exercise.config.ts` | Experience gains, caps, fuel and supply costs |
| `game/combat.config.ts` | Battle maths, terrain, supply and morale modifiers |
| `game/war.config.ts` | War exhaustion, surrender and capitulation rules |
| `game/strike.config.ts` | Air/missile strike tiers, targets, weapons and odds |
| `game/domains.config.ts` | The five domains and which unit belongs to where |
| `game/recon.config.ts` | Land sensors and the `SEA_SENSORS` table |
| `game/cyber.config.ts`, `game/infiltration.config.ts` | Network operations, assets and tradecraft |
| `game/naval.config.ts` | Legacy state-level naval operations and blockade effects |
| `game/fleet.config.ts` | Hex grid, ship classes, weapons, ports/docks, GNSS and EEZ/Airspace |
| `game/aircraft.config.ts` | Squadron roles, stats and the directed air missions |
| `game/space.config.ts`, `game/ai.config.ts` | Satellites, space ops and research AI |
| `game/population.config.ts`, `game/civilian-supply.config.ts` | Citizens, needs and supply |
| `game/stability.config.ts`, `game/energy.config.ts` | Regime stability and the power grid |

The central export point is `src/lib/config/index.ts`; it re-exports every game
config so both browser and server code import from one place.

## How to read a value

1. Open the config file named in the table above.
2. Find the exported `const` or function (for example `FACILITY.portUpgrade` or
   `SEA_SENSORS.sonar`).
3. Check the unit: costs are usually currency, durations are hours or minutes,
   distances on the sea grid are hexes, and chances are `0–1` fractions.

Worked example: if a config says `durationHours: 3`, the cron completes the
order after three one-hour ticks, i.e. after the next three scheduled runs.

## Helpers worth knowing

- `getExperienceLevel(experience)` and `getExperienceCombatModifier(...)`
  convert a raw experience number into a combat multiplier.
- `hexFromLatLon(...)` / `hexToLatLon(...)` map real coordinates to the sea
  grid, which is how ports land inside a region's EEZ.
- `repairCost(...)`, `portUpgradeCost(...)` and `dockUpgradeCost(...)` scale
  prices by level.
- `hitChance(...)` combines range, point defence, stealth and GNSS jamming.

## Changing a number

Config files are pure data and pure functions — no database or SvelteKit
imports. Editing one changes both the planner UI and the server resolver, which
is why the tutorials quote config values rather than duplicating them. After a
schema change, run `bun x drizzle-kit push`; after a docs change, `bun run build`
checks that every Mermaid diagram and link still compiles.
