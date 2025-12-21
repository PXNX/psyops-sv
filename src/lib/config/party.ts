// src/lib/config/party.ts
export const PARTY_CREATION_CONFIG = {
	COST: 50000, // Cost in currency to create a party
	COOLDOWN_DAYS: 30, // 1 month cooldown between attempts
	MIN_BALANCE_REQUIRED: 50000 // Minimum balance needed
} as const;

export const PARTY_EDIT_CONFIG = {
	COST: 5000, // Cost in currency to edit a party
	COOLDOWN_HOURS: 1, // 1 hour cooldown between edits
	MIN_BALANCE_REQUIRED: 5000
} as const;

export const PROFILE_EDIT_CONFIG = {
	COST: 1000, // Cost in currency to edit profile
	COOLDOWN_HOURS: 1, // 1 hour cooldown between edits
	MIN_BALANCE_REQUIRED: 1000
} as const;
