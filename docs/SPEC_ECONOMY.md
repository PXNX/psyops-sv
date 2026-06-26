# Spec: Economy

> Companies, factories, workers, resource production, crafting, and the player-driven market.

---

## Overview

The economy follows a supply chain: **Factories** extract **resources** → Players craft resources into **products** → Products are traded on the **market** or used to train **military units**. Companies own factories and pay workers from their **company budget**. The state collects **taxes** at various points.

---

## Resource & Product Types

### Resources (raw materials)

Extracted by factory workers.

| Resource    | Source   |
| ----------- | -------- |
| `iron`      | Mine     |
| `copper`    | Mine     |
| `steel`     | Refinery |
| `gunpowder` | Refinery |
| `wood`      | Mine     |
| `coal`      | Mine     |

### Products (manufactured goods)

Crafted by players from resources.

| Product      | Inputs                        | Output Qty | Duration |
| ------------ | ----------------------------- | ---------- | -------- |
| `rifles`     | 5 iron, 3 steel, 2 wood       | 10         | 1h       |
| `ammunition` | 3 copper, 2 gunpowder         | 100        | 30m      |
| `artillery`  | 10 steel, 8 iron, 5 gunpowder | 2          | 2h       |
| `vehicles`   | 15 steel, 10 iron, 5 copper   | 1          | 3h       |
| `explosives` | 10 gunpowder, 3 steel         | 20         | 45m      |

---

## Domain Model

### Company

A player-owned business entity that owns factories.

| Field         | Type          | Notes |
| ------------- | ------------- | ----- |
| `id`          | int PK        |       |
| `name`        | text          |       |
| `logo`        | FK → files    |       |
| `ownerId`     | FK → accounts |       |
| `description` | text          |       |
| `foundedAt`   | timestamp     |       |

**Creation:** Costs 50,000 currency.

### Company Budget

