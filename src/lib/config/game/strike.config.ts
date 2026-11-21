// Airstrikes: every tunable and the pure maths in one place.
//
// The president or defence minister of a state at war orders a strike on an
// enemy region. A strike has a tier (what it is for), a target and a weapon:
//
//   strategic   power grid, industry (and hospitals: protected)  long range, expensive, long cooldown
//   operational logistics, bridges, fortifications, air defence  supply cut in and around the region
//   tactical    enemy units in or near a battle                  close air support, short cooldown
//
// How it goes is decided in three rolls: enemy air defence may intercept it
// (droneInterceptChance from recon.config, scaled by how exposed the weapon
// is), then it hits, partly hits or misses (accuracy from guidance, weather,
// night, ground cover and, most of all, the attacker's intel on the region),
// then damage and civilian harm vary a little around their expected values.
//
// Civilian harm is estimated before the strike from the region's population
// density, the target type, the weapon's blast and its accuracy, and shown to
// the commander. International humanitarian law (ihl.config.ts) judges the
// strike on what the commander knew: protected targets, indiscriminate
// weapons in populated areas and expected harm out of proportion to the
// military value all count as violations.
//
// Pure data and pure functions only: the client imports this for the live
// strike preview, the server for resolution (services/military/strike.ts).
import { droneInterceptChance, type Cover, type ViewConditions, type Weather } from "./recon.config";

// ── Tiers ───────────────────────────────────────────────────────────────────

export type StrikeTier = "strategic" | "operational" | "tactical";
export const STRIKE_TIERS: StrikeTier[] = ["strategic", "operational", "tactical"];

export const TIER_CONFIG: Record<StrikeTier, { label: string; blurb: string; cooldownHours: number }> = {
	strategic: {
		label: "Strategic",
		blurb: "Power and industry deep in enemy territory. Expensive, long reach, long cooldown.",
		cooldownHours: 8
	},
	operational: {
		label: "Operational",
		blurb: "Supply lines, bridges, fortifications and air defence that shape the coming battles.",
		cooldownHours: 3
	},
	tactical: {
		label: "Tactical",
		blurb: "Close air support against enemy units in or next to the fighting.",
		cooldownHours: 1
	}
};

// ── Targets ─────────────────────────────────────────────────────────────────

export type StrikeTarget =
	| "power_grid"
	| "industry"
	| "hospital"
	| "logistics"
	| "bridges"
	| "fortifications"
	| "air_defence"
	| "radar"
	| "units";

/** Time-limited effects a strike leaves on the region's owner. */
export type StrikeEffectKind = "supply" | "energy" | "industry";

export interface TargetConfig {
	label: string;
	tier: StrikeTier;
	blurb: string;
	/** Protected under IHL: striking it is always a violation. */
	protected: boolean;
	/** "building" targets wreck region levels / leave effects; "forces" targets damage units. */
	kind: "building" | "forces";
	/** Region level a direct hit knocks down (repairable through construction). */
	stat?: "economy" | "infrastructure" | "fortifications" | "hospitals" | "radar";
	levelsOnHit?: number;
	/** Effect left on the region's owner on a hit (half on a partial hit). */
	effect?: { kind: StrikeEffectKind; magnitude: number; hours: number };
	/**
	 * Military advantage the strike is expected to bring, in the same unit as
	 * expected civilian casualties: harm above this is disproportionate.
	 */
	militaryValue: number;
	/** km² around the target where a stray or full hit endangers civilians. */
	footprintKm2: number;
	/** People inside the target itself (patients, staff), on top of the footprint. */
	occupants?: number;
}

