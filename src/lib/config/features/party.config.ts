// Political party configuration
export const PARTY_CREATION_CONFIG = {
	NAME_MIN_LENGTH: 3,
	NAME_MAX_LENGTH: 50,
	ABBREVIATION_MAX_LENGTH: 5,
	DESCRIPTION_MAX_LENGTH: 500,
	COOLDOWN_DAYS: 7,
	COST: 10000
} as const;

export const PARTY_EDIT_CONFIG = {
	EDIT_COOLDOWN_HOURS: 24,
	NAME_CHANGE_COOLDOWN_DAYS: 30,
	LOGO_MAX_SIZE_MB: 2
} as const;

export const PARTY_IDEOLOGIES = [
	"Liberal",
	"Conservative",
	"Socialist",
	"Libertarian",
	"Green",
	"Nationalist",
	"Progressive",
	"Centrist",
	"Social Democrat",
	"Other"
] as const;

export const PROFILE_EDIT_CONFIG = {
	NAME_MIN_LENGTH: 3,
	NAME_MAX_LENGTH: 50,
	BIO_MAX_LENGTH: 500,
	LOGO_MAX_SIZE_MB: 2,
	COST: 100,
	COOLDOWN_HOURS: 24
} as const;
