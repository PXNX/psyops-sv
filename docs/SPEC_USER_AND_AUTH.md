# Spec: User & Authentication

> Accounts, profiles, sessions, OAuth, wallets, medals, and gift codes.

---

## Overview

Users authenticate via **Google OAuth** or **Telegram OAuth**. Each user has one **account**, one **profile** (name, avatar, bio), one **wallet** (currency balance), and one **residence** (current region). After first login, users go through an onboarding flow to create their profile and choose a starting region.

---

## Domain Model

### Account

The core identity record. Created on first OAuth login.

| Field       | Type      | Notes                        |
| ----------- | --------- | ---------------------------- |
| `id`        | text PK   | UUID string                  |
| `email`     | text      | From OAuth provider          |
| `role`      | enum      | `user`, `moderator`, `admin` |
| `createdAt` | timestamp |                              |
| `updatedAt` | timestamp |                              |

### User Profile

Display information. One per account.

| Field       | Type          | Notes                      |
| ----------- | ------------- | -------------------------- |
| `id`        | int PK        |                            |
| `accountId` | FK → accounts | **Unique**                 |
| `name`      | text          | Display name (3–50 chars)  |
| `logo`      | FK → files    | Profile picture (optional) |
| `bio`       | text          | User bio (max 500 chars)   |

**Edit constraints:**

- Name: 3–50 characters. Costs 100 currency to change. 24h cooldown.
- Logo: Max 2 MB. 24h cooldown.
- Bio: Max 500 characters.

### Session

| Field       | Type          | Notes         |
| ----------- | ------------- | ------------- |
| `id`        | text PK       | Session token |
| `accountId` | FK → accounts |               |
| `expiresAt` | timestamp     |               |
| `createdAt` | timestamp     |               |

Sessions are stored as cookies (`session`). Validated on every request in `hooks.server.ts`.

### OAuth Tokens

| Field            | Type          | Notes                  |
| ---------------- | ------------- | ---------------------- |
| `id`             | int PK        |                        |
| `accountId`      | FK → accounts | **Unique**             |
| `provider`       | text          | `google` or `telegram` |
| `accessToken`    | text          |                        |
| `refreshToken`   | text          |                        |
| `tokenExpiresAt` | timestamp     |                        |

### User Wallet

Every user has exactly one wallet for in-game currency.

| Field       | Type          | Notes           |
| ----------- | ------------- | --------------- |
| `id`        | int PK        |                 |
| `userId`    | FK → accounts | **Unique**      |
| `balance`   | int           | Default: 10,000 |
| `updatedAt` | timestamp     |                 |

### Files

Uploaded assets (profile pics, party logos, newspaper logos, etc.).

| Field         | Type          | Notes                                |
| ------------- | ------------- | ------------------------------------ |
| `id`          | int PK        |                                      |
| `key`         | text          | Backblaze B2 object key. **Unique**. |
| `fileName`    | text          | Original file name                   |
| `contentType` | text          | MIME type                            |
| `sizeBytes`   | int           |                                      |
| `uploadedBy`  | FK → accounts |                                      |
| `uploadedAt`  | timestamp     |                                      |

### User Medals

Awards given by presidents to users.

| Field       | Type          | Notes                                                   |
| ----------- | ------------- | ------------------------------------------------------- |
| `userId`    | FK → accounts | Recipient                                               |
| `stateId`   | FK → states   | Awarding state                                          |
| `medalType` | enum          | `honor`, `valor`, `service`, `excellence`, `leadership` |
| `reason`    | text          |                                                         |
| `awardedBy` | FK → accounts | Must be a president                                     |
| `awardedAt` | timestamp     |                                                         |

**Rules:** Presidents can award medals. Limited to one award per month.

### Gift Codes

Admin-created codes users can redeem for currency/resources.

| Field                | Type          | Notes           |
| -------------------- | ------------- | --------------- |
| `code`               | text          | **Unique**      |
| `description`        | text          |                 |
| `currencyAmount`     | int           | Currency reward |
| `maxRedemptions`     | int           |                 |
| `currentRedemptions` | int           |                 |
| `expiresAt`          | timestamp     |                 |
| `isActive`           | bool          |                 |
| `createdBy`          | FK → accounts | Admin           |

Gift codes can also include **resources** via `giftCodeResources` table. Each user can redeem a code only once (`giftCodeRedemptions` with unique constraint on userId + giftCodeId).

---

## Auth Flow

### Google OAuth

```
/auth/login/google → Google consent → /auth/callback/google → session created → redirect to /
```

### Telegram OAuth

```
/auth/login/telegram → Telegram widget → /auth/callback/telegram → session created → redirect to /
```

### Session Validation (every request)

```typescript
// hooks.server.ts
const sessionToken = event.cookies.get("session");
const result = await validateSessionToken(sessionToken);
event.locals.account = result?.account ?? null;
event.locals.session = result?.session ?? null;
```

### Route Protection

- `(authenticated)` group has a `+layout.server.ts` that checks `locals.account` and redirects to login if null.
- `(unauthenticated)` group is for public pages.

### Rate Limiting

Token bucket rate limiter in `hooks.server.ts`:

- GET/OPTIONS: 1 token
- POST/PUT/DELETE: 3 tokens
- Bucket: 100 tokens, refill 1/sec

---

## Onboarding Flow

New users (no profile or residence) are redirected to:

1. `/welcome` — Welcome screen
2. `/welcome/create` — Create profile (name, optional avatar)
3. `/welcome/region` — Pick starting region on world map

---

## User Profile Page

Route: `/user/[id]`

Shows:

- Profile card (name, avatar, bio)
- Residence (region, state)
- Political party membership
- Company ownership
- Military units

Sub-route: `/user/[id]/career`

Shows:

- Newspaper positions (journalist roles)
- Articles written + upvote counts
- State positions (president, minister)
- Party memberships
- Medals received
- Career statistics

---

## Key Unique Constraints (one per user)

| Resource         | Constraint                        |
| ---------------- | --------------------------------- |
| Profile          | One `userProfile` per account     |
| Wallet           | One `userWallet` per account      |
| Residence        | One `residence` per account       |
| Factory job      | One `factoryWorker` per account   |
| Production queue | One `productionQueue` per account |
| Active travel    | One `userTravel` per account      |
| Chat restriction | One `chatRestriction` per account |

---

## Routes

| Route                     | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `/auth/login`             | Login page (Google / Telegram buttons)    |
| `/auth/login/google`      | Google OAuth redirect                     |
| `/auth/login/telegram`    | Telegram OAuth redirect                   |
| `/auth/callback/telegram` | Telegram callback                         |
| `/auth/logout`            | Logout (clear session)                    |
| `/user/[id]`              | User profile                              |
| `/user/[id]/career`       | Career page (articles, medals, positions) |
| `/settings`               | Settings overview                         |
| `/settings/profile`       | Edit profile (name, avatar, bio)          |
| `/giftcode`               | Redeem gift codes                         |
| `/welcome/*`              | Onboarding flow                           |

---

## Key Files

| File                                           | Purpose                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `src/lib/server/auth.ts`                       | `validateSessionToken()`, session management   |
| `src/hooks.server.ts`                          | Auth hook, rate limiter, paraglide             |
| `src/lib/config/features/party.config.ts`      | `PROFILE_EDIT_CONFIG` (name/bio limits, costs) |
| `src/routes/(unauthenticated)/auth/`           | OAuth login/callback routes                    |
| `src/routes/(authenticated)/(dock)/user/[id]/` | Profile page                                   |
| `src/routes/(authenticated)/(dock)/settings/`  | Settings + profile edit                        |
