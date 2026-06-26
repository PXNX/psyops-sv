# Spec: Immigration

> Visas, border control, sanctions, and residency applications.

---

## Overview

States can control immigration through **visa requirements**, **border control** (open/closed), and **sanctions** against other states. Players must obtain visas to enter states with closed borders or visa requirements.

---

## Domain Model

### State Visa Settings

Per-state immigration policy.

| Field          | Type        | Notes                             |
| -------------- | ----------- | --------------------------------- |
| `stateId`      | FK → states | **Unique**                        |
| `visaRequired` | bool        | Whether visas are needed to enter |
| `visaCost`     | int         | Default: 5,000                    |
| `visaTaxRate`  | int         | Default: 20%                      |
| `autoApprove`  | bool        | Auto-approve visa applications    |
| `updatedAt`    | timestamp   |                                   |

### Visa Applications

| Field        | Type          | Notes                             |
| ------------ | ------------- | --------------------------------- |
| `id`         | int PK        |                                   |
| `userId`     | FK → accounts | Applicant                         |
| `stateId`    | FK → states   | Target state                      |
| `status`     | enum          | `pending`, `approved`, `rejected` |
| `purpose`    | text          | Reason for travel                 |
| `appliedAt`  | timestamp     |                                   |
| `reviewedBy` | FK → accounts |                                   |
| `reviewedAt` | timestamp     |                                   |
| `reviewNote` | text          |                                   |

### User Visas

Issued after approval.

| Field              | Type          | Notes                          |
| ------------------ | ------------- | ------------------------------ |
| `id`               | int PK        |                                |
| `userId`           | FK → accounts |                                |
| `stateId`          | FK → states   |                                |
| `status`           | enum          | `active`, `expired`, `revoked` |
| `issuedAt`         | timestamp     |                                |
| `expiresAt`        | timestamp     |                                |
| `cost`             | int           | Amount paid                    |
| `taxPaid`          | int           | Visa tax portion               |
| `approvedBy`       | FK → accounts |                                |
| `revokedBy`        | FK → accounts | (if revoked)                   |
| `revocationReason` | text          | (if revoked)                   |

**Visa lifecycle:**

1. Player applies for visa.
2. If `autoApprove = true` → immediately issued.
3. Otherwise → state official reviews and approves/rejects.
4. Issued visa has an expiration date.
5. Can be revoked by state officials.
6. Expired visas lose their `active` status.

---

## Border Control

### State Borders

| Field                   | Type          | Notes            |
| ----------------------- | ------------- | ---------------- |
| `stateId`               | FK → states   | **Unique**       |
| `status`                | enum          | `open`, `closed` |
| `maintenanceCostPerDay` | int           | 50,000           |
| `lastMaintenancePaid`   | timestamp     |                  |
| `closedBy`              | FK → accounts |                  |

**Closing borders:**

- Proposed and voted on via **parliamentary proposal** (`border_control` type).
- Daily maintenance cost: **50,000 currency** + resources (10 steel, 20 gunpowder).
- If treasury can't pay → borders automatically reopen.

**Closed borders effect:**

- Players without a visa cannot enter the state.
- Players with an active visa can still enter.
- Citizens of the state can always enter and leave.

---

## State Sanctions

| Field                | Type          | Notes                       |
| -------------------- | ------------- | --------------------------- |
| `id`                 | int PK        |                             |
| `targetStateId`      | FK → states   | State being sanctioned      |
| `sanctioningStateId` | FK → states   | State imposing the sanction |
| `sanctionedBy`       | FK → accounts | Foreign affairs minister    |
| `reason`             | text          |                             |
| `sanctionedAt`       | timestamp     |                             |
| `isActive`           | bool          |                             |

**Sanction effects:**

- Market listings from sanctioned state sellers are flagged as `isStateSanctioned`.
- Players in the sanctioning state **cannot buy** from sanctioned state sellers.

**Who can impose sanctions:**

- Only the **Minister of Foreign Affairs** can impose sanctions.
- Cannot sanction your own state.

---

## Immigration Flow

### Moving to a New Region

```
Player wants to move to Region X
        │
        ▼
Is Region X in the same state? ──Yes──→ Travel normally
        │
        No
        ▼
Does target state require visas? ──No──→ Travel normally
        │
        Yes
        ▼
Does player have an active visa? ──Yes──→ Travel normally
        │
        No
        ▼
Apply for visa → Wait for approval → Receive visa → Travel
```

### Residency Change

When a player travels to a new region, their **residence** is updated. This changes:

- Their state citizenship
- Their tax jurisdiction
- Their eligible elections
- Their chat channels (state chat)
- Their battle eligibility

---

## Routes

| Route                             | Purpose                                                 |
| --------------------------------- | ------------------------------------------------------- |
| `/visas`                          | Visa management (view active visas, apply for new ones) |
| `/state/[id]` → `sanction` action | Impose sanctions (foreign minister)                     |

---

## Key Files

| File                                                           | Purpose                                      |
| -------------------------------------------------------------- | -------------------------------------------- |
| `src/lib/config/game/economy.config.ts`                        | `DEFAULT_VISA_COST`, `DEFAULT_VISA_TAX_RATE` |
| `src/lib/config/game/buildings.config.ts`                      | `BORDER_MAINTENANCE` costs                   |
| `src/routes/(authenticated)/(dock)/visas/+page.server.ts`      | Visa management page                         |
| `src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts` | Sanctions action                             |
