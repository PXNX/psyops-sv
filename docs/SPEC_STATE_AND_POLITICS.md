# Spec: State & Politics

> States, blocs, presidents, ministers, parliament, elections, proposals, and taxation.

---

## Overview

The political system allows players to form **political parties**, run in **parliamentary elections**, propose and vote on **legislation** (taxes, infrastructure), and hold **state offices** (president, minister, governor). States can join **blocs** (alliances) for mutual defense.

---

## Domain Model

### State

A sovereign nation on the map containing multiple regions.

| Field            | Type       | Notes                          |
| ---------------- | ---------- | ------------------------------ |
| `id`             | int PK     |                                |
| `name`           | text       |                                |
| `logo`           | FK → files | State flag/coat of arms        |
| `background`     | text       | Banner image URL               |
| `description`    | text       |                                |
| `population`     | int        | Calculated from residences     |
| `rating`         | int        |                                |
| `capitulated`    | bool       | True if conquered              |
| `capitulated_at` | timestamp  |                                |
| `blocId`         | FK → blocs | Alliance membership (optional) |

### Bloc (Alliance)

A group of states allied together.

| Field         | Type       | Notes             |
| ------------- | ---------- | ----------------- |
| `id`          | int PK     |                   |
| `name`        | text       | **Unique**        |
| `logo`        | FK → files |                   |
| `color`       | text       | CSS color for map |
| `description` | text       |                   |
| `capitulated` | bool       |                   |

**Rules:**

- States in the same bloc cannot declare war on each other.
- If a bloc is capitulated, all member states are considered defeated.

### President

The head of state. One per state.

| Field       | Type          | Notes       |
| ----------- | ------------- | ----------- |
| `userId`    | FK → accounts |             |
| `stateId`   | FK → states   | **Unique**  |
| `electedAt` | timestamp     |             |
| `term`      | int           | Term number |

**Powers:**

- Declare war
- Appoint/dismiss ministers
- Appoint governors
- Award medals

### Minister

Appointed by the president. One per ministry per state.

| Field         | Type          | Notes                                   |
| ------------- | ------------- | --------------------------------------- |
| `userId`      | FK → accounts |                                         |
| `stateId`     | FK → states   |                                         |
| `ministry`    | enum          | `economy`, `defense`, `foreign_affairs` |
| `appointedAt` | timestamp     |                                         |

Unique constraints: (userId, stateId, ministry) and (stateId, ministry).

**Powers by ministry:**

- **Economy**: Manage treasury, tax proposals
- **Defense**: Military coordination
- **Foreign Affairs**: Impose/lift sanctions

### Governor

Appointed to govern a specific region.

| Field         | Type          | Notes      |
| ------------- | ------------- | ---------- |
| `userId`      | FK → accounts |            |
| `regionId`    | FK → regions  | **Unique** |
| `appointedAt` | timestamp     |            |
| `term`        | int           |            |

---

## Political Parties

| Field               | Type          | Notes                                    |
| ------------------- | ------------- | ---------------------------------------- |
| `id`                | int PK        |                                          |
| `name`              | text          | **Unique**, 3–50 chars                   |
| `abbreviation`      | text          | Max 5 chars                              |
| `color`             | text          | CSS color                                |
| `logo`              | FK → files    |                                          |
| `ideology`          | text          |                                          |
| `description`       | text          | Max 500 chars                            |
| `founderId`         | FK → accounts |                                          |
| `stateId`           | FK → states   | Party's home state                       |
| `autoAcceptMembers` | bool          | If true, join requests are auto-approved |

**Creation rules:**

- Costs 10,000 currency
- 7-day cooldown between creation attempts
- Name must be unique

### Party Members

| Field        | Type                  | Notes                   |
| ------------ | --------------------- | ----------------------- |
| `userId`     | FK → accounts         |                         |
| `partyId`    | FK → politicalParties |                         |
| `role`       | enum                  | `member`, `leader`      |
| `acceptedBy` | FK → accounts         | Who approved membership |

**Rules:**

- A user can only be in **one party** at a time.
- Leaders cannot leave — must delete party (if sole member) or transfer leadership.
- Membership can be auto-accept or require application.

### Party Membership Applications

For parties with `autoAcceptMembers = false`.

| Field        | Type                  | Notes                             |
| ------------ | --------------------- | --------------------------------- |
| `userId`     | FK → accounts         |                                   |
| `partyId`    | FK → politicalParties |                                   |
| `status`     | enum                  | `pending`, `accepted`, `rejected` |
| `reviewedBy` | FK → accounts         |                                   |

---

## Elections

### Parliamentary Elections

| Field         | Type        | Notes                              |
| ------------- | ----------- | ---------------------------------- |
| `stateId`     | FK → states |                                    |
| `startDate`   | timestamp   | Voting opens                       |
| `endDate`     | timestamp   | Voting closes                      |
| `status`      | enum        | `scheduled`, `active`, `completed` |
| `totalSeats`  | int         | Parliament size                    |
| `isInaugural` | bool        | First election for this state      |

### Election Votes

Each voter picks a party. One vote per election.

| Field        | Type                  | Notes |
| ------------ | --------------------- | ----- |
| `electionId` | FK → elections        |       |
| `voterId`    | FK → accounts         |       |
| `partyId`    | FK → politicalParties |       |

Unique constraint: (electionId, voterId).

### Election Results

Calculated after voting ends.