export const TARGETS: Record<StrikeTarget, TargetConfig> = {
	power_grid: {
		label: "Power grid",
		tier: "strategic",
		blurb: "Power plants and substations: knocks down a power level and cuts the state's energy capacity for a day.",
		protected: false,
		kind: "building",
		stat: "economy",
		levelsOnHit: 1,
		effect: { kind: "energy", magnitude: 0.25, hours: 24 },
		militaryValue: 100,
		footprintKm2: 8
	},
	industry: {
		label: "Industry",
		tier: "strategic",
		blurb: "Factories and depots: cuts factory output in the region for a day.",
		protected: false,
		kind: "building",
		effect: { kind: "industry", magnitude: 0.35, hours: 24 },
		militaryValue: 80,
		footprintKm2: 10
	},
	hospital: {
		label: "Hospital",
		tier: "strategic",
		blurb: "Protected under international humanitarian law. Always a grave violation.",
		protected: true,
		kind: "building",
		stat: "hospitals",
		levelsOnHit: 1,
		militaryValue: 0,
		footprintKm2: 3,
		occupants: 250
	},
	logistics: {
		label: "Logistics",
		tier: "operational",
		blurb: "Depots and supply routes: the owner's units fight short of supply here and next door for 6 h.",
		protected: false,
		kind: "building",
		effect: { kind: "supply", magnitude: 0.3, hours: 6 },
		militaryValue: 70,
		footprintKm2: 5
	},
	bridges: {
		label: "Bridges & roads",
		tier: "operational",
		blurb: "Knocks down an infrastructure level and slows supply for 12 h.",
		protected: false,
		kind: "building",
		stat: "infrastructure",
		levelsOnHit: 1,
		effect: { kind: "supply", magnitude: 0.15, hours: 12 },
		militaryValue: 60,
		footprintKm2: 6
	},
	fortifications: {
		label: "Fortifications",
		tier: "operational",
		blurb: "Bunkers and trench lines: knocks down a fortification level before an assault.",
		protected: false,
		kind: "building",
		stat: "fortifications",
		levelsOnHit: 1,
		militaryValue: 50,
		footprintKm2: 2
	},
	air_defence: {
		label: "Air defence (SEAD)",
		tier: "operational",
		blurb: "Hunts the region's air-defence units so later strikes and recon get through.",
		protected: false,
		kind: "forces",
		militaryValue: 60,
		footprintKm2: 3
	},
	radar: {
		label: "Radar installations",
		tier: "operational",
		blurb:
			"Air-defence radars: knocks down a radar coverage level so drones and later strikes get through more easily.",
		protected: false,
		kind: "building",
		stat: "radar",
		levelsOnHit: 1,
		militaryValue: 55,
		footprintKm2: 2
	},
	units: {
		label: "Enemy units",
		tier: "tactical",
		blurb: "Direct damage to enemy units fighting (or stationed) in the region.",
		protected: false,
		kind: "forces",
		militaryValue: 40,
		footprintKm2: 4
	}
};

export const TARGET_IDS = Object.keys(TARGETS) as StrikeTarget[];
export const targetsForTier = (tier: StrikeTier) => TARGET_IDS.filter((t) => TARGETS[t].tier === tier);

/** Military value of hitting enemy units: grows with what is there to hit. */
export const UNITS_VALUE_PER_UNIT = 15;
export const UNITS_VALUE_MAX = 150;

export function targetMilitaryValue(target: StrikeTarget, enemyUnits = 0): number {
	if (target === "units")
		return Math.min(UNITS_VALUE_MAX, TARGETS.units.militaryValue + enemyUnits * UNITS_VALUE_PER_UNIT);
	return TARGETS[target].militaryValue;
}

// ── Weapons ─────────────────────────────────────────────────────────────────

export type StrikeWeapon =
	| "cruise_missile"
	| "ballistic_missile"
	| "guided_bomb"
	| "gps_bomb"
	| "unguided_bombs"
	| "attack_drone"
	| "close_air_support";

/** How a weapon finds its target; decides what weather and darkness do to it. */
export type Guidance = "gps" | "inertial" | "laser" | "eo" | "none";

export const GUIDANCE_LABEL: Record<Guidance, string> = {
	gps: "GPS/INS",
	inertial: "Inertial",
	laser: "Laser-guided",
	eo: "Camera (EO)",
	none: "Unguided"
};

