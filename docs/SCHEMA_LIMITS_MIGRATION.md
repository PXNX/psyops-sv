# Schema Limits Migration Guide

## Overview

The application has been refactored to use the database schema as the **single source of truth** for validation limits. Previously, limits were defined in `src/lib/config/validation/limits.config.ts`, which created a potential for inconsistency between validation rules and actual database constraints.

## Changes Made

### 1. New Schema Limits Module

Created `src/lib/server/schema-limits.ts` which exports `SCHEMA_LIMITS` constant containing all validation limits derived directly from the database schema defined in `src/lib/server/schema.ts`.

```typescript
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

// Example usage
const maxLength = SCHEMA_LIMITS.COMPANY_NAME_MAX; // 50
```

### 2. Updated Validation Schemas

All validation schemas have been updated to import and use `SCHEMA_LIMITS` instead of hardcoded values:

**Updated Files:**
- `src/routes/(authenticated)/(dock)/company/create/schema.ts`
- `src/routes/(authenticated)/(dock)/company/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/party/create/schema.ts`
- `src/routes/(authenticated)/(dock)/party/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/state/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/factory/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/newspaper/create/schema.ts`
- `src/routes/(authenticated)/(dock)/newspaper/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/bloc/create/schema.ts`
- `src/routes/(authenticated)/(dock)/bloc/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/settings/schema.ts`
- `src/routes/(authenticated)/(fullscreen)/welcome/create/schema.ts`
- `src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/schema.ts`

### 3. Deprecated Old Config

The file `src/lib/config/validation/limits.config.ts` has been deprecated and marked for removal. It now contains a deprecation notice.

## Available Limits

All limits are defined in `SCHEMA_LIMITS` and include:

### Entity Name Limits
- `USER_NAME_MAX: 50`
- `STATE_NAME_MAX: 100`
- `PARTY_NAME_MAX: 50`
- `COMPANY_NAME_MAX: 50`
- `FACTORY_NAME_MAX: 100`
- `MILITARY_UNIT_NAME_MAX: 100`
- `BLOC_NAME_MAX: 100`
- `NEWSPAPER_NAME_MAX: 40`

### Description Limits
- `USER_BIO_MAX: 500`
- `STATE_DESCRIPTION_MAX: 5000`
- `PARTY_DESCRIPTION_MAX: 1000`
- `COMPANY_DESCRIPTION_MAX: 1000`
- `BLOC_DESCRIPTION_MAX: 1000`

### Party Specific
- `PARTY_ABBREVIATION_MAX: 5`
- `PARTY_IDEOLOGY_MAX: 50`

### Content Limits
- `ARTICLE_TITLE_MAX: 40`
- `ARTICLE_CONTENT_MAX: 50000`
- `CHAT_MESSAGE_MAX: 500`
- `INBOX_SUBJECT_MAX: 200`
- `INBOX_CONTENT_MAX: 5000`

### Moderation
- `REPORT_REASON_MAX: 1000`
- `REVIEW_NOTE_MAX: 500`

### File Upload
- `FILE_UPLOAD_MAX_SIZE_MB: 5`
- `LOGO_MAX_SIZE_MB: 2`

### Minimum Lengths (Business Rules)
- `MIN_NAME_LENGTH: 3`
- `MIN_TITLE_LENGTH: 1`
- `MIN_CONTENT_LENGTH: 50`

## Benefits

1. **Single Source of Truth**: Database schema constraints and validation rules are now synchronized
2. **Maintainability**: Changing a limit only requires updating the database schema and the `SCHEMA_LIMITS` object
3. **Type Safety**: All limits are typed and constant
4. **Documentation**: Limits are documented with references to their database table origins
5. **Consistency**: No risk of validation allowing values that will fail at the database level

## Migration for New Features

When adding new features that require validation:

1. Define the database column with appropriate constraints (e.g., `varchar(100)`)
2. Add the limit to `SCHEMA_LIMITS` in `src/lib/server/schema-limits.ts`
3. Use the limit in your validation schema:

```typescript
import * as v from "valibot";
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";

export const mySchema = v.object({
    name: v.pipe(
        v.string("Name is required"),
        v.minLength(SCHEMA_LIMITS.MIN_NAME_LENGTH, 
            `Name must be at least ${SCHEMA_LIMITS.MIN_NAME_LENGTH} characters`),
        v.maxLength(SCHEMA_LIMITS.MY_ENTITY_NAME_MAX, 
            `Name must be at most ${SCHEMA_LIMITS.MY_ENTITY_NAME_MAX} characters`)
    )
});
```

## Breaking Changes

None - this is a refactoring that maintains the same validation behavior while improving code organization.

## Future Work

Consider generating `SCHEMA_LIMITS` automatically from the Drizzle schema using TypeScript type introspection or code generation tools.
