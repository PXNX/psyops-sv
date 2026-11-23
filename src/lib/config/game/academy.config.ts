// src/lib/config/game/academy.config.ts
// The officer academy is deliberately slow and expensive: graduating a
// commander is a state decision, not a purchase from the player's wallet.

export const ACADEMY = {
	durationHours: 24,
	money: 75_000,
	steel: 250
} as const;