export interface WeaponConfig {
	label: string;
	short: string;
	guidance: Guidance;
	tiers: StrikeTier[];
	/** Currency from the state treasury per strike. */
	cost: number;
	/** Aircraft that must fly the sortie (any of them), or null for missiles/drones. */
	requires: ("bomber_squadron" | "fighter_squadron")[] | null;
	/** Max border crossings from a region your side holds; null = any range. */
	maxHops: number | null;
	/** Chance to hit in clear daylight over open ground with perfect intel. */
	baseAccuracy: number;
	/** Share of the air-defence intercept chance that applies (stealthy/fast = low). */
	adExposure: number;
	/** Share of civilians in the footprint harmed when it lands among them. */
	blast: number;
	/** Damage multiplier: region levels, effect strength, unit damage. */
	power: number;
	/** Strength points taken off enemy units on a direct hit. */
	unitDamage: number;
}

export const WEAPONS: Record<StrikeWeapon, WeaponConfig> = {
	cruise_missile: {
		label: "Cruise missile",
		short: "CM",
		guidance: "gps",
		tiers: ["strategic", "operational"],
		cost: 120_000,
		requires: null,
		maxHops: null,
		baseAccuracy: 0.9,
		adExposure: 0.55,
		blast: 0.06,
		power: 1,
		unitDamage: 30
	},
	ballistic_missile: {
		label: "Ballistic missile",
		short: "BM",
		guidance: "inertial",
		tiers: ["strategic", "operational"],
		cost: 200_000,
		requires: null,
		maxHops: null,
		baseAccuracy: 0.7,
		adExposure: 0.25,
		blast: 0.14,
		power: 2,
		unitDamage: 45
	},
	guided_bomb: {
		label: "Laser-guided bombs",
		short: "LGB",
		guidance: "laser",
		tiers: ["strategic", "operational", "tactical"],
		cost: 40_000,
		requires: ["bomber_squadron"],
		maxHops: 3,
		baseAccuracy: 0.95,
		adExposure: 0.8,
		blast: 0.05,
		power: 1,
		unitDamage: 40
	},
	gps_bomb: {
		label: "GPS glide bombs",
		short: "JDAM",
		guidance: "gps",
		tiers: ["operational", "tactical"],
		cost: 30_000,
		requires: ["bomber_squadron", "fighter_squadron"],
		maxHops: 2,
		baseAccuracy: 0.85,
		adExposure: 0.6,
		blast: 0.06,
		power: 1,
		unitDamage: 35
	},
	unguided_bombs: {
		label: "Unguided bombs",
		short: "GP",
		guidance: "none",
		tiers: ["operational", "tactical"],
		cost: 15_000,
		requires: ["bomber_squadron"],
		maxHops: 2,
		baseAccuracy: 0.5,
		adExposure: 1,
		blast: 0.16,
		power: 2,
		unitDamage: 55
	},
	attack_drone: {
		label: "Loitering munition",
		short: "LM",
		guidance: "eo",
		tiers: ["operational", "tactical"],
		cost: 8_000,
		requires: null,
		maxHops: 1,
		baseAccuracy: 0.85,
		adExposure: 1,
		blast: 0.015,
		power: 0.5,
		unitDamage: 15
	},
	close_air_support: {
		label: "Close air support",
		short: "CAS",
		guidance: "eo",
		tiers: ["tactical"],
		cost: 20_000,
		requires: ["fighter_squadron"],
		maxHops: 1,
		baseAccuracy: 0.9,
		adExposure: 0.7,
		blast: 0.03,
		power: 1,
		unitDamage: 35
	}
};

export const WEAPON_IDS = Object.keys(WEAPONS) as StrikeWeapon[];
export const weaponsForTier = (tier: StrikeTier) => WEAPON_IDS.filter((w) => WEAPONS[w].tiers.includes(tier));

/** Hours an aircraft needs between sorties. */
export const SORTIE_COOLDOWN_HOURS = 4;
/** Strength an aircraft loses when its sortie is intercepted. */
export const INTERCEPTED_AIRCRAFT_DAMAGE = 20;

