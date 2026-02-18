/**
 * Schema Validation Limits - Client-Safe Constants
 * 
 * These constants define validation limits that can be safely used in both
 * client-side and server-side code. They should match the database schema
 * constraints defined in src/lib/server/schema.ts
 * 
 * WARNING: These values must be kept in sync with the database schema manually.
 * When updating database schema varchar/text length constraints, update these values too.
 * 
 * For server-side only code that needs to extract limits dynamically from the schema,
 * use $lib/server/schema-limits.ts instead.
 */

export const SCHEMA_LIMITS = {
    // User profiles (userProfiles table)
    USER_NAME_MAX: 255,
    USER_BIO_MAX: 500,

    // Accounts (accounts table)
    ACCOUNT_EMAIL_MAX: 255,

    // States (states table)
    STATE_NAME_MAX: 100,
    STATE_DESCRIPTION_MAX: 5000,

    // Political parties (politicalParties table)
    PARTY_NAME_MAX: 50,
    PARTY_ABBREVIATION_MAX: 5,
    PARTY_COLOR_MAX: 7,
    PARTY_IDEOLOGY_MAX: 50,
    PARTY_DESCRIPTION_MAX: 1000,

    // Companies (companies table)
    COMPANY_NAME_MAX: 50,
    COMPANY_DESCRIPTION_MAX: 1000,

    // Factories (factories table)
    FACTORY_NAME_MAX: 100,

    // Military units (militaryUnits table)
    MILITARY_UNIT_NAME_MAX: 100,

    // Blocs (blocs table)
    BLOC_NAME_MAX: 100,
    BLOC_COLOR_MAX: 7,
    BLOC_DESCRIPTION_MAX: 1000,

    // Newspapers (newspapers table)
    NEWSPAPER_NAME_MAX: 40,

    // Articles (articles table)
    ARTICLE_TITLE_MAX: 40,
    ARTICLE_CONTENT_MAX: 50000,

    // Chat messages (chatMessages table)
    CHAT_MESSAGE_MAX: 500,

    // Inbox messages (inboxMessages table)
    INBOX_SUBJECT_MAX: 200,
    INBOX_CONTENT_MAX: 5000,

    // Reports and moderation
    REPORT_REASON_MAX: 1000,
    REVIEW_NOTE_MAX: 500,

    // Files
    FILE_UPLOAD_MAX_SIZE_MB: 5,
    LOGO_MAX_SIZE_MB: 2,

    // Minimum lengths (business rules, not database constraints)
    MIN_NAME_LENGTH: 3,
    MIN_TITLE_LENGTH: 1,
    MIN_CONTENT_LENGTH: 50,
} as const;

export type SchemaLimit = (typeof SCHEMA_LIMITS)[keyof typeof SCHEMA_LIMITS];
