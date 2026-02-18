/**
 * Schema Limits - Server-Side Dynamic Extraction
 *
 * @deprecated For client-side validation schemas, use $lib/config/validation/schema-limits instead.
 * This file should only be used in server-side code that needs dynamic extraction from the database schema.
 *
 * This module extracts validation limits directly from the database schema,
 * ensuring consistency between database constraints and application validation.
 *
 * IMPORTANT: If you're importing this in a schema.ts file that's used by Svelte components,
 * use $lib/config/validation/schema-limits instead to avoid leaking server code to the client.
 *
 * These limits are derived from the varchar/text length constraints defined
 * in src/lib/server/schema.ts and should be used in server-only validation.
 */

import {
    accounts,
    userProfiles,
    states,
    politicalParties,
    companies,
    factories,
    militaryUnits,
    blocs,
    newspapers,
    articles,
    inboxMessages
} from "./schema";

/**
 * Helper function to extract varchar length from Drizzle column definition
 */
function getVarcharLength(column: any): number | null {
    // Access the column's config to get the length
    if (column?.config?.length !== undefined) {
        return column.config.length;
    }
    return null;
}

/**
 * Extract max lengths from schema definitions
 */
export const SCHEMA_LIMITS = {
    // User profiles (userProfiles table)
    USER_NAME_MAX: 255, // text type, using reasonable default
    USER_BIO_MAX: 500, // text type, using reasonable default

    // Accounts (accounts table)
    ACCOUNT_EMAIL_MAX: getVarcharLength(accounts.email) ?? 255,

    // States (states table)
    STATE_NAME_MAX: getVarcharLength(states.name) ?? 100,
    STATE_DESCRIPTION_MAX: 5000, // text type, reasonable limit

    // Political parties (politicalParties table)
    PARTY_NAME_MAX: getVarcharLength(politicalParties.name) ?? 50,
    PARTY_ABBREVIATION_MAX: getVarcharLength(politicalParties.abbreviation) ?? 5,
    PARTY_COLOR_MAX: getVarcharLength(politicalParties.color) ?? 7,
    PARTY_IDEOLOGY_MAX: getVarcharLength(politicalParties.ideology) ?? 50,
    PARTY_DESCRIPTION_MAX: 1000, // text type, reasonable limit

    // Companies (companies table)
    COMPANY_NAME_MAX: getVarcharLength(companies.name) ?? 50,
    COMPANY_DESCRIPTION_MAX: 1000, // text type, reasonable limit

    // Factories (factories table)
    FACTORY_NAME_MAX: getVarcharLength(factories.name) ?? 100,

    // Military units (militaryUnits table)
    MILITARY_UNIT_NAME_MAX: getVarcharLength(militaryUnits.name) ?? 100,

    // Blocs (blocs table)
    BLOC_NAME_MAX: getVarcharLength(blocs.name) ?? 100,
    BLOC_COLOR_MAX: getVarcharLength(blocs.color) ?? 7,
    BLOC_DESCRIPTION_MAX: 1000, // text type, reasonable limit

    // Newspapers (newspapers table)
    NEWSPAPER_NAME_MAX: getVarcharLength(newspapers.name) ?? 40,

    // Articles (articles table)
    ARTICLE_TITLE_MAX: getVarcharLength(articles.title) ?? 40,
    ARTICLE_CONTENT_MAX: 50000, // text type, derived from documentation

    // Chat messages (chatMessages table)
    CHAT_MESSAGE_MAX: 500, // text type, reasonable limit for chat

    // Inbox messages (inboxMessages table)
    INBOX_SUBJECT_MAX: getVarcharLength(inboxMessages.subject) ?? 200,
    INBOX_CONTENT_MAX: 5000, // text type, reasonable limit

    // Reports and moderation
    REPORT_REASON_MAX: 1000, // text type, reasonable limit
    REVIEW_NOTE_MAX: 500, // text type, reasonable limit

    // Files
    FILE_UPLOAD_MAX_SIZE_MB: 5,
    LOGO_MAX_SIZE_MB: 2,

    // Minimum lengths (business rules, not database constraints)
    MIN_NAME_LENGTH: 3,
    MIN_TITLE_LENGTH: 1,
    MIN_CONTENT_LENGTH: 50,
} as const;

/**
 * Helper type to ensure limits are numbers
 */
export type SchemaLimit = (typeof SCHEMA_LIMITS)[keyof typeof SCHEMA_LIMITS];