// ── Accuracy ────────────────────────────────────────────────────────────────

/** Accuracy multiplier per guidance and weather. */
export const GUIDANCE_WEATHER: Record<Guidance, Record<Weather, number>> = {
	gps: { clear: 1, cloudy: 1, rain: 0.97, fog: 1 },
	inertial: { clear: 1, cloudy: 1, rain: 1, fog: 1 },
	laser: { clear: 1, cloudy: 0.55, rain: 0.5, fog: 0.35 },
	eo: { clear: 1, cloudy: 0.8, rain: 0.55, fog: 0.4 },
	none: { clear: 1, cloudy: 0.8, rain: 0.7, fog: 0.6 }
};
/** Accuracy multiplier at night. */
export const GUIDANCE_NIGHT: Record<Guidance, number> = { gps: 1, inertial: 1, laser: 0.85, eo: 0.6, none: 0.7 };
/** Units dig in: accuracy multiplier against forces per ground cover. Buildings don't hide. */
export const FORCES_COVER: Record<Cover, number> = { open: 1, forest: 0.65, urban: 0.75, mountain: 0.8 };

/** Accuracy with no intel at all, rising linearly to INTEL_FULL at full confidence. */
export const INTEL_BLIND = 0.55;
export const INTEL_FULL = 1.1;
/** A fresh pass that saw the region's installations pins building targets down this well. */
export const BUILDINGS_SEEN_CONFIDENCE = 0.85;
/** Without a pass that saw the installations, unit-picture confidence counts this much for buildings. */
export const BUILDINGS_UNSEEN_SHARE = 0.5;
/** Own troops fighting in the region spot for tactical strikes at least this well. */
export const FORWARD_OBSERVER_CONFIDENCE = 0.4;

export const ACCURACY_MIN = 0.02;
export const ACCURACY_MAX = 0.97;
/** A strike that doesn't hit still lands close enough for partial damage this often. */
export const PARTIAL_SHARE = 0.4;
export const PARTIAL_DAMAGE = 0.4;

// ── Civilian harm ───────────────────────────────────────────────────────────

/** How much more crowded a target's surroundings are than the regional average, by cover. */
export const CIVILIAN_CONCENTRATION: Record<Cover, number> = { urban: 2.2, open: 1, forest: 0.5, mountain: 0.6 };
/** Even a direct hit spills this share of the blast onto the footprint; a miss spills all of it. */
export const HIT_SPILL = 0.3;

export type RiskLevel = "none" | "low" | "medium" | "high" | "extreme";
/** Expected civilian casualties at or above which a strike is at each risk level. */
export const RISK_LEVELS: { level: RiskLevel; from: number }[] = [
	{ level: "extreme", from: 200 },
	{ level: "high", from: 50 },
	{ level: "medium", from: 10 },
	{ level: "low", from: 1 }
];

export function riskLevel(expectedCasualties: number): RiskLevel {
	return RISK_LEVELS.find((r) => expectedCasualties >= r.from)?.level ?? "none";
}

// ── The maths ───────────────────────────────────────────────────────────────

/** Why a number is what it is: one line per factor, shown in the planner. */
export interface Factor {
	label: string;
	value: number;
	note?: string;
}

export interface StrikeContext {
	conditions: ViewConditions;
	/** Enemy air-defence units able to engage (the true count on resolution, the known one in previews). */
	adUnits: number;
	/** The attacker side's fused intel confidence on the region (0-1), 0 without fresh intel. */
	intelConfidence: number;
	/** Whether a fresh pass saw the region's installations. */
	buildingsSeen: boolean;
	/** The attacker's own units are fighting in the region (forward observers). */
	ownTroopsEngaged: boolean;
	/** Civilians in the region and their density per km². */
	population: number;
	density: number;
	/** Enemy units known (or present, on resolution) in the region, for the military value of a units strike. */
	enemyUnits: number;
	/** Navigation-satellite accuracy multiplier (1 = no GPS constellation). Optional so existing callers are unchanged. */
	gpsAccuracy?: number;
}

