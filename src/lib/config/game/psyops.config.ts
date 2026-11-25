// Covert operations, part 2: psychological operations.
//
// Influence campaigns shake an enemy's morale (less output in battle, more
// war weariness), plant false intel so the enemy's recon miscounts a region,
// drop leaflets its residents actually read, or steady your own population.
// Morale effects stack with diminishing returns, and bigger populations are
// harder to sway. Good recon sees through planted intel: the sharper the
// pass, the likelier it reports the truth.
//
// Pure data and pure functions only (client and server).
import {
	CYBER,
	CYBER_OPS,
	operationOdds,
	type CovertOpKind,
	type CovertOpSpec,
	type Odds,
	type OddsInput
} from "./cyber.config";

export const PSYOPS_OPS = {
	morale_campaign: {
		domain: "psyops",
		label: "Morale campaign",
		blurb:
			"Radio, rumours and doctored footage aimed at their troops and home front: their units fight worse and the war wears them down.",
		cost: 25_000,
		baseSuccess: 0.7,
		baseAttribution: 0.5,
		durationHours: 24,
		cooldownHours: 12,
		magnitude: 6,
		effect: "morale_shaken",
		needsWar: true,
		visible: true
	},
	disinformation: {
		domain: "psyops",
		label: "Disinformation",
		blurb:
			"Decoys, fake radio traffic and planted leaks around one of your regions: their recon there counts ghost divisions, or misses real ones.",
		cost: 35_000,
		baseSuccess: 0.65,
		baseAttribution: 0.25,
		durationHours: 18,
		cooldownHours: 12,
		magnitude: 80,
		effect: "deception",
		needsWar: true,
		needsRegion: true,
		visible: false
	},
	counter_propaganda: {
		domain: "psyops",
		label: "Counter-propaganda",
		blurb:
			"Rally your own population: your units fight a little harder and enemy campaigns land softer and less often.",
		cost: 20_000,
		baseSuccess: 1,
		baseAttribution: 0,
		durationHours: 24,
		cooldownHours: 24,
		magnitude: 5,
		effect: "morale_boost",
		needsWar: false,
		self: true,
		visible: true
	},
	leaflet_drop: {
		domain: "psyops",
		label: "Leaflet drop",
		blurb:
			"Printed propaganda dropped over their cities: every resident finds it on their overview. Cheap, loud, often traced back.",
		cost: 8_000,
		baseSuccess: 0.85,
		baseAttribution: 0.6,
		durationHours: 12,
		cooldownHours: 6,
		magnitude: 2,
		effect: "morale_shaken",
		needsWar: false,
		visible: true
	}
} as const satisfies Record<string, CovertOpSpec>;

/** Every covert operation, cyber and psyops, by kind. */
export const COVERT_OPS: Record<CovertOpKind, CovertOpSpec> = { ...CYBER_OPS, ...PSYOPS_OPS };
export const COVERT_OP_KINDS = Object.keys(COVERT_OPS) as CovertOpKind[];

export const PSYOPS = {
	/** Stacked morale loss approaches this cap (percent) but never reaches it. */
	MORALE_CAP: 20,
	/** Morale boosts add up to at most this (percent). */
	BOOST_CAP: 10,
	/** Counter-propaganda: enemy psyops success down by this… */
	RESILIENCE_SUCCESS: 0.15,
	/** …and their morale effects land at this share of their strength. */
	RESILIENCE_MAGNITUDE: 0.5,
	/** A state with this many civilians (population.config) feels a campaign at full strength. */
	POPULATION_REF: 1_500_000,
	POPULATION_FACTOR_MIN: 0.5,
	POPULATION_FACTOR_MAX: 1.5,
	/** War exhaustion each successful campaign adds to the wars between the two states. */
	EXHAUSTION: { morale_campaign: 3, leaflet_drop: 1 } as Partial<Record<CovertOpKind, number>>,
	/** Psyops can add at most this much exhaustion to one war. */
	EXHAUSTION_CAP: 25,
	/** Disinformation: per category, a pass sees through with chance coverage × this. */
	SEE_THROUGH: 0.6,
	/** Disinformation postures: inflate (+%) adds decoys, conceal (-%) hides units. */
	INFLATE: 80,
	CONCEAL: -60,
	/** Inflatable tanks: vehicles added to a picture on top of the inflated count. */
	DECOY_VEHICLES: 2
} as const;

