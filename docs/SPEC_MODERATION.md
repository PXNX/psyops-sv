# Spec: Moderation

> Reports, warnings, chat restrictions, bans, content flags, and moderator tools.

---

## Overview

The moderation system handles user reports, content review, and enforcement actions. Users with the `moderator` or `admin` role can review reports, issue warnings, restrict chat access, and flag inappropriate content (names, logos).

---

## Domain Model

### General Reports

Users can report messages, accounts, or parties.

| Field           | Type          | Notes                                                                                            |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `id`            | int PK        |                                                                                                  |
| `targetType`    | enum          | `message`, `account`, `party`                                                                    |
| `targetId`      | text          | ID of the reported entity                                                                        |
| `reporterId`    | FK → accounts | Who filed the report                                                                             |
| `reason`        | text          | User's description                                                                               |
| `violationType` | enum          | `insult`, `spam`, `pornography`, `hate_speech`, `graphic_violence`, `privacy_violation`, `other` |
| `status`        | enum          | `pending`, `resolved`, `dismissed`                                                               |
| `reviewedBy`    | FK → accounts | Moderator who handled it                                                                         |
| `reviewedAt`    | timestamp     |                                                                                                  |
| `reviewNote`    | text          | Moderator notes                                                                                  |
| `actionTaken`   | text          | What enforcement was applied                                                                     |
| `reportedAt`    | timestamp     |                                                                                                  |

### User Warnings

Formal warnings issued to users by moderators.

| Field         | Type          | Notes       |
| ------------- | ------------- | ----------- |
| `id`          | int PK        |             |
| `userId`      | FK → accounts | Warned user |
| `reason`      | text          |             |
| `description` | text          | Details     |
| `issuedBy`    | FK → accounts | Moderator   |
| `issuedAt`    | timestamp     |             |

### Chat Restrictions

Prevents a user from sending chat messages. **One per user.**

| Field          | Type          | Notes             |
| -------------- | ------------- | ----------------- |
| `userId`       | FK → accounts | **Unique**        |
| `reason`       | text          |                   |
| `restrictedBy` | FK → accounts | Moderator         |
| `restrictedAt` | timestamp     |                   |
| `expiresAt`    | timestamp     | Null = indefinite |
| `isPermanent`  | bool          |                   |

### Content Flags

Used to flag inappropriate account names or party names/logos.

| Field        | Type          | Notes              |
| ------------ | ------------- | ------------------ |
| `id`         | int PK        |                    |
| `targetType` | enum          | `account`, `party` |
| `targetId`   | text          |                    |
| `flagType`   | enum          | `name`, `logo`     |
| `reason`     | text          |                    |
| `flaggedBy`  | FK → accounts | Moderator          |
| `flaggedAt`  | timestamp     |                    |
| `resolvedAt` | timestamp     |                    |
| `isResolved` | bool          |                    |

---

## Moderation Actions

| Action           | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `warning`        | Formal warning added to user record                        |
| `message_delete` | Soft-delete a chat message (content hidden, reason logged) |
| `restriction`    | Temporarily or permanently restrict chat access            |
| `ban`            | Account ban (role-based)                                   |
| `name_reset`     | Force-reset an inappropriate name                          |
| `logo_reset`     | Force-remove an inappropriate logo                         |

---

## Report Flow

### User Submits Report

1. User clicks report on a message/profile/party.
2. `ReportModal.svelte` or `ReportMessageModal.svelte` opens.
3. User selects violation type and provides description.
4. Report is saved with status `pending`.

### Moderator Reviews

1. Moderator visits `/moderators/reports`.
2. Sees list of pending reports.
3. Clicks into `/moderators/reports/[id]` for detail view.
4. Reviews the content and context.
5. Takes action (warn, restrict, delete, dismiss).
6. Marks report as `resolved` or `dismissed`.

### Moderator Actions Panel

Route: `/moderators/actions/[id]`

Allows moderators to:

- View user's history (warnings, restrictions)
- Issue new warnings
- Apply chat restrictions (timed or permanent)
- Flag content (names, logos)
- Delete messages

---

## Chat Rules

Before sending their first chat message, users must accept the **chat rules**.

| Field        | Type          | Notes              |
| ------------ | ------------- | ------------------ |
| `userId`     | FK → accounts | **Unique**         |
| `acceptedAt` | timestamp     |                    |
| `ipAddress`  | text          | For accountability |

The `ChatRulesModal` component shows the rules and records acceptance.

---

## Admin vs Moderator

| Capability        | Moderator | Admin |
| ----------------- | --------- | ----- |
| Review reports    | ✅        | ✅    |
| Issue warnings    | ✅        | ✅    |
| Delete messages   | ✅        | ✅    |
| Chat restrictions | ✅        | ✅    |
| Content flags     | ✅        | ✅    |
| Manage gift codes | ❌        | ✅    |
| System broadcasts | ❌        | ✅    |
| Manage user roles | ❌        | ✅    |

---

## Routes

| Route                      | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `/moderators`              | Moderator dashboard                             |
| `/moderators/reports`      | Pending reports list                            |
| `/moderators/reports/[id]` | Report detail + review                          |
| `/moderators/actions`      | Action history                                  |
| `/moderators/actions/[id]` | User moderation actions                         |
| `/moderation`              | Moderation overview (separate from /moderators) |
| `/report`                  | Submit a report (authenticated)                 |

---

## Components

| Component                   | Purpose                                       |
| --------------------------- | --------------------------------------------- |
| `ReportModal.svelte`        | Generic report submission (accounts, parties) |
| `ReportMessageModal.svelte` | Report a specific chat message                |
| `ChatRulesModal.svelte`     | Chat rules acceptance dialog                  |
| `BlockUserModal.svelte`     | Block a user (separate from moderation)       |
| `ChatMessageMenu.svelte`    | Context menu with report/delete options       |

---

## Key Files

| File                                                                        | Purpose             |
| --------------------------------------------------------------------------- | ------------------- |
| `src/routes/(authenticated)/(dock)/moderators/+page.server.ts`              | Moderator dashboard |
| `src/routes/(authenticated)/(dock)/moderators/reports/+page.server.ts`      | Reports list        |
| `src/routes/(authenticated)/(dock)/moderators/reports/[id]/+page.server.ts` | Report detail       |
| `src/routes/(authenticated)/(dock)/moderators/actions/[id]/+page.server.ts` | User actions        |
| `src/routes/moderation/+page.server.ts`                                     | Moderation overview |
| `src/routes/(authenticated)/report/+page.server.ts`                         | Report submission   |