/** Targeting confidence for this target given the side's intel. */
export function targetingConfidence(target: StrikeTarget, ctx: StrikeContext): { value: number; note: string } {
	const conf = Math.max(0, Math.min(1, ctx.intelConfidence));
	if (TARGETS[target].kind === "building") {
		if (ctx.buildingsSeen)
			return { value: Math.max(BUILDINGS_SEEN_CONFIDENCE, conf), note: "fresh pass located the installations" };
		return {
			value: conf * BUILDINGS_UNSEEN_SHARE,
			note: conf ? "installations not imaged; only a picture of the forces" : "no fresh intel"
		};
	}
	if (target === "units" && ctx.ownTroopsEngaged && conf < FORWARD_OBSERVER_CONFIDENCE) {
		return { value: FORWARD_OBSERVER_CONFIDENCE, note: "forward observers with own troops" };
	}
	return { value: conf, note: conf ? "fused intel picture" : "no fresh intel" };
}

/** Chance enemy air defence shoots the strike down. */
export function strikeInterceptChance(weapon: StrikeWeapon, adUnits: number): number {
	return droneInterceptChance(adUnits) * WEAPONS[weapon].adExposure;
}

/** Chance to hit, with the factors that make it up. */
export function strikeAccuracy(
	target: StrikeTarget,
	weapon: StrikeWeapon,
	ctx: StrikeContext
): { value: number; factors: Factor[] } {
	const w = WEAPONS[weapon];
	const { weather, night, cover } = ctx.conditions;
	const intel = targetingConfidence(target, ctx);
	const factors: Factor[] = [
		{ label: `${GUIDANCE_LABEL[w.guidance]} base`, value: w.baseAccuracy },
		{ label: `Weather: ${weather}`, value: GUIDANCE_WEATHER[w.guidance][weather] },
		{ label: night ? "Night" : "Daylight", value: night ? GUIDANCE_NIGHT[w.guidance] : 1 },
		{ label: `Cover: ${cover}`, value: TARGETS[target].kind === "forces" ? FORCES_COVER[cover] : 1 },
		{
			label: `Intel ${Math.round(intel.value * 100)}%`,
			value: INTEL_BLIND + (INTEL_FULL - INTEL_BLIND) * intel.value,
			note: intel.note
		}
	];
	// Space domain (space.config.ts): a GPS constellation sharpens guided
	// weapons even through cloud and at night. Unguided munitions gain nothing.
	if ((w.guidance === "gps" || w.guidance === "laser") && ctx.gpsAccuracy && ctx.gpsAccuracy > 1) {
		factors.push({ label: "GPS constellation", value: ctx.gpsAccuracy, note: "navigation satellites" });
	}
	const raw = factors.reduce((p, f) => p * f.value, 1);
	return {
		value: Math.min(ACCURACY_MAX, Math.max(ACCURACY_MIN, raw)),
		factors: factors.map((f) => ({ ...f, value: Math.round(f.value * 100) / 100 }))
	};
}

/** Civilians within the danger zone of the target. */
export function exposedCivilians(target: StrikeTarget, ctx: Pick<StrikeContext, "density" | "conditions">): number {
	const t = TARGETS[target];
	return Math.round(ctx.density * t.footprintKm2 * CIVILIAN_CONCENTRATION[ctx.conditions.cover] + (t.occupants ?? 0));
}

/** Share of the exposed civilians expected to be harmed, given the strike gets through. */
export function harmShare(weapon: StrikeWeapon, accuracy: number): number {
	return WEAPONS[weapon].blast * (accuracy * HIT_SPILL + (1 - accuracy));
}

export interface StrikePlan {
	tier: StrikeTier;
	target: StrikeTarget;
	weapon: StrikeWeapon;
	interceptChance: number;
	/** Chance to hit once it gets through. */
	accuracy: number;
	accuracyFactors: Factor[];
	/** Chance of a direct hit overall (gets through and hits). */
	hitChance: number;
	targetingConfidence: number;
	exposed: number;
	expectedCasualties: number;
	risk: RiskLevel;
	militaryValue: number;
	ihl: IhlFinding[];
}

