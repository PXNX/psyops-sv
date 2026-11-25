// src/lib/config/game/revolution.config.ts
// Rules for a regional uprising. A region can only rise when its civilians
// have turned against the state, and the rising needs three conspirators.
// The single "fight for freedom" compares the conspirators' units in the
// region with the loyalists still standing there. The region wins ties.

export const REVOLUTION_CONFIG = {
	/** A rising is armed: the organizer pays in rifles and cash up front. */
	RIFLE_COST: 1000,
	MONEY_COST: 25000,
	/** Civilian opinion at or below this is low enough to start a revolution. */
	MAX_SUPPORT: 30,
	/** Conspirators needed before the fight for freedom can be launched. */
	MIN_MEMBERS: 3,
	/** A result within this fraction of the enemy's power counts as a draw. */
	DRAW_MARGIN: 0.1,
	/** Loyalist garrison even in an undefended region. */
	BASE_GARRISON: 40,
	/** Extra loyalist power per fortification level in the region. */
	GARRISON_PER_FORTIFICATION: 25,
	/** Rebel power per point of civilian opinion lost from the neutral 50. */
	UPRISING_PER_LOST_POINT: 3,
	/** Neutral civilian opinion; the baseline the uprising is measured from. */
	NEUTRAL_OPINION: 50
} as const;

export type RevolutionOutcome = "victory" | "draw" | "defeat";

/** Whether civilians are unhappy enough with the state to rise. */
export function canStartRevolution(opinion: number): boolean {
	return opinion <= REVOLUTION_CONFIG.MAX_SUPPORT;
}

/**
 * The fight for freedom: the rising wins decisively if it is much stronger,
 * draws if the two sides are close, and loses only if it is clearly beaten.
 * A region only needs a win or a draw to become independent.
 */
export function resolveFight(rebelPower: number, governmentPower: number): RevolutionOutcome {
	if (governmentPower <= 0) return rebelPower > 0 ? "victory" : "draw";
	const ratio = rebelPower / governmentPower;
	if (ratio >= 1 + REVOLUTION_CONFIG.DRAW_MARGIN) return "victory";
	if (ratio >= 1 - REVOLUTION_CONFIG.DRAW_MARGIN) return "draw";
	return "defeat";
}

/** Draw or victory frees the region; only a defeat keeps it in the state. */
export function winsIndependence(outcome: RevolutionOutcome): boolean {
	return outcome !== "defeat";
}
