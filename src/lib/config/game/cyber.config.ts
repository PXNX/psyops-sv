// Covert operations, part 1: cyber operations, cyber defence and the odds
// every covert operation (cyber or psyops) is launched with.
//
// A state's leadership launches an operation against another state, paid
// from the treasury. It resolves at once with three rolls:
//   success     — did it work? A success leaves a time-limited state effect.
//   detection   — does the target notice? Successful sabotage is always
//                 noticed (the lights go out); a failed attempt only maybe.
//   attribution — does the target learn who did it? Caught in peacetime, the
//                 target gains a casus belli: for a week it can strike back
//                 as if at war.
// The target's cyber defence lowers cyber success and raises attribution;
// repeated operations against the same target put it on alert ("heat").
//
// Pure data and pure functions only: the client imports this for the live
// odds preview, the server for everything else.

export type CovertDomain = "cyber" | "psyops";
export type CovertOpKind =
	| "grid_attack"
	| "c2_disruption"
	| "financial_theft"
	| "morale_campaign"
	| "disinformation"
	| "counter_propaganda"
	| "leaflet_drop";
export type StateEffectKind =
	"grid_degraded" | "c2_degraded" | "morale_shaken" | "deception" | "morale_boost" | "casus_belli";

export interface CovertOpSpec {
	domain: CovertDomain;
	label: string;
	/** One line on what it does, for the planner. */
	blurb: string;
	/** Treasury cost on launch. */
	cost: number;
	/** Chance (0-1) it works against an undefended target at war. */
	baseSuccess: number;
	/** Chance (0-1) the target learns who did it. */
	baseAttribution: number;
	/** How long the effect lasts (0 = instant). */
	durationHours: number;
	/** Hours before the same state can launch this kind again. */
	cooldownHours: number;
	/** Effect strength in percent. */
	magnitude: number;
	/** The effect a success leaves on the target (null = instant only). */
	effect: StateEffectKind | null;
	/** Only against a state you are at war with (or hold a casus belli on). */
	needsWar: boolean;
	/** Aimed at your own state (defensive). */
	self?: boolean;
	/** Needs a region (disinformation: one your side holds). */
	needsRegion?: boolean;
	/** A successful op is noticed by the target even if not attributed. */
	visible: boolean;
}

export const CYBER_OPS = {
	grid_attack: {
		domain: "cyber",
		label: "Grid attack",
		blurb: "Malware in the power grid's control systems: energy capacity and factory output drop.",
		cost: 60_000,
		baseSuccess: 0.6,
		baseAttribution: 0.35,
		durationHours: 12,
		cooldownHours: 24,
		magnitude: 25,
		effect: "grid_degraded",
		needsWar: false,
		visible: true
	},
	c2_disruption: {
		domain: "cyber",
		label: "Sensor & C2 disruption",
		blurb:
			"Jams sensor links and command networks: their recon sees less and lands later, their units fight less coordinated.",
		cost: 45_000,
		baseSuccess: 0.6,
		baseAttribution: 0.3,
		durationHours: 6,
		cooldownHours: 12,
		magnitude: 30,
		effect: "c2_degraded",
		needsWar: false,
		visible: true
	},
	financial_theft: {
		domain: "cyber",
		label: "Treasury breach",
		blurb: "Siphons a slice of the target's treasury through shell accounts; half of it reaches yours.",
		cost: 30_000,
		baseSuccess: 0.45,
		baseAttribution: 0.45,
		durationHours: 0,
		cooldownHours: 48,
		magnitude: 4,
		effect: null,
		needsWar: false,
		visible: true
	}
} as const satisfies Record<string, CovertOpSpec>;

export const CYBER = {
	/** Treasury breach: at most this much is taken in one go… */
	THEFT_MAX: 200_000,
	/** …and this share of it reaches the thief (the rest is lost laundering it). */
	THEFT_KEPT: 0.5,
	/** C2 disruption: recon passes of the target take this much longer. */
	C2_RECON_DELAY: 1.5,
	/** C2 disruption: share of its magnitude that hits battle coordination. */
	C2_BATTLE_SHARE: 0.3,
	/** Peacetime operations are riskier: extra attribution chance. */
	PEACETIME_ATTRIBUTION: 0.15,
	/** Operations by the same state against the same target in this window raise its alert. */
	HEAT_WINDOW_HOURS: 24,
	HEAT_SUCCESS: 0.05,
	HEAT_ATTRIBUTION: 0.05,
	HEAT_MAX_STACKS: 4,
	/** A botched operation leaves traces: attribution × this on failure. */
	FAILURE_ATTRIBUTION: 1.25,
	/** A failed op the target wasn't told about is still noticed with attribution + this. */
	FAILURE_DETECTION: 0.25,
	/** How long a casus belli from a caught peacetime operation lasts. */
	CASUS_BELLI_HOURS: 168,
	SUCCESS_MIN: 0.05,
	SUCCESS_MAX: 0.95,
	ATTRIBUTION_MIN: 0.02,
	ATTRIBUTION_MAX: 0.95
} as const;

// ── Cyber defence ───────────────────────────────────────────────────────────