/** Everything the commander sees before confirming a strike. */
export function planStrike(target: StrikeTarget, weapon: StrikeWeapon, ctx: StrikeContext): StrikePlan {
	const interceptChance = strikeInterceptChance(weapon, ctx.adUnits);
	const acc = strikeAccuracy(target, weapon, ctx);
	const exposed = exposedCivilians(target, ctx);
	const expected = exposed * harmShare(weapon, acc.value) * (1 - interceptChance);
	const militaryValue = targetMilitaryValue(target, ctx.enemyUnits);
	const r2 = (n: number) => Math.round(n * 100) / 100;
	return {
		tier: TARGETS[target].tier,
		target,
		weapon,
		interceptChance: r2(interceptChance),
		accuracy: r2(acc.value),
		accuracyFactors: acc.factors,
		hitChance: r2((1 - interceptChance) * acc.value),
		targetingConfidence: r2(targetingConfidence(target, ctx).value),
		exposed,
		expectedCasualties: Math.round(expected),
		risk: riskLevel(expected),
		militaryValue,
		ihl: assessIhl({
			target,
			weapon,
			cover: ctx.conditions.cover,
			exposed,
			accuracy: acc.value,
			expectedCasualties: expected,
			militaryValue
		})
	};
}

export type StrikeOutcome = "hit" | "partial" | "miss" | "intercepted";

export interface StrikeRoll {
	outcome: StrikeOutcome;
	/** 1 on a hit, PARTIAL_DAMAGE on a partial hit, 0 otherwise. */
	damageScale: number;
	/** Random spread on damage, 0.8-1.2. */
	damageSpread: number;
	civilianCasualties: number;
}

/**
 * Roll a planned strike (the plan must be built from the true air defence and
 * the side's intel). Draws exactly four numbers from `rng`, in order:
 * intercept, accuracy, damage spread, casualty spread.
 */
export function rollStrike(plan: StrikePlan, rng: () => number): StrikeRoll {
	const [r1, r2, r3, r4] = [rng(), rng(), rng(), rng()];
	const damageSpread = 0.8 + 0.4 * r3;
	if (r1 < plan.interceptChance) return { outcome: "intercepted", damageScale: 0, damageSpread, civilianCasualties: 0 };
	let outcome: StrikeOutcome;
	if (r2 < plan.accuracy) outcome = "hit";
	else if (r2 < plan.accuracy + (1 - plan.accuracy) * PARTIAL_SHARE) outcome = "partial";
	else outcome = "miss";
	const blast = WEAPONS[plan.weapon].blast;
	// On target only the spill reaches civilians; off target the whole blast does.
	const share = outcome === "hit" ? blast * HIT_SPILL : blast;
	return {
		outcome,
		damageScale: outcome === "hit" ? 1 : outcome === "partial" ? PARTIAL_DAMAGE : 0,
		damageSpread,
		civilianCasualties: Math.round(plan.exposed * share * (0.6 + 0.8 * r4))
	};
}

/** Region levels a strike knocks down. */
export function levelsDestroyed(target: StrikeTarget, weapon: StrikeWeapon, roll: Pick<StrikeRoll, "outcome">): number {
	const t = TARGETS[target];
	if (!t.stat || !t.levelsOnHit || roll.outcome !== "hit") return 0;
	return Math.max(1, Math.round(t.levelsOnHit * WEAPONS[weapon].power));
}

/** Strength of the effect a strike leaves (0 when none). */
export function effectMagnitude(target: StrikeTarget, weapon: StrikeWeapon, damageScale: number): number {
	const e = TARGETS[target].effect;
	if (!e || !damageScale) return 0;
	return Math.round(e.magnitude * Math.min(1.5, WEAPONS[weapon].power) * damageScale * 100) / 100;
}

/** Strength points the strike takes off enemy units. */
export function unitDamage(weapon: StrikeWeapon, roll: Pick<StrikeRoll, "damageScale" | "damageSpread">): number {
	return Math.round(WEAPONS[weapon].unitDamage * roll.damageScale * roll.damageSpread);
}

