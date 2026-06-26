# Spec: Battle & War System

> HoI4-inspired combat system with wars between states, tactical battles over regions, and unit management.

---

## Overview

Wars are declared between **states** (or their **blocs**). Within a war, individual **battles** take place in specific **regions**. Players deploy their **military units** into battles. Combat is resolved in automated **rounds** based on unit stats, terrain, and fortifications.

---

## Domain Model

### War

A war is a conflict between two states (and optionally their blocs).

| Field            | Type          | Notes                               |
| ---------------- | ------------- | ----------------------------------- |
| `id`             | int PK        |                                     |
| `attackerId`     | FK → states   | The state that declared war         |
| `defenderId`     | FK → states   | The target state                    |
| `attackerBlocId` | FK → blocs    | Optional — if attacker is in a bloc |
| `defenderBlocId` | FK → blocs    | Optional — if defender is in a bloc |
| `declaredBy`     | FK → accounts | The president who declared it       |
| `status`         | enum          | `active`, `ended`                   |
| `surrenderedBy`  | FK → states   | Which state surrendered (if any)    |
| `declaredAt`     | timestamp     |                                     |
| `endedAt`        | timestamp     | Null while active                   |

**Rules:**

- Only a **president** can declare war.
- Cannot declare war on your own state.
- Cannot declare war on a state in the **same bloc**.
- Only one active war between any two states at a time.
- Wars end via **surrender** (full or conditional) or all battles resolved.

### Battle

A battle is a fight over a specific region within a war.

| Field               | Type          | Notes                                                                |
| ------------------- | ------------- | -------------------------------------------------------------------- |
| `id`                | int PK        |                                                                      |
| `warId`             | FK → wars     | Parent war                                                           |
| `regionId`          | FK → regions  | The contested region                                                 |
| `attackerStateId`   | FK → states   |                                                                      |
| `defenderStateId`   | FK → states   | Owner of the region                                                  |
| `phase`             | enum          | `preparation` → `planning` → `active` → `ended`                      |
| `terrain`           | enum          | `plains`, `forest`, `hills`, `mountain`, `urban`, `desert`, `jungle` |
| `status`            | enum          | `ongoing`, `attacker_won`, `defender_won`                            |
| `startedBy`         | FK → accounts |                                                                      |
| `preparationEndsAt` | timestamp     | 24h after battle start                                               |
| `startedAt`         | timestamp     |                                                                      |
| `endedAt`           | timestamp     |                                                                      |

### Battle Phases

```
┌─────────────┐    24h     ┌──────────┐    auto     ┌────────┐    victory   ┌───────┐
│ Preparation ├───────────→│ Planning ├────────────→│ Active ├────────────→│ Ended │
│  (join)     │            │ (bonus)  │             │(combat)│             │       │
└─────────────┘            └──────────┘             └────────┘             └───────┘
```

1. **Preparation** (24h) — Players assign units to the battle. No combat.
2. **Planning** — Planning bonus accumulates (+1% per hour, max 50%). Combat begins.
3. **Active** — Full combat with planning bonuses applied.
4. **Ended** — One side has no units with strength > 0.

### Battle Participant

Links a military unit to a battle.

| Field                 | Type               | Notes                        |
| --------------------- | ------------------ | ---------------------------- |
| `id`                  | int PK             |                              |
| `battleId`            | FK → battles       |                              |
| `unitId`              | FK → militaryUnits | Unique per battle            |
| `side`                | enum               | `attacker` or `defender`     |
| `currentStrength`     | int                | 0–100, starts at unit health |
| `currentOrganization` | int                | 0–100, starts at unit org    |
| `maxStrength`         | int                | 100                          |
| `damageTaken`         | int                | Cumulative                   |
| `damageDealt`         | int                | Cumulative                   |
| `isEngaged`           | bool               | True if within combat width  |
| `isExhausted`         | bool               | True if org < 20             |
| `destroyedAt`         | timestamp          | Set when strength = 0        |

### Battle Round

One tick of combat resolution.

| Field                  | Type | Notes                         |
| ---------------------- | ---- | ----------------------------- |
| `roundNumber`          | int  | Sequential per battle         |
| `attackerUnitsEngaged` | int  | Count                         |
| `defenderUnitsEngaged` | int  | Count                         |
| `attackerTotalDamage`  | int  | Raw damage dealt by attackers |
| `defenderTotalDamage`  | int  | Raw damage dealt by defenders |

### War Surrender