export const CYBER_DEFENCE = {
	MAX_LEVEL: 5,
	/** Per level: cyber success against the state drops by this much… */
	SUCCESS_PER_LEVEL: 0.07,
	/** …and attribution of cyber attacks rises by this much. */
	ATTRIBUTION_PER_LEVEL: 0.06,
	/** Treasury cost of going from level n to n+1 is BASE_COST × (n+1). */
	BASE_COST: 40_000
} as const;

/** Treasury cost of raising cyber defence from `level` to `level + 1`, or null at the cap. */
export function cyberDefenceUpgradeCost(level: number): number | null {
	if (level >= CYBER_DEFENCE.MAX_LEVEL) return null;
	return CYBER_DEFENCE.BASE_COST * (level + 1);
}

// ── Odds ────────────────────────────────────────────────────────────────────

export interface OddsInput {
	spec: Pick<CovertOpSpec, "domain" | "baseSuccess" | "baseAttribution" | "self">;
	/** The target's cyber defence level. */
	defenceLevel: number;
	/** At war with the target, or holding a casus belli against it. */
	atWar: boolean;
	/** Operations this state launched against the target within the heat window. */
	recentOps: number;
	/** The target runs counter-propaganda (psyops only). */
	targetResilient: boolean;
	/** psyops.config's success penalty for a resilient target (passed in to keep this file standalone). */
	resilienceSuccess?: number;
}

export interface OddsFactor {
	label: string;
	/** Change to success / attribution, as a fraction (-0.07 = 7 points down). */
	success: number;
	attribution: number;
}

export interface Odds {
	success: number;
	attribution: number;
	/** Why: every modifier on top of the base odds, for the planner. */
	factors: OddsFactor[];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Success and attribution chance of an operation, and the reasons behind them. */
export function operationOdds(input: OddsInput): Odds {
	if (input.spec.self) return { success: 1, attribution: 0, factors: [] };
	const factors: OddsFactor[] = [];
	if (input.spec.domain === "cyber" && input.defenceLevel > 0) {
		factors.push({
			label: `Cyber defence level ${input.defenceLevel}`,
			success: -CYBER_DEFENCE.SUCCESS_PER_LEVEL * input.defenceLevel,
			attribution: CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL * input.defenceLevel
		});
	}
	if (!input.atWar) {
		factors.push({ label: "Peacetime: diplomatic exposure", success: 0, attribution: CYBER.PEACETIME_ATTRIBUTION });
	}
	const heat = Math.min(CYBER.HEAT_MAX_STACKS, Math.max(0, input.recentOps));
	if (heat > 0) {
		factors.push({
			label: `Target on alert (${heat} recent op${heat === 1 ? "" : "s"})`,
			success: -CYBER.HEAT_SUCCESS * heat,
			attribution: CYBER.HEAT_ATTRIBUTION * heat
		});
	}
	if (input.spec.domain === "psyops" && input.targetResilient) {
		factors.push({ label: "Target runs counter-propaganda", success: -(input.resilienceSuccess ?? 0), attribution: 0 });
	}
	const success = factors.reduce((s, f) => s + f.success, input.spec.baseSuccess);
	const attribution = factors.reduce((s, f) => s + f.attribution, input.spec.baseAttribution);
	return {
		success: round2(clamp(success, CYBER.SUCCESS_MIN, CYBER.SUCCESS_MAX)),
		attribution: round2(clamp(attribution, CYBER.ATTRIBUTION_MIN, CYBER.ATTRIBUTION_MAX)),
		factors: factors.map((f) => ({ ...f, success: round2(f.success), attribution: round2(f.attribution) }))
	};
}

export interface OperationRoll {
	succeeded: boolean;
	detected: boolean;
	attributed: boolean;
}

/**
 * Roll an operation: three draws from `rng`, always in the same order so a
 * seeded rng gives a reproducible outcome. Successful visible ops are always
 * noticed; failures leave traces (higher attribution, maybe detection).
 */
export function rollOperation(odds: Pick<Odds, "success" | "attribution">, visible: boolean, rng: () => number) {
	const [r1, r2, r3] = [rng(), rng(), rng()];
	const succeeded = r1 < odds.success;
	const attributionChance = succeeded
		? odds.attribution
		: Math.min(CYBER.ATTRIBUTION_MAX, odds.attribution * CYBER.FAILURE_ATTRIBUTION);
	const attributed = r3 < attributionChance;
	const detected =
		attributed ||
		(succeeded && visible) ||
		(!succeeded && r2 < Math.min(CYBER.ATTRIBUTION_MAX, attributionChance + CYBER.FAILURE_DETECTION));
	return { succeeded, detected, attributed } satisfies OperationRoll;
}

/** How much a treasury breach takes from a treasury of `balance`. */
export function theftAmount(balance: number, percent: number = CYBER_OPS.financial_theft.magnitude): number {
	return Math.max(0, Math.min(CYBER.THEFT_MAX, Math.floor((Math.max(0, balance) * percent) / 100)));
}

/** Factor on a state's energy capacity and factory output while its grid is degraded by `percent`. */
export const gridFactor = (percent: number) => clamp(1 - percent / 100, 0, 1);