// ── Effects ─────────────────────────────────────────────────────────────────

/** Most an effect kind can take off, however many strikes stack. */
export const EFFECT_CAP: Record<StrikeEffectKind, number> = { supply: 0.5, energy: 0.6, industry: 0.7 };

export const EFFECT_LABEL: Record<StrikeEffectKind, string> = {
	supply: "Supply disrupted",
	energy: "Grid damaged",
	industry: "Industry disrupted"
};

/** Combined penalty (0-cap) of a set of active effects of one kind. */
export function stackedPenalty(kind: StrikeEffectKind, magnitudes: number[]): number {
	return Math.min(
		EFFECT_CAP[kind],
		magnitudes.reduce((s, m) => s + Math.max(0, m), 0)
	);
}

// ── IHL assessment ──────────────────────────────────────────────────────────

export type IhlKind = "protected_target" | "indiscriminate" | "disproportionate";

export const IHL_KIND_LABEL: Record<IhlKind, string> = {
	protected_target: "Attack on a protected object",
	indiscriminate: "Indiscriminate attack",
	disproportionate: "Disproportionate attack"
};

export interface IhlFinding {
	kind: IhlKind;
	/** 1 minor, 2 serious, 3 grave. */
	severity: 1 | 2 | 3;
	/** Standing points before casualties (ihl.config.ts adds casualty points). */
	points: number;
	reason: string;
}

/** Points per finding. */
export const IHL_POINTS = {
	protected_target: 40,
	indiscriminate: 20,
	disproportionate: 10,
	/** Disproportionate by more than this factor counts as serious (double points). */
	grossFactor: 3
} as const;
/** Unguided weapons count as indiscriminate in urban cover or where this many civilians are exposed. */
export const INDISCRIMINATE_EXPOSED = 2000;
/** A strike this blind into this many expected casualties is indiscriminate whatever the weapon. */
export const INDISCRIMINATE_ACCURACY = 0.3;
export const INDISCRIMINATE_CASUALTIES = 25;

/**
 * Judge a strike on what the commander knew when ordering it: the target, the
 * weapon, how many civilians were exposed and the expected harm against the
 * military value.
 */
export function assessIhl(input: {
	target: StrikeTarget;
	weapon: StrikeWeapon;
	cover: Cover;
	exposed: number;
	accuracy: number;
	expectedCasualties: number;
	militaryValue: number;
}): IhlFinding[] {
	const out: IhlFinding[] = [];
	if (TARGETS[input.target].protected) {
		out.push({
			kind: "protected_target",
			severity: 3,
			points: IHL_POINTS.protected_target,
			reason: `${TARGETS[input.target].label}s are protected objects.`
		});
	}
	const unguidedInCity =
		WEAPONS[input.weapon].guidance === "none" && (input.cover === "urban" || input.exposed >= INDISCRIMINATE_EXPOSED);
	const blind = input.accuracy < INDISCRIMINATE_ACCURACY && input.expectedCasualties >= INDISCRIMINATE_CASUALTIES;
	if (unguidedInCity || blind) {
		out.push({
			kind: "indiscriminate",
			severity: 2,
			points: IHL_POINTS.indiscriminate,
			reason: unguidedInCity
				? "Unguided bombs in a populated area can't be aimed at a military objective."
				: `Only ${Math.round(input.accuracy * 100)}% accurate with civilians all around.`
		});
	}
	if (!TARGETS[input.target].protected && input.expectedCasualties > input.militaryValue) {
		const gross = input.expectedCasualties > input.militaryValue * IHL_POINTS.grossFactor;
		out.push({
			kind: "disproportionate",
			severity: gross ? 2 : 1,
			points: gross ? IHL_POINTS.disproportionate * 2 : IHL_POINTS.disproportionate,
			reason: `Expected harm (${Math.round(input.expectedCasualties)}) exceeds the military advantage (${input.militaryValue}).`
		});
	}
	return out;
}