| Field           | Type          | Notes                  |
| --------------- | ------------- | ---------------------- |
| `warId`         | FK → wars     |                        |
| `stateId`       | FK → states   | The surrendering state |
| `surrenderType` | enum          | `full`, `conditional`  |
| `surrenderedBy` | FK → accounts |                        |
| `reason`        | text          |                        |

---

## Military Units

Units are trained by individual players and belong to them.

| Field                 | Type          | Notes                                          |
| --------------------- | ------------- | ---------------------------------------------- |
| `id`                  | int PK        |                                                |
| `name`                | text          | Auto-generated (e.g. "1st Infantry Battalion") |
| `ownerId`             | FK → accounts |                                                |
| `stateId`             | FK → states   | State at creation                              |
| `regionId`            | FK → regions  | Current location                               |
| `unitType`            | enum          | See unit types below                           |
| `organization`        | int           | 0–100                                          |
| `health`              | int           | 0–100 (= strength)                             |
| `supplyLevel`         | int           | 0–100                                          |
| `isTraining`          | bool          | Cannot fight while training                    |
| `trainingCompletesAt` | timestamp     |                                                |

### Unit Types

| Type               | Attack | Defense | Combat Width | Training (h) | Currency Cost |
| ------------------ | ------ | ------- | ------------ | ------------ | ------------- |
| `infantry`         | 15     | 20      | 2            | 6            | 50,000        |
| `armor`            | 50     | 40      | 4            | 12           | 200,000       |
| `mechanized`       | 30     | 30      | 3            | 10           | 150,000       |
| `artillery`        | 40     | 15      | 3            | 8            | 100,000       |
| `air_defence`      | 25     | 25      | 2            | 10           | 175,000       |
| `fighter_squadron` | 60     | 35      | 4            | 16           | 300,000       |
| `bomber_squadron`  | 70     | 20      | 5            | 18           | 350,000       |

Each type also requires **resources** (iron, steel, gunpowder) and **products** (rifles, ammunition, vehicles, etc.) — see `military.config.ts` for exact costs.

### Unit Name Generation

Auto-names use ordinal pattern: `1st Infantry Battalion`, `2nd Armored Battalion`, etc. If a number is already taken, it increments.

---

## Combat Mechanics

### Combat Width

Each terrain type has a **max combat width**. Only units whose combined width fits within this limit are **engaged** in a round. Excess units wait in reserve.

| Terrain    | Combat Width |
| ---------- | ------------ |
| `plains`   | 90           |
| `forest`   | 84           |
| `hills`    | 80           |
| `mountain` | 75           |
| `urban`    | 96           |
| `desert`   | 90           |
| `jungle`   | 84           |

Units are selected for engagement by **earliest join time** (FIFO).

### Damage Resolution (per round)

1. **Attackers** deal damage = sum of `baseAttack` of engaged units.
2. **Defenders** deal damage = sum of `baseDefense` of engaged units.
3. **Fortification** reduces attacker damage by `min(50%, fortLevel × 2%)`.
4. Damage is applied **sequentially** to engaged units (earliest first).
5. **Organization** loss = `damageTaken / 2`.
6. A unit with **strength = 0** is destroyed.

### Victory Conditions

- **Attacker wins**: All defender units at strength 0 → region ownership transfers to attacker state.
- **Defender wins**: All attacker units at strength 0 → region stays with defender.

### Joining a Battle

- **Defenders**: Must have residence **in the battle region** and be a citizen of the defending state.
- **Attackers**: Must have residence in a region that **borders the battle region** and be a citizen of the attacking state.
- Units must: not be training, health > 0, organization > 5, be in the correct region, not already in this battle.

---

## Routes

| Route                               | Purpose                                |
| ----------------------------------- | -------------------------------------- |
| `/battle/[id]`                      | Battle detail, join, execute rounds    |
| `/war/[id]`                         | War overview, battles list, surrenders |
| `/training`                         | Train new units, manage existing units |
| `/state/[id]` → `declareWar` action | Declare war (president only)           |

---

## Key Files

| File                                                            | Purpose                                        |
| --------------------------------------------------------------- | ---------------------------------------------- |
| `src/lib/config/game/military.config.ts`                        | Unit templates (stats, costs)                  |
| `src/lib/config/game/combat.config.ts`                          | Combat constants (widths, bonuses, thresholds) |
| `src/routes/(authenticated)/(dock)/battle/[id]/+page.server.ts` | Battle load + actions (join, combat rounds)    |
| `src/routes/(authenticated)/(dock)/war/[id]/+page.server.ts`    | War detail loader                              |
| `src/routes/(authenticated)/(dock)/training/+page.server.ts`    | Unit training (train, complete, disband)       |
