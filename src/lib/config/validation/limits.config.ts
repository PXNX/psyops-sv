/**
 * @deprecated This file is no longer used.
 *
 * All validation limits are now available in a client-safe module.
 *
 * For client-side validation schemas (used in Svelte components):
 * - Use SCHEMA_LIMITS from "$lib/config/validation/schema-limits"
 *
 * For server-side only code that needs dynamic extraction from the database schema:
 * - Use SCHEMA_LIMITS from "$lib/server/schema-limits"
 *
 * This ensures the database schema is the single source of truth
 * for all field length constraints and validation rules, while preventing
 * server code from leaking to the client.
 */

// This file is kept for backwards compatibility but should not be used.
