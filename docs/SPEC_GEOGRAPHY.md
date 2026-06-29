# Spec: Geography

> Regions, borders, travel, residency, and the world map.

---

## Overview

The game world is divided into **regions** (700+ real-world-inspired provinces). Regions belong to **states**. Regions are connected by **borders** with distance values. Players have a single **residence** in one region and can **travel** between connected regions.

---

## Domain Model

### Region

| Field            | Type        | Notes                            |
| ---------------- | ----------- | -------------------------------- |
| `id`             | int PK      |                                  |
| `latitude`       | decimal     | For map placement                |
| `longitude`      | decimal     | For map placement                |
| `stateId`        | FK → states | Which state controls this region |
| `rating`         | int         | Overall development level        |
| `infrastructure` | int         | Roads, railways                  |
| `economy`        | int         | Economic development             |
| `education`      | int         | Education level                  |
| `hospitals`      | int         | Healthcare capacity              |
| `fortifications` | int         | Military defense level           |
| `oil`            | int         | Natural resource                 |
| `aluminium`      | int         | Natural resource                 |
| `rubber`         | int         | Natural resource                 |
| `tungsten`       | int         | Natural resource                 |
| `steel`          | int         | Natural resource                 |
| `chromium`       | int         | Natural resource                 |

Region names are stored in the **i18n message files** (`messages/en.json`) as `region_1` through `region_762`. They are resolved via the `getRegionName(id)` utility function.

### Region Borders

Defines adjacency between regions with travel distance.

| Field        | Type         | Notes           |
| ------------ | ------------ | --------------- |
| `id`         | int PK       |                 |
| `regionId`   | FK → regions |                 |
| `neighborId` | FK → regions |                 |
| `distanceKm` | int          | Travel distance |

Unique: (regionId, neighborId). Check constraint: `regionId < neighborId` to avoid duplicates.

### State Borders

Controls whether a state's borders are open or closed.

| Field                   | Type          | Notes                             |
| ----------------------- | ------------- | --------------------------------- |
| `stateId`               | FK → states   | **Unique**                        |
| `status`                | enum          | `open`, `closed`                  |
| `maintenanceCostPerDay` | int           | 50,000 per day for closed borders |
| `lastMaintenancePaid`   | timestamp     |                                   |
| `closedBy`              | FK → accounts |                                   |

**Closed borders:**

- Daily maintenance cost: 50,000 currency
- Also requires: 10 steel, 20 gunpowder per day
- Prevents entry without a visa

---

## Residency

### Residence

Each user has exactly **one** residence record with two region references:

| Field          | Type          | Notes                                                       |
| -------------- | ------------- | ----------------------------------------------------------- |
| `userId`       | FK → accounts | **Unique**                                                  |
| `regionId`     | FK → regions  | **Current region** – where the user physically is right now |
| `homeRegionId` | FK → regions  | **Residence** – permanent home / citizenship region         |
| `movedInAt`    | timestamp     | Last time `regionId` changed                                |

**Current region** (`regionId`) changes every time a user travels. It determines:

- Where the user can work (factories in the same region)
- Physical location on the map

**Residence** (`homeRegionId`) is the user's permanent home and citizenship. It determines:

- Which state they belong to (citizenship)
- Which chat channels they see (state chat)
- Which elections they can vote in
- Which battles they can join (defenders: same region; attackers: bordering region)
- Tax jurisdiction
- Which state they can create political parties in
- Whether they need a visa to enter a foreign state

### Residency Applications

For states that require approval for immigration.

| Field        | Type          | Notes                             |
| ------------ | ------------- | --------------------------------- |
| `userId`     | FK → accounts |                                   |
| `regionId`   | FK → regions  |                                   |
| `status`     | enum          | `pending`, `approved`, `rejected` |
| `reviewedBy` | FK → accounts |                                   |

---

## Travel

### User Travel

One active travel per user.

| Field            | Type          | Notes                                   |
| ---------------- | ------------- | --------------------------------------- |
| `userId`         | FK → accounts | **Unique**                              |
| `fromRegionId`   | FK → regions  |                                         |
| `toRegionId`     | FK → regions  | Must be adjacent                        |
| `departureTime`  | timestamp     |                                         |
| `arrivalTime`    | timestamp     |                                         |
| `travelDuration` | int           | Seconds                                 |
| `status`         | enum          | `in_progress`, `completed`, `cancelled` |
| `distanceKm`     | int           |                                         |

**Travel flow:**

1. Player initiates travel to an adjacent region.
2. Travel duration is calculated based on `distanceKm`.
3. A progress bar shows on the dashboard during travel.
4. On arrival (client polls `/api/travel/arrive`), residence is updated.
5. Travel can be cancelled (returns to origin).

**During travel:**

- The user sees a `TravelProgress` component on the dashboard.
- Travel can be cancelled.
- Actions that require being in a specific region may be restricted.

---

## World Map

Route: `/map`

- Uses **Leaflet** + **Sveaflet** for interactive map rendering.
- Regions are rendered as SVG polygons with state colors.
- Each region on the map is clickable → links to `/region/[id]`.
- Custom SVGs for each region stored in `tools/states/*.svg`.
- Region coordinate data in `tools/regions.json`.
- Pan & zoom with **panzoom** library.

---

## Infrastructure & Buildings

Regions can have buildings built via parliamentary proposals.

| Building Type    | Cost (Currency) | Power Draw    | Benefits                                      |
| ---------------- | --------------- | ------------- | --------------------------------------------- |
| `hospital`       | 50,000          | 20 MW         | +5% population growth, reduces war casualties |
| `school`         | 40,000          | 15 MW         | +10 education, +3% worker productivity        |
| `power_plant`    | 100,000         | 0 (generates) | Generates electricity                         |
| `infrastructure` | 30,000          | 0             | +10 infra, faster troops, trade efficiency    |
| `fortifications` | 150,000         | 5 MW          | +1 fort level, defense bonus in battle        |

Buildings also require **resources** (steel, wood, coal, etc.) — see `buildings.config.ts` for exact costs.

### State Energy Grid

| Field             | Type        | Notes                    |
| ----------------- | ----------- | ------------------------ |
| `stateId`         | FK → states | **Unique**               |
| `totalProduction` | int         | MW — default 1,000       |
| `usedProduction`  | int         | MW consumed by buildings |

---

## Routes

| Route                | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `/map`               | Interactive world map                       |
| `/region/[id]`       | Region detail (stats, residents, buildings) |
| `/state/[id]`        | State detail (includes regions list)        |
| `/api/travel/arrive` | Travel completion endpoint                  |

---

## Key Files

| File                                                            | Purpose                                        |
| --------------------------------------------------------------- | ---------------------------------------------- |
| `src/lib/config/game/buildings.config.ts`                       | Building templates and costs                   |
| `src/lib/utils/formatting.ts`                                   | `getRegionName(id)`                            |
| `messages/en.json`                                              | Region names (`region_1` through `region_762`) |
| `tools/regions.json`                                            | Region coordinates                             |
| `tools/states/*.svg`                                            | Region boundary SVGs                           |
| `src/routes/(authenticated)/(dock)/map/+page.server.ts`         | Map data loader                                |
| `src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts` | Region detail                                  |
| `src/routes/(authenticated)/api/travel/`                        | Travel API                                     |
