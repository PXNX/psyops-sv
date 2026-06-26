# Spec: Messaging

> Global chat, state chat, party chat, direct messages, inbox, and user blocking.

---

## Overview

The messaging system has two parts:

1. **Chat** — Real-time-ish message feed (global, state, party, DM channels).
2. **Inbox** — One-way notifications and broadcasts (state/party/system messages).

---

## Domain Model

### Chat Messages

| Field            | Type                  | Notes                                |
| ---------------- | --------------------- | ------------------------------------ |
| `id`             | int PK                |                                      |
| `senderId`       | FK → accounts         |                                      |
| `recipientId`    | FK → accounts         | Null for global/state/party chat     |
| `messageType`    | enum                  | `global`, `state`, `party`, `direct` |
| `partyId`        | FK → politicalParties | Set for party chat                   |
| `content`        | text                  |                                      |
| `isDeleted`      | bool                  | Soft delete by moderators            |
| `deletedBy`      | FK → accounts         |                                      |
| `deletedAt`      | timestamp             |                                      |
| `deletionReason` | text                  |                                      |
| `deletionNote`   | text                  |                                      |
| `sentAt`         | timestamp             |                                      |

### Chat Channels

| Channel | `messageType`      | Visibility                    |
| ------- | ------------------ | ----------------------------- |
| Global  | `global`           | Everyone                      |
| English | `global` (special) | Everyone (language-filtered)  |
| State   | `state`            | Residents of the user's state |
| Party   | `party`            | Members of the user's party   |
| DM      | `direct`           | Sender + recipient only       |

### Inbox Messages

One-way messages from state/party/system to individuals.

| Field         | Type                  | Notes                                          |
| ------------- | --------------------- | ---------------------------------------------- |
| `id`          | int PK                |                                                |
| `recipientId` | FK → accounts         |                                                |
| `senderId`    | FK → accounts         |                                                |
| `messageType` | enum                  | `state_broadcast`, `party_broadcast`, `system` |
| `stateId`     | FK → states           | For state broadcasts                           |
| `partyId`     | FK → politicalParties | For party broadcasts                           |
| `subject`     | text                  |                                                |
| `content`     | text                  |                                                |
| `isRead`      | bool                  |                                                |
| `sentAt`      | timestamp             |                                                |

### User Blocks

Users can block other users.

| Field           | Type          | Notes            |
| --------------- | ------------- | ---------------- |
| `userId`        | FK → accounts | The blocker      |
| `blockedUserId` | FK → accounts | The blocked user |
| `blockedAt`     | timestamp     |                  |

Unique: (userId, blockedUserId).

**Effects of blocking:**

- Blocked user's messages are hidden in chat.
- Blocked user cannot send DMs.

---

## Chat Rules Acceptance

Users must accept chat rules before sending messages.

| Field        | Type          | Notes                 |
| ------------ | ------------- | --------------------- |
| `userId`     | FK → accounts | **Unique**            |
| `acceptedAt` | timestamp     |                       |
| `ipAddress`  | text          | Logged for moderation |

---

## Chat Features

### Message Actions Menu

When interacting with a message, users can:

- **Report** — Opens report modal
- **Block user** — Opens block confirmation
- **Copy** — Copy message text
- _(Moderators)_ **Delete** — Soft-delete with reason

### Streaming

Chat uses a **streaming** endpoint for real-time updates:

- Route: `/chat/stream`
- Polls or SSE for new messages.

### Moderation Integration

- Moderators can delete messages (soft delete with reason).
- Deleted messages show "[Message deleted]" placeholder.
- Chat restrictions prevent a user from sending messages (see Moderation spec).

---

## Broadcasts

System-wide, state-wide, or party-wide announcements displayed on the dashboard.

### Broadcast Types

| Type     | Visibility              | Sender       |
| -------- | ----------------------- | ------------ |
| `system` | Everyone                | Admin        |
| `state`  | Residents of that state | President    |
| `party`  | Party members           | Party leader |

Broadcasts are shown in the dashboard as colored banners:

- System: Red
- State: Purple
- Party: Emerald/Green

Admin broadcast management: `/admin/broadcast`

---

## Routes

| Route             | Purpose                            |
| ----------------- | ---------------------------------- |
| `/chat`           | Global chat (default channel)      |
| `/chat/en`        | English-only chat                  |
| `/chat/party`     | Party chat                         |
| `/chat/user/[id]` | Direct messages with specific user |
| `/chat/stream`    | Chat streaming endpoint            |
| `/inbox`          | Inbox messages                     |

---

## Key Files

| File                                                               | Purpose                 |
| ------------------------------------------------------------------ | ----------------------- |
| `src/lib/component/ChatMessageMenu.svelte`                         | Message context menu    |
| `src/lib/component/BlockUserModal.svelte`                          | Block user confirmation |
| `src/lib/component/ChatRulesModal.svelte`                          | Chat rules acceptance   |
| `src/lib/component/ReportMessageModal.svelte`                      | Report a message        |
| `src/routes/(authenticated)/(dock)/chat/+page.server.ts`           | Chat data loader        |
| `src/routes/(authenticated)/(dock)/chat/party/+page.server.ts`     | Party chat              |
| `src/routes/(authenticated)/(dock)/chat/user/[id]/+page.server.ts` | DM page                 |
| `src/routes/(authenticated)/(dock)/inbox/+page.server.ts`          | Inbox                   |
| `src/routes/admin/broadcast/+page.server.ts`                       | Broadcast management    |