| Field            | Type                  | Notes                      |
| ---------------- | --------------------- | -------------------------- |
| `electionId`     | FK → elections        |                            |
| `partyId`        | FK → politicalParties |                            |
| `votes`          | int                   | Total votes received       |
| `seatsWon`       | int                   | Parliament seats allocated |
| `votePercentage` | decimal               |                            |

---

## Parliamentary Proposals

Members of parliament can propose legislation.

| Field              | Type          | Notes                                                                                                      |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `stateId`          | FK → states   |                                                                                                            |
| `proposalType`     | enum          | `budget`, `tax`, `infrastructure`, `hospital`, `school`, `power_plant`, `fortifications`, `border_control` |
| `proposedBy`       | FK → accounts | Must be parliament member                                                                                  |
| `status`           | enum          | `active`, `passed`, `rejected`, `expired`                                                                  |
| `votingStartsAt`   | timestamp     |                                                                                                            |
| `votingEndsAt`     | timestamp     |                                                                                                            |
| `requiredMajority` | int           | Default: 50%                                                                                               |

### Proposal Detail Tables

**Tax proposals** (`proposalTaxDetails`):

| Field     | Notes                                                  |
| --------- | ------------------------------------------------------ |
| `taxType` | `mining`, `production`, `market_transaction`, `income` |
| `taxRate` | Percentage                                             |

**Building proposals** (`proposalBuildingDetails`):

| Field          | Notes          |
| -------------- | -------------- |
| `regionId`     | Where to build |
| `buildingName` | Building type  |
| `quantity`     | Default: 1     |

**Border proposals** (`proposalBorderDetails`):

| Field          | Notes              |
| -------------- | ------------------ |
| `borderStatus` | `open` or `closed` |

### Parliamentary Votes

| Field        | Type           | Notes                       |
| ------------ | -------------- | --------------------------- |
| `proposalId` | FK → proposals |                             |
| `voterId`    | FK → accounts  | Must be parliament member   |
| `voteType`   | enum           | `for`, `against`, `abstain` |

Unique: (proposalId, voterId).

---

## Taxation

### State Treasury

| Field            | Type        | Notes                    |
| ---------------- | ----------- | ------------------------ |
| `stateId`        | FK → states | **Unique**               |
| `balance`        | int         | Current treasury balance |
| `totalCollected` | int         | Lifetime revenue         |
| `totalSpent`     | int         | Lifetime spending        |
| `debt`           | int         | Outstanding bond principal |

Bond purchases add to `debt`; repayment (at maturity or early redemption) and
bailouts pay it down. The balance and debt are visible on the state dossier and
the Ministry of Economy page.

### Bailouts

A president or economy minister can transfer treasury funds to another state
(minimum 10,000). The amount is debited from the donor with a balance check,
credited to the recipient, then applied to the recipient's debt. One row per
bailout is kept in `state_bailouts` with the debt relieved and the official who
authorised it. The rescued state's civilians gain stance toward the donor; the
amount of goodwill scales with the size of the aid and is capped.

### Civilian stance

Civilians hold a separate numeric stance (−100…100) toward each foreign state,
stored per `(observerStateId, targetStateId)` in `civilian_stances`. A missing
row is neutral. Declaring war and striking a state's civilians move its stance
toward the attacker into negative territory; bailouts move it positive. The
state dossier lists who holds which stance, with a short label per score.

### Active Taxes

| Field        | Type           | Notes                                                  |
| ------------ | -------------- | ------------------------------------------------------ |
| `stateId`    | FK → states    |                                                        |
| `taxType`    | enum           | `mining`, `production`, `market_transaction`, `income` |
| `taxRate`    | decimal        | Percentage                                             |
| `isActive`   | bool           |                                                        |
| `proposalId` | FK → proposals | The proposal that created this tax                     |

### Tax Revenue (audit log)

| Field             | Type            | Notes                  |
| ----------------- | --------------- | ---------------------- |
| `stateId`         | FK → states     |                        |
| `taxId`           | FK → stateTaxes |                        |
| `amount`          | int             |                        |
| `collectedFrom`   | FK → accounts   | The taxpayer           |
| `transactionType` | text            | What triggered the tax |

Tax collection is handled by `$lib/server/taxes.ts` via `calculateAndCollectTax()`.

---

## State Detail Page

Route: `/state/[id]`

Displays:

- State info (name, flag, description, population)
- Bloc membership
- President + ministers
- Parliament members
- Regions list with population
- Active taxes
- Energy grid (power plants)
- Active wars
- Actions: Declare war (president), Impose sanctions (foreign minister)

---

## Routes

| Route                | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `/state`             | States list                               |
| `/state/[id]`        | State detail                              |
| `/party`             | Party list for user's state               |
| `/party/create`      | Create party                              |
| `/party/[id]`        | Party detail (members, join/leave/delete) |
| `/party/[id]/member` | Member management                         |
| `/bloc`              | Blocs list                                |
| `/bloc/create`       | Create bloc                               |
| `/bloc/[id]`         | Bloc detail                               |
| `/bloc/[id]/edit`    | Edit bloc                                 |

---

## Key Files

| File                                                           | Purpose                                |
| -------------------------------------------------------------- | -------------------------------------- |
| `src/lib/config/features/party.config.ts`                      | Party creation/edit limits and costs   |
| `src/lib/server/taxes.ts`                                      | `calculateAndCollectTax()`             |
| `src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts` | State detail + declare war + sanctions |
| `src/routes/(authenticated)/(dock)/party/[id]/+page.server.ts` | Party detail + join/leave/delete       |