export type DisinfoPosture = "inflate" | "conceal";
export const postureMagnitude = (p: DisinfoPosture) => (p === "conceal" ? PSYOPS.CONCEAL : PSYOPS.INFLATE);

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * How strongly a population of `population` feels a campaign: 1 at the
 * reference size, less for bigger states (√ falloff), more for small ones.
 * Unknown/zero population counts as the reference.
 */
export function populationFactor(population: number | null | undefined): number {
	if (!population || population <= 0) return 1;
	return round3(
		clamp(Math.sqrt(PSYOPS.POPULATION_REF / population), PSYOPS.POPULATION_FACTOR_MIN, PSYOPS.POPULATION_FACTOR_MAX)
	);
}

/** Strength (percent) a morale effect lands with on a target. */
export function moraleMagnitude(base: number, population: number | null | undefined, resilient: boolean): number {
	const m = base * populationFactor(population) * (resilient ? PSYOPS.RESILIENCE_MAGNITUDE : 1);
	return Math.max(1, Math.round(m * 10) / 10);
}

/**
 * Stack morale losses with diminishing returns: each campaign takes its share
 * of what's left below the cap. One 6% campaign = 6%, two = 10.2%, three ≈ 13.1%.
 */
export function stackMorale(magnitudes: number[], cap: number = PSYOPS.MORALE_CAP): number {
	const kept = magnitudes.reduce((left, m) => left * (1 - clamp(m, 0, cap) / cap), 1);
	return Math.round(cap * (1 - kept) * 10) / 10;
}

export interface PsyopsSideEffects {
	/** morale_shaken magnitudes on the side's state. */
	morale: number[];
	/** morale_boost magnitudes. */
	boosts: number[];
	/** c2_degraded magnitudes. */
	c2: number[];
}

export interface PsyopsBattleModifier {
	/** Multiplier on every engaged unit's output. */
	factor: number;
	moraleLoss: number;
	boost: number;
	coordinationLoss: number;
}

/** What morale, counter-propaganda and C2 disruption do to a side's battle output. */
export function psyopsBattleModifier(e: PsyopsSideEffects): PsyopsBattleModifier {
	const moraleLoss = stackMorale(e.morale);
	const boost = Math.min(
		PSYOPS.BOOST_CAP,
		e.boosts.reduce((s, b) => s + b, 0)
	);
	const coordinationLoss = Math.round(Math.max(0, ...e.c2) * CYBER.C2_BATTLE_SHARE * 10) / 10;
	const factor = round3((1 - moraleLoss / 100) * (1 + boost / 100) * (1 - coordinationLoss / 100));
	return { factor, moraleLoss, boost, coordinationLoss };
}

export const NEUTRAL_PSYOPS: PsyopsBattleModifier = { factor: 1, moraleLoss: 0, boost: 0, coordinationLoss: 0 };

/** Extra war exhaustion from successful campaigns between two belligerents. */
export function psyopsExhaustion(kinds: CovertOpKind[]): number {
	return Math.min(
		PSYOPS.EXHAUSTION_CAP,
		kinds.reduce((s, k) => s + (PSYOPS.EXHAUSTION[k] ?? 0), 0)
	);
}

/**
 * Planted intel, as one recon pass would swallow it. `roll` is one draw in
 * [0, 1) per pass; a category is seen through when roll < coverage × SEE_THROUGH,
 * so sharp sensors in good conditions usually report the truth.
 */
export interface Deception {
	/** Signed percent: +80 inflates counts by 80%, -60 hides 60%. */
	magnitude: number;
	roll: number;
}

export function seesThrough(deception: Deception, coverage: number): boolean {
	return deception.roll < coverage * PSYOPS.SEE_THROUGH;
}

/** A unit count after deception (unchanged when seen through or nothing is there). */
export function deceivedCount(n: number, magnitude: number): number {
	if (n <= 0) return n;
	const scaled = n * (1 + magnitude / 100);
	return magnitude >= 0 ? Math.max(n + 1, Math.round(scaled)) : Math.max(0, Math.floor(scaled));
}

/** Odds for any covert operation (cyber or psyops), with the psyops resilience rule applied. */
export function covertOdds(kind: CovertOpKind, input: Omit<OddsInput, "spec" | "resilienceSuccess">): Odds {
	return operationOdds({ ...input, spec: COVERT_OPS[kind], resilienceSuccess: PSYOPS.RESILIENCE_SUCCESS });
}
