# Schema Limits Client-Side Fix

## Problem
The application was importing `$lib/server/schema-limits.ts` into client-side code (Svelte components), which could leak sensitive server-side information to the browser.

Error message:
```
Cannot import $lib/server/schema-limits.ts into code that runs in the browser, 
as this could leak sensitive information.
```

## Root Cause
Schema validation files (`schema.ts`) that are imported by Svelte components were importing from `$lib/server/schema-limits`, which is server-side only code. These schema files are used by both:
1. Svelte components (client-side) via `valibotClient()`
2. Server-side load functions and actions via `valibot()`

## Solution
Created a client-safe constants file that can be imported in both client and server contexts:

### New File: `src/lib/config/validation/schema-limits.ts`
- Contains static validation limit constants
- Safe to import in both client and server code
- Values are manually synchronized with database schema

### Import Guidelines
```typescript
// ✅ For client-side validation schemas (used in Svelte components)
import { SCHEMA_LIMITS } from "$lib/config/validation/schema-limits";

// ✅ For server-only code that needs dynamic schema extraction
import { SCHEMA_LIMITS } from "$lib/server/schema-limits";
```

## Files Modified

### Updated Schema Files (13 files)
All these files now import from the client-safe location:
- `src/routes/(authenticated)/(fullscreen)/welcome/create/schema.ts`
- `src/routes/(authenticated)/(fullscreen)/posts/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/state/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/factory/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/party/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/party/create/schema.ts`
- `src/routes/(authenticated)/(dock)/company/create/schema.ts`
- `src/routes/(authenticated)/(dock)/company/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/newspaper/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/newspaper/create/schema.ts`
- `src/routes/(authenticated)/(dock)/bloc/[id]/edit/schema.ts`
- `src/routes/(authenticated)/(dock)/bloc/create/schema.ts`
- `src/routes/(authenticated)/(dock)/settings/schema.ts`

### Updated Documentation
- `src/lib/server/schema-limits.ts` - Added deprecation notice for client-side usage
- `src/lib/config/validation/limits.config.ts` - Updated to reference new location

## Maintenance Notes

⚠️ **IMPORTANT**: When updating database schema varchar/text length constraints in `src/lib/server/schema.ts`, you must manually update the corresponding values in `src/lib/config/validation/schema-limits.ts`.

The values in the client-safe file are intentionally static to avoid importing server-side code. This is a trade-off for security and proper client/server separation.

## Benefits
1. ✅ No server code leaked to client
2. ✅ Proper separation of client and server concerns
3. ✅ All validation schemas can be used in Svelte components
4. ✅ Maintains single source of truth (with manual sync)
5. ✅ Improves security posture

## Testing
After applying these changes:
1. Build the application: `npm run build`
2. Verify no build errors about server imports
3. Test all edit/create forms to ensure validation still works
4. Check browser console for any import errors
