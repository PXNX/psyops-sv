// src/lib/config/game/stability.config.ts
// Civilian opinion is not decoration: it is the soil a regime stands on. This
// file turns the things a state does — the war crimes it commits, the way it
// treats its land and its workers, how many of its children it drafts, the
// cyber attacks and propaganda it endures — into a single regime stability
// score (0-100), and decides how its population grows or shrinks as a result.
//
// Regime stability is *derived on read*, like IHL standing and civilian
// opinion: nothing is stored and no migration is needed. The server service
// (services/stability.ts) gathers the inputs from the tables that already
// record them. Pure data and pure functions only (client and server).
//
// The population side *is* stored: regions.population is the one number that
// moves as people are born, die, leave or are killed, and a daily cron writes
// it back (services/stability.ts#populationTick).
import { hardshipExtraDeaths, hardshipExtraEmigration } from "./civilian-supply.config";

/** The four resource/exploitation laws a state can vote for (see schema.ts). */
export type ExploitationPolicyLike = "conservation" | "standard" | "industrial" | "unrestricted";

export const STABILITY = {
	MIN: 0,
	MAX: 100,
	/** A state that has done nothing has this much support at home. */
	BASE: 50,

	/** Average regional civilian opinion (0-100) deviates from 50 by this weight. */
	OPINION_WEIGHT: 0.4,

	/** War crimes: points off per IHL standing point, and a hard floor. */
	WAR_CRIME_PER_POINT: -0.4,
	WAR_CRIME_CAP: -25,

	/** Environmental policy: how the extraction law sways the population. */
	ENVIRONMENT: {
		conservation: 6,
		standard: 0,
		industrial: -6,
		unrestricted: -12
	} as Record<ExploitationPolicyLike, number>,

	/** Conscription: penalty per per-mille of the population under arms, capped. */
	CONSCRIPTION_PER_PERMILLE: -1.2,
	CONSCRIPTION_CAP: -18,

	/** Education: bonus per average region education level, capped. */
	EDUCATION_PER_LEVEL: 1.2,
	EDUCATION_CAP: 12,

	/** Wages: relative to a living wage, scaled and clamped both ways. */
	WAGE_REFERENCE: 1_500,
	WAGE_WEIGHT: 8,
	WAGE_MIN: -10,
	WAGE_MAX: 10,

	/** Cyber attacks (grid/C2/supply/radar disruption) that land on the state. */
	CYBER_PER_POINT: -0.25,
	CYBER_CAP: -10,

	/** Propaganda: your own rallies, theirs undermines. */
	PROPAGANDA_FOR_PER_POINT: 0.4,
	PROPAGANDA_FOR_CAP: 8,
	PROPAGANDA_AGAINST_PER_POINT: -0.35,
	PROPAGANDA_AGAINST_CAP: -12,

	/** Rally-round-the-flag: defending against an attack buys goodwill. */
	RALLY_DEFENCE: 8,

	/** Unmet food, electricity, heat and water needs — civilians blame the state. */
	SERVICES_PENALTY: -14
} as const;

export type StabilityLabel = "collapsing" | "unrest" | "uneasy" | "stable" | "loyal";

/** Score at or above which a regime has each label (highest first). */
export const STABILITY_LABELS: { label: StabilityLabel; from: number; blurb: string }[] = [
	{ label: "loyal", from: 70, blurb: "A confident population. The government can ask a lot of them." },
	{ label: "stable", from: 48, blurb: "Most people back the government and expect it to last." },
	{ label: "uneasy", from: 32, blurb: "Grumbles are growing. Loyalty is conditional." },
	{ label: "unrest", from: 18, blurb: "Streets are restless; orders are quietly ignored." },
	{ label: "collapsing", from: 0, blurb: "The regime is losing its grip on the country." }
];