Each company has a budget (separate from owner's wallet).

| Field            | Type           | Notes             |
| ---------------- | -------------- | ----------------- |
| `companyId`      | FK → companies | **Unique**        |
| `balance`        | int            | Current funds     |
| `totalDeposited` | int            | Lifetime deposits |
| `totalSpent`     | int            | Lifetime spending |

### Factory

Produces resources. Owned by a company, located in a region.

| Field            | Type           | Notes                                      |
| ---------------- | -------------- | ------------------------------------------ |
| `id`             | int PK         |                                            |
| `name`           | text           |                                            |
| `companyId`      | FK → companies |                                            |
| `regionId`       | FK → regions   |                                            |
| `factoryType`    | enum           | `mine`, `refinery`, `armaments`, `general` |
| `resourceOutput` | text           | Which resource this factory produces       |
| `productOutput`  | text           | Which product (if applicable)              |
| `maxWorkers`     | int            | Default: 10                                |
| `workerWage`     | int            | Default: 1,500 per shift                   |
| `productionRate` | int            | Default: 10                                |

**Creation:** Costs 100,000 currency.

### Factory Worker

Links a player to a factory job. **One job per user.**

| Field              | Type           | Notes                                             |
| ------------------ | -------------- | ------------------------------------------------- |
| `userId`           | FK → accounts  | **Unique**                                        |
| `factoryId`        | FK → factories |                                                   |
| `jobType`          | enum           | `miner`, `refiner`, `assembler`, `general_worker` |
| `hiredAt`          | timestamp      |                                                   |
| `wageAtShiftStart` | int            | Locked wage when shift started                    |
| `lastWorked`       | timestamp      |                                                   |

### Work Shift System

- Workers can start a shift once every **24 hours** (`WORK_COOLDOWN_HOURS`).
- Starting a shift: Records `lastWorked` timestamp and locks the current wage.
- Collecting wages: Available after the shift is complete. Pays from company budget. Produces resources.
- If the company budget is insufficient, the worker is owed but gets nothing (company bankrupt scenario).

---

## Production Queue

Players can craft products from resources. **One active production per user.**

| Field         | Type          | Notes                    |
| ------------- | ------------- | ------------------------ |
| `userId`      | FK → accounts | **Unique**               |
| `productType` | enum          | rifles, ammunition, etc. |
| `quantity`    | int           | Output quantity          |
| `startedAt`   | timestamp     |                          |
| `completesAt` | timestamp     |                          |

**Process:**

1. Player selects product type and quantity multiplier.
2. Required resources are deducted from inventory.
3. Timer starts (duration × multiplier).
4. When timer completes, products are added to inventory.

---

## Inventories

### Resource Inventory

| Field          | Type          | Notes              |
| -------------- | ------------- | ------------------ |
| `userId`       | FK → accounts |                    |
| `resourceType` | enum          | iron, copper, etc. |
| `quantity`     | int           |                    |

Unique: (userId, resourceType).

### Product Inventory

| Field         | Type          | Notes                    |
| ------------- | ------------- | ------------------------ |
| `userId`      | FK → accounts |                          |
| `productType` | enum          | rifles, ammunition, etc. |
| `quantity`    | int           |                          |

Unique: (userId, productType).

---

## Market

A player-to-player trading system.

### Market Listings

| Field          | Type          | Notes                          |
| -------------- | ------------- | ------------------------------ |
| `id`           | int PK        |                                |
| `sellerId`     | FK → accounts |                                |
| `itemType`     | text          | `resource` or `product`        |
| `itemName`     | text          | Specific resource/product name |
| `quantity`     | int           |                                |
| `pricePerUnit` | int           | Minimum: 100                   |
| `createdAt`    | timestamp     |                                |

### Buying Flow

1. Buyer selects listing and quantity.
2. **Tax** is calculated based on buyer's state `market_transaction` tax rate.
3. Total cost = `(pricePerUnit × quantity) + tax`.
4. Buyer's wallet is debited.
5. Seller receives net amount (gross - tax).
6. Tax goes to buyer's **state treasury**.
7. Items transfer to buyer's inventory.
8. If entire listing quantity bought → listing is deleted.

### Listing Removal Cooldown

When a seller removes their own listing:

- Items are returned to inventory.
- A **1-hour cooldown** is applied before they can create new listings.

### Market Statistics

| Field             | Type | Notes |
| ----------------- | ---- | ----- |
| `itemType`        | text |       |
| `itemName`        | text |       |
| `currentAvgPrice` | int  |       |
| `lowestPrice`     | int  |       |
| `highestPrice`    | int  |       |
| `totalVolume`     | int  |       |
| `activeListings`  | int  |       |

### Sanctions & Market

If State A sanctions State B, players in State A **cannot buy** from sellers in State B (listings are flagged as `isStateSanctioned`).

---

## Economy Config Constants

```typescript
ECONOMY_CONFIG = {
	INITIAL_USER_WALLET: 10_000,
	COMPANY_CREATION_COST: 50_000,
	FACTORY_CREATION_COST: 100_000,
	DEFAULT_FACTORY_WAGE: 1_500,
	DEFAULT_FACTORY_MAX_WORKERS: 10,
	DEFAULT_PRODUCTION_RATE: 10,
	WORK_COOLDOWN_HOURS: 24,
	MARKET_LISTING_FEE: 100,
	MAX_LISTINGS_PER_USER: 50,
	DEFAULT_VISA_COST: 5_000
};
```

---

## Routes

| Route                | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `/company`           | Company list                                      |
| `/company/create`    | Create company                                    |
| `/company/[id]`      | Company detail                                    |
| `/company/[id]/edit` | Edit company                                      |
| `/factory/create`    | Create factory                                    |
| `/factory/[id]`      | Factory detail                                    |
| `/production`        | Crafting + employment (start work, collect wages) |
| `/market`            | Market listings (browse, buy, sell)               |
| `/market/[item]`     | Item-specific market view                         |
| `/transactions`      | Transaction history                               |

---

## Key Files

| File                                                           | Purpose                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/config/game/economy.config.ts`                        | Economy constants                                              |
| `src/lib/server/service/factoryWork.ts`                        | `startWorkShift()`, `collectWages()`, `calculateShiftStatus()` |
| `src/lib/server/taxes.ts`                                      | `calculateAndCollectTax()`                                     |
| `src/routes/(authenticated)/(dock)/production/+page.server.ts` | Production + employment                                        |
| `src/routes/(authenticated)/(dock)/market/+page.server.ts`     | Market listing/buying/selling                                  |
| `src/routes/(authenticated)/(dock)/company/+page.server.ts`    | Company management                                             |
