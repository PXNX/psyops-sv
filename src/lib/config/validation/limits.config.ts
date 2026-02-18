// Field length limits and validation constraints
export const LIMITS_CONFIG = {
    // User profiles
    USER_NAME_MIN: 3,
    USER_NAME_MAX: 50,
    USER_BIO_MAX: 500,

    // States
    STATE_NAME_MAX: 100,
    STATE_DESCRIPTION_MAX: 5000,

    // Parties
    PARTY_NAME_MIN: 3,
    PARTY_NAME_MAX: 50,
    PARTY_ABBREVIATION_MAX: 5,
    PARTY_IDEOLOGY_MAX: 50,
    PARTY_DESCRIPTION_MAX: 1000,

    // Companies
    COMPANY_NAME_MIN: 3,
    COMPANY_NAME_MAX: 50,
    COMPANY_DESCRIPTION_MAX: 1000,

    // Factories
    FACTORY_NAME_MAX: 100,
    FACTORY_MAX_WORKERS_MIN: 1,
    FACTORY_MAX_WORKERS_MAX: 100,

    // Military
    MILITARY_UNIT_NAME_MAX: 100,

    // Newspapers
    NEWSPAPER_NAME_MAX: 40,
    ARTICLE_TITLE_MAX: 40,
    ARTICLE_CONTENT_MAX: 50000,

    // Chat & messaging
    CHAT_MESSAGE_MAX: 500,
    INBOX_SUBJECT_MAX: 200,
    INBOX_CONTENT_MAX: 5000,

    // Reports
    REPORT_REASON_MAX: 1000,
    REVIEW_NOTE_MAX: 500,

    // Files
    FILE_UPLOAD_MAX_SIZE_MB: 5,
    LOGO_MAX_SIZE_MB: 2
} as const;