/** Tailwind tone classes for each stability label. */
export const STABILITY_TONE: Record<StabilityLabel, string> = {
	loyal: "text-positive",
	stable: "text-friendly-fg",
	uneasy: "text-amber-300",
	unrest: "text-orange-300",
	collapsing: "text-red-300"
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Clamp a stability score to what the scale can express. */
export function clampStability(n: number): number {
	return Math.round(clamp(n, STABILITY.MIN, STABILITY.MAX));
}

/** A short label for a stability score. */
export function stabilityLabel(score: number): StabilityLabel {
	return (STABILITY_LABELS.find((s) => score >= s.from) ?? STABILITY_LABELS[STABILITY_LABELS.length - 1]!).label;
}

/** Everything the server needs to know to score a state's stability. */
export interface StabilityFactors {
	/** Mean civilian opinion across the state's regions (0-100). */
	opinion: number;
	/** Current (decayed) IHL score from war crimes. */
	ihlScore: number;
	environment: ExploitationPolicyLike;
	/** Soldiers per 1,000 civilians — the manpower pool / conscription pressure. */
	conscription: number;
	/** Mean education level of the state's regions. */
	education: number;
	/** Mean factory wage in the state, in currency. */
	wages: number;
	/** Sum of active hostile cyber-effect magnitudes on the state. */
	cyber: number;
	/** Sum of active morale_boost magnitudes (own counter-propaganda). */
	propagandaFor: number;
	/** Sum of active morale_shaken magnitudes (enemy campaigns). */
	propagandaAgainst: number;
	/** The state is currently defending in an active war. */
	defending: boolean;
	/** Mean share of the four basic needs civilians go without (0-1). */
	hardship: number;
}

/** One labelled, signed contribution to the score (for tooltips and panels). */
export interface StabilityContribution {
	key: string;
	label: string;
	value: number;
}

export interface StabilityResult {
	score: number;
	label: StabilityLabel;
	blurb: string;
	tone: string;
	/** The base plus every capped contribution; sums to `score` (before clamp). */
	breakdown: StabilityContribution[];
}

/**
 * Turn a state's circumstances into a regime stability score and a readable
 * breakdown. Each lever is capped independently so one crisis cannot wipe out
 * the whole score, and the base keeps a badly-run state from hitting zero
 * purely by arithmetic.
 */
export function regimeStability(f: StabilityFactors): StabilityResult {
	const contributions: StabilityContribution[] = [
		{
			key: "opinion",
			label: "Civilian opinion",
			value: round1((f.opinion - STABILITY.BASE) * STABILITY.OPINION_WEIGHT)
		},
		{
			key: "war_crimes",
			label: "War crimes",
			value: round1(clamp(f.ihlScore * STABILITY.WAR_CRIME_PER_POINT, STABILITY.WAR_CRIME_CAP, 0))
		},
		{
			key: "environment",
			label: "Environmental policy",
			value: STABILITY.ENVIRONMENT[f.environment] ?? 0
		},
		{
			key: "conscription",
			label: "Conscription",
			value: round1(clamp(f.conscription * STABILITY.CONSCRIPTION_PER_PERMILLE, STABILITY.CONSCRIPTION_CAP, 0))
		},
		{
			key: "education",
			label: "Education",
			value: round1(clamp(f.education * STABILITY.EDUCATION_PER_LEVEL, 0, STABILITY.EDUCATION_CAP))
		},
		{
			key: "wages",
			label: "Wages & working conditions",
			value: round1(
				clamp(
					(f.wages / STABILITY.WAGE_REFERENCE - 1) * STABILITY.WAGE_WEIGHT,
					STABILITY.WAGE_MIN,
					STABILITY.WAGE_MAX
				)
			)
		},
		{
			key: "cyber",
			label: "Cyberattacks",
			value: round1(clamp(f.cyber * STABILITY.CYBER_PER_POINT, STABILITY.CYBER_CAP, 0))
		},
		{
			key: "propaganda_for",
			label: "Counter-propaganda",
			value: round1(clamp(f.propagandaFor * STABILITY.PROPAGANDA_FOR_PER_POINT, 0, STABILITY.PROPAGANDA_FOR_CAP))
		},
		{
			key: "propaganda_against",
			label: "Enemy propaganda",
			value: round1(
				clamp(f.propagandaAgainst * STABILITY.PROPAGANDA_AGAINST_PER_POINT, STABILITY.PROPAGANDA_AGAINST_CAP, 0)
			)
		},
		{
			key: "defence",
			label: "Defending the homeland",
			value: f.defending ? STABILITY.RALLY_DEFENCE : 0
		},
		{
			key: "services",
			label: "Food, power, heat & water",
			value: round1(Math.min(0, f.hardship * STABILITY.SERVICES_PENALTY))
		}
	];

	const score = clampStability(STABILITY.BASE + contributions.reduce((s, c) => s + c.value, 0));
	const label = stabilityLabel(score);
	return {
		score,
		label,
		blurb: STABILITY_LABELS.find((s) => s.label === label)!.blurb,
		tone: STABILITY_TONE[label],
		breakdown: contributions
	};
}

/**
 * Battle morale is a small, direct consequence of a regime's standing: a
 * collapsing state fights worse, a loyal one a little better. Multiplier,
 * centred on 1 (used by the war/battle side of the game).
 */
export function stabilityMoraleFactor(score: number): number {
	const delta = clamp((score - STABILITY.BASE) / 500, -0.1, 0.1);
	return Math.round((1 + delta) * 1000) / 1000;
}

/**
 * How much war weariness a regime can absorb before its people force peace.
 * 0.8 at collapsing stability, 1 at the neutral base, 1.2 when loyal. Applied
 * to a war's exhaustion limit using its least stable belligerent.
 */
export function stabilityWarLimitFactor(score: number): number {
	return Math.round((0.8 + clamp(score, STABILITY.MIN, STABILITY.MAX) / 250) * 1000) / 1000;
}

// ── Population dynamics ─────────────────────────────────────────────────────

/** Annual, per-capita rates behind the daily population tick. */
export const POPULATION_DYNAMICS = {
	BIRTHS_PER_YEAR: 0.012,
	DEATHS_PER_YEAR: 0.009,
	/** Extra deaths while the state's homeland is an active warzone. */
	WAR_DEATHS_PER_YEAR: 0.02,
	/** Environmental health: harsh extraction shortens lives. */
	ENVIRONMENT_DEATHS_PER_YEAR: {
		conservation: 0,
		standard: 0,
		industrial: 0.003,
		unrestricted: 0.008
	} as Record<ExploitationPolicyLike, number>,
	/** Each per-mille of the population under arms takes a small toll. */
	CONSCRIPTION_DEATHS_PER_PERMILLE: 0.0005,
	/** Below this stability, people vote with their feet. */
	EMIGRATION_BELOW_STABILITY: 35,
	EMIGRATION_PER_YEAR: 0.02,
	/** No single year moves a region by more than this share, either way. */
	MAX_ANNUAL_CHANGE: 0.05
} as const;

export interface PopulationPressure {
	/** Days the change covers (a daily cron passes 1). */
	days: number;
	atWar: boolean;
	environment: ExploitationPolicyLike;
	/** Soldiers per 1,000 civilians. */
	conscription: number;
	/** Regime stability (0-100): low stability drives emigration. */
	stability: number;
	/** Share of basic needs civilians go without (0-1): hunger, thirst and cold kill. */
	hardship: number;
}

/**
 * Signed integer change to a region's civilian population over `days`, from
 * births, baseline and war mortality, environmental and conscription tolls,
 * and instability-driven emigration. Rounded once at the end so small regions
 * keep their people until the change really adds up to a body.
 */
export function populationDelta(population: number, p: PopulationPressure): number {
	if (!Number.isFinite(population) || population <= 0 || p.days <= 0) return 0;
	const d = POPULATION_DYNAMICS;
	let annual = d.BIRTHS_PER_YEAR - d.DEATHS_PER_YEAR;
	if (p.atWar) annual -= d.WAR_DEATHS_PER_YEAR;
	annual -= d.ENVIRONMENT_DEATHS_PER_YEAR[p.environment] ?? 0;
	annual -= Math.max(0, p.conscription) * d.CONSCRIPTION_DEATHS_PER_PERMILLE;
	if (p.stability < d.EMIGRATION_BELOW_STABILITY) {
		annual -= d.EMIGRATION_PER_YEAR * ((d.EMIGRATION_BELOW_STABILITY - p.stability) / d.EMIGRATION_BELOW_STABILITY);
	}
	// A region that cannot feed, water or warm its people loses them faster
	// than a merely unhappy one. Imported from the supply rules to keep the
	// thresholds in one place.
	annual -= hardshipExtraDeaths(p.hardship) + hardshipExtraEmigration(p.hardship);
	annual = clamp(annual, -d.MAX_ANNUAL_CHANGE, d.MAX_ANNUAL_CHANGE);
	return Math.round(population * annual * (p.days / 365));
}
