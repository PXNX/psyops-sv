# Spec: Media

> Newspapers, journalists, articles, and upvotes.

---

## Overview

Players can create **newspapers** and publish **articles** using a rich text editor (TipTap). Other players can read and **upvote** articles. Newspapers have journalist roles with a rank hierarchy.

---

## Domain Model

### Newspaper

| Field        | Type       | Notes               |
| ------------ | ---------- | ------------------- |
| `id`         | int PK     |                     |
| `name`       | text       |                     |
| `logo`       | FK → files | Newspaper logo/icon |
| `background` | text       | Banner image        |
| `createdAt`  | timestamp  |                     |

### Journalist

Links a user to a newspaper with a specific role.

| Field         | Type            | Notes                       |
| ------------- | --------------- | --------------------------- |
| `id`          | int PK          |                             |
| `userId`      | FK → accounts   |                             |
| `newspaperId` | FK → newspapers |                             |
| `rank`        | enum            | `author`, `editor`, `owner` |

Unique: (userId, newspaperId).

**Rank hierarchy:**

1. **Owner** — Can edit newspaper settings, manage editors/authors, publish.
2. **Editor** — Can publish and edit articles.
3. **Author** — Can write and submit articles.

A user can be a journalist in **multiple** newspapers.

### Article

| Field         | Type            | Notes                        |
| ------------- | --------------- | ---------------------------- |
| `id`          | int PK          |                              |
| `title`       | text            |                              |
| `content`     | text            | Rich HTML from TipTap editor |
| `authorId`    | FK → accounts   |                              |
| `newspaperId` | FK → newspapers |                              |
| `createdAt`   | timestamp       |                              |

### Upvote

| Field       | Type          | Notes |
| ----------- | ------------- | ----- |
| `userId`    | FK → accounts |       |
| `articleId` | FK → articles |       |

Unique: (userId, articleId). One upvote per user per article.

---

## Rich Text Editor

Articles are written using **TipTap v3** (ProseMirror-based WYSIWYG editor).

### Available Extensions

- **Text formatting**: Bold, italic, strike, code, code block
- **Structure**: Headings (h1–h3), blockquote, horizontal rule, paragraphs
- **Lists**: Bullet list, ordered list
- **Media**: Images, links
- **Tables**: Table, table row, table cell, table header
- **Other**: Text color, text alignment, placeholder, typography, history (undo/redo)

### Editor Components

Located in `src/routes/(unauthenticated)/test/`:

- `TableBubbleMenu.svelte` — Floating table controls
- `FormattingOptions.svelte` — Text formatting toolbar
- `AlignmentOptions.svelte` — Text alignment controls
- `ListOptions.svelte` — List type picker
- `TableButtons.svelte` — Table insertion/management
- `LinkBubbleMenuHandler.ts` — Link editing popup
- `HeadingWithAnchor.ts` — Headings with anchor IDs

### Article Styling

Article content is rendered with the `.article-content` CSS class (defined in `app.css`) which provides:

- 1.8 line-height
- Proper heading spacing
- Styled blockquotes (primary color border)
- Code block styling
- Responsive table layout
- Image max-width

---

## Article Feed

Route: `/posts`

Shows a paginated feed of published articles. Each card displays:

- Newspaper name + logo
- Article title
- Author name
- Publication date
- Upvote count

### Creating Articles

Route: `/posts/new` (fullscreen layout, no dock)

Uses the TipTap rich text editor. Author selects which newspaper to publish under.

### Editing Articles

Route: `/posts/[id]/edit` (fullscreen layout, no dock)

Only the author or newspaper editors/owners can edit.

---

## Career Integration

On the user career page (`/user/[id]/career`), media-related stats are shown:

- List of newspaper positions (with rank)
- Articles written
- Total upvotes received
- Average upvotes per article

---

## Routes

| Route               | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `/posts`            | Article feed (paginated)                 |
| `/posts/new`        | Write new article (fullscreen)           |
| `/posts/[id]/edit`  | Edit existing article (fullscreen)       |
| `/newspaper`        | Newspaper list                           |
| `/newspaper/create` | Create newspaper                         |
| `/newspaper/[id]`   | Newspaper detail (articles, journalists) |

---

## Key Files

| File                                                                      | Purpose                                         |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| `src/routes/(authenticated)/(dock)/posts/+page.svelte`                    | Article feed                                    |
| `src/routes/(authenticated)/(fullscreen)/posts/new/+page.server.ts`       | Article creation                                |
| `src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/+page.server.ts` | Article editing                                 |
| `src/routes/(authenticated)/(dock)/newspaper/+page.server.ts`             | Newspaper list                                  |
| `src/routes/(unauthenticated)/test/`                                      | TipTap editor components                        |
| `src/app.css`                                                             | `.article-content` and `.wysiwyg-editor` styles |
