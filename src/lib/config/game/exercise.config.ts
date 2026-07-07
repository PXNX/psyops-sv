// Unit exercises and combat experience configuration
// Inspired by HoI4 experience levels (recruit → elite). Units gain experience
// by exercising (in exchange for organization, supply and equipment) and lose
// it when they take casualties in real battles.

export const EXERCISE_CONFIG = {
	// How long a single exercise lasts (hours).
	DURATION_HOURS: 8,

	// Experience gained when an exercise completes.
	EXPERIENCE_GAIN: 10,

	// Exercising alone cannot push a unit past this experience value.
	// Reaching higher levels ("veteran"/"elite") requires real combat.
	MAX_EXPERIENCE: 50,

	// Costs applied to the unit when the exercise completes.
	ORG_COST: 25, // organization lost
	SUPPLY_COST: 20, // supply consumed

	// A unit needs at least this much organization to start exercising.
	MIN_ORG_TO_START: 30,

	// Equipment worn out during an exercise must be replaced. The cost is this
	// fraction of the unit's build cost (currency + products), charged when the
	// exercise starts.
	EQUIPMENT_COST_FACTOR: 0.15,

	// When a unit takes casualties in battle, experienced soldiers are lost and
	// replaced by green reinforcements. This factor scales how much experience is
	// diluted relative to the fraction of the unit that was destroyed.
	COMBAT_EXPERIENCE_LOSS_FACTOR: 0.8
} as const;

// Experience levels ordered from lowest to highest. `min` is the inclusive
// experience threshold at which the level is reached.
export const EXPERIENCE_LEVELS = [
	{ key: "recruit", label: "Recruit", min: 0, combatBonus: 0 },
	{ key: "trained", label: "Trained", min: 20, combatBonus: 0.05 },
	{ key: "regular", label: "Regular", min: 40, combatBonus: 0.1 },
	{ key: "veteran", label: "Veteran", min: 60, combatBonus: 0.15 },
	{ key: "elite", label: "Elite", min: 80, combatBonus: 0.2 }
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** Returns the experience level for a given experience value (0-100). */
export function getExperienceLevel(experience: number): ExperienceLevel {
	let level: ExperienceLevel = EXPERIENCE_LEVELS[0];
	for (const candidate of EXPERIENCE_LEVELS) {
		if (experience >= candidate.min) {
			level = candidate;
		}
	}
	return level;
}

/**
 * Combat effectiveness multiplier granted by a unit's experience.
 * Recruit = 1.0, higher levels apply their `combatBonus` on top.
 */
export function getExperienceCombatModifier(experience: number): number {
	return 1 + getExperienceLevel(experience).combatBonus;
}

/**
 * New experience value after completing an exercise. Gains are capped at
 * `MAX_EXPERIENCE`; a unit already at or above the cap gains nothing.
 */
export function calculateExerciseExperienceGain(
	currentExperience: number,
	gain: number = EXERCISE_CONFIG.EXPERIENCE_GAIN,
	max: number = EXERCISE_CONFIG.MAX_EXPERIENCE
): number {
	if (currentExperience >= max) return currentExperience;
	return Math.min(max, currentExperience + gain);
}

/**
 * Experience lost when a unit takes casualties in battle. Proportional to the
 * fraction of the unit (out of 100 strength) that was destroyed this round.
 */
export function calculateCombatExperienceLoss(
	currentExperience: number,
	strengthLost: number,
	factor: number = EXERCISE_CONFIG.COMBAT_EXPERIENCE_LOSS_FACTOR
): number {
	if (currentExperience <= 0 || strengthLost <= 0) return 0;
	const casualtyFraction = Math.min(1, strengthLost / 100);
	const loss = Math.floor(currentExperience * casualtyFraction * factor);
	return Math.min(loss, currentExperience);
}
