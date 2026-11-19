// International humanitarian law: a state's standing and what it costs.
//
// Every violation (see assessIhl in strike.config.ts) is recorded with points:
// its kind's base points plus points for the civilians actually killed. A
// state's IHL score is the sum of its violations' points, each halving every
// IHL_HALF_LIFE_DAYS, so a state can rebuild its name by stopping. The score
// is computed on read; nothing needs a cron.
//
// Consequences, all scaling with the score:
//  - Morale: the state's units fight worse (battle-engine.ts), up to -25%.
//  - Arms embargo: its strikes cost more, up to double.
//  - Reparations: each violation pays the victim state's treasury at once.
//  - Isolation: from "violator" on, its bloc can expel it with a third of the
//    votes instead of a majority, and bloc partners are told of every violation.
//  - Reputation: the standing badge is public on the state page.
//
// Pure data and pure functions only.
/** A violation's weight halves this often. */
export const IHL_HALF_LIFE_DAYS = 7;
/** Points per civilian killed, on top of the kind's base points, capped per strike. */
export const IHL_POINTS_PER_CASUALTY = 1 / 25;
export const IHL_CASUALTY_POINTS_MAX = 40;

export type IhlStanding = "compliant" | "concerns" | "violator" | "pariah";

/** Score at or above which a state has each standing. */
export const IHL_STANDINGS: { standing: IhlStanding; from: number; label: string; blurb: string }[] = [
	{
		standing: "pariah",
		from: 100,
		label: "Pariah state",
		blurb: "Repeated grave violations. Its troops' morale is collapsing and its allies can expel it easily."
	},
	{
		standing: "violator",
		from: 40,
		label: "Violator",
		blurb:
			"Documented violations of humanitarian law. Weaker morale, embargoed weapons, allies can expel it with a third of the votes."
	},
	{
		standing: "concerns",
		from: 10,
		label: "Under scrutiny",
		blurb: "Reported incidents under investigation. Small morale and embargo penalties."
	},
	{ standing: "compliant", from: 0, label: "Compliant", blurb: "No significant violations on record." }
];

export function ihlStanding(score: number) {
	return IHL_STANDINGS.find((s) => score >= s.from) ?? IHL_STANDINGS[IHL_STANDINGS.length - 1]!;
}

/** Points a violation is worth: base points plus casualty points (capped). */
export function violationPoints(basePoints: number, casualties: number): number {
	return Math.round(basePoints + Math.min(IHL_CASUALTY_POINTS_MAX, Math.max(0, casualties) * IHL_POINTS_PER_CASUALTY));
}

/** How much a violation still counts: 1 when new, halving every half-life. */
export function ihlDecay(at: Date | string, now: Date = new Date()): number {
	const days = Math.max(0, (now.getTime() - new Date(at).getTime()) / 86_400_000);
	return Math.pow(0.5, days / IHL_HALF_LIFE_DAYS);
}

/** A state's current IHL score from its violations. */
export function ihlScore(violations: { points: number; createdAt: Date | string }[], now: Date = new Date()): number {
	return Math.round(violations.reduce((s, v) => s + v.points * ihlDecay(v.createdAt, now), 0) * 10) / 10;
}

// ── Consequences ────────────────────────────────────────────────────────────

/** Morale: each score point costs this share of battle output, up to the cap. */
export const IHL_MORALE_PER_POINT = 0.002;
export const IHL_MORALE_MAX = 0.25;
/** Embargo: strike cost rises by score/IHL_EMBARGO_SCALE, up to +IHL_EMBARGO_MAX. */
export const IHL_EMBARGO_SCALE = 100;
export const IHL_EMBARGO_MAX = 1;
/** Reparations to the victim state per violation. */
export const REPARATIONS_PER_CASUALTY = 1_000;
export const REPARATIONS_PER_POINT = 2_500;
/** Share of bloc votes that expels a state at "violator" standing or worse (else a majority). */
export const IHL_EXPULSION_SHARE = 1 / 3;

/** Battle output multiplier for a state with this score (1 = no penalty). */
export function ihlMoraleFactor(score: number): number {
	return Math.round((1 - Math.min(IHL_MORALE_MAX, Math.max(0, score) * IHL_MORALE_PER_POINT)) * 1000) / 1000;
}

/** Strike cost multiplier under the arms embargo. */
export function ihlEmbargoFactor(score: number): number {
	return 1 + Math.min(IHL_EMBARGO_MAX, Math.max(0, score) / IHL_EMBARGO_SCALE);
}

/** Reparations owed for one violation. */
export function reparationsOwed(points: number, casualties: number): number {
	return Math.round(points * REPARATIONS_PER_POINT + Math.max(0, casualties) * REPARATIONS_PER_CASUALTY);
}

/** Whether a state's standing lets its bloc expel it with IHL_EXPULSION_SHARE of the votes. */
export function ihlEasyExpulsion(score: number): boolean {
	return score >= (IHL_STANDINGS.find((s) => s.standing === "violator")?.from ?? 40);
}
