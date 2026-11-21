// Naval and amphibious warfare: every tunable and the pure maths in one place.
//
// Sea power does four things the land and air domains cannot:
//   - it blockades a coast, strangling trade, energy imports and smuggling;
//   - it bombards a coastal region from offshore;
//   - it lands marines on a hostile coast, opening a front without a land border;
//   - it raids sea lanes, taking cargo and money from a rival's shipping.
//
// Naval units are stationed in a coastal region (a port). A state's sea
// control is the sum of its hulls' control points, modified by AI-assisted
// command and by enemy air power. Amphibious assaults need marines and
// landing ships; the defender's forts and coastal terrain make them costly.
//
// Pure data and pure functions only: the client imports this for the naval
// planner, the server for resolution (services/military/naval.ts).

import { regionTerrain } from "./recon.config";

export type NavalOpKind = "blockade" | "shore_bombardment" | "amphibious_assault" | "sea_lane_raid" | "minelaying";

export interface NavalOpSpec {
	label: string;
	blurb: string;
	/** Treasury cost on launch. */
	cost: number;
	/** Hours the operation's effect lasts (0 = instant). */
	durationHours: number;
	/** Hours before the same state can launch this kind again. */
	cooldownHours: number;
	/** Only against a state you are at war with (or hold a casus belli on). */
	needsWar: boolean;
	/** Needs a coastal region as its target. */
	needsCoast: boolean;
	/** Hull types that can execute it (any of them). */
	requires: ("frigate" | "submarine" | "carrier" | "landing_ship")[];
	/** Marine units that must be available for an amphibious assault. */
	marinesRequired: number;
	/** Landing ships that must be available for an amphibious assault. */
	landingShipsRequired: number;
}

export const NAVAL_OPS: Record<NavalOpKind, NavalOpSpec> = {
	blockade: {
		label: "Blockade",
		blurb:
			"Warships close the approaches: the target's trade, energy imports and smuggling dry up, and its treasury bleeds. Costs fuel and invites air attack.",
		cost: 120_000,
		durationHours: 48,
		cooldownHours: 24,
		needsWar: false,
		needsCoast: false,
		requires: ["frigate", "submarine", "carrier"],
		marinesRequired: 0,
		landingShipsRequired: 0
	},
	shore_bombardment: {
		label: "Shore bombardment",
		blurb:
			"Naval guns and ship-launched missiles hit a coastal region: infrastructure and fortifications suffer, and units near the coast take losses.",
		cost: 90_000,
		durationHours: 6,
		cooldownHours: 6,
		needsWar: true,
		needsCoast: true,
		requires: ["frigate", "carrier"],
		marinesRequired: 0,
		landingShipsRequired: 0
	},
	amphibious_assault: {
		label: "Amphibious assault",
		blurb:
			"Land marines on a hostile coast and open a battle without a land border. Needs marines and landing ships; the defender's forts and the surf cost you.",
		cost: 150_000,
		durationHours: 0,
		cooldownHours: 24,
		needsWar: true,
		needsCoast: true,
		requires: ["landing_ship"],
		marinesRequired: 1,
		landingShipsRequired: 1
	},
	sea_lane_raid: {
		label: "Sea-lane raid",
		blurb:
			"Submarines and frigates hunt the target's merchant shipping: a slice of its treasury and stockpiles is seized, and its trade is disrupted.",
		cost: 60_000,
		durationHours: 12,
		cooldownHours: 12,
		needsWar: false,
		needsCoast: false,
		requires: ["frigate", "submarine"],
		marinesRequired: 0,
		landingShipsRequired: 0
	},
	minelaying: {
		label: "Mine a sea lane",
		blurb:
			"Lay mines off a coast: enemy naval operations there are denied for a day, and any fleet that sails anyway risks damage.",
		cost: 40_000,
		durationHours: 24,
		cooldownHours: 12,
		needsWar: false,
		needsCoast: true,
		requires: ["frigate", "submarine"],
		marinesRequired: 0,
		landingShipsRequired: 0
	}
};

export const NAVAL_OP_KINDS = Object.keys(NAVAL_OPS) as NavalOpKind[];

/** Sea-control points each hull contributes. */
export const SEA_CONTROL_POINTS: Record<string, number> = {
	frigate: 3,
	submarine: 2,
	carrier: 5,
	landing_ship: 1
};

/** A region is coastal when its terrain is shore (derived deterministically). */
export function isCoastal(region: { id: number; terrain?: string | null; infrastructure?: number | null }): boolean {
	return regionTerrain(region) === "shore";
}

/** Sea control a fleet of hulls provides. */
export function seaControlPoints(unitTypes: string[]): number {
	return unitTypes.reduce((sum, t) => sum + (SEA_CONTROL_POINTS[t] ?? 0), 0);
}

/** Sea control as a 0-1 strength against a given enemy air/naval threat. */
export function seaControlStrength(points: number, enemyAirPower = 0, enemySeaPower = 0): number {
	const raw = points / (points + 10);
	const threat = 1 - Math.min(0.6, (enemyAirPower + enemySeaPower) * 0.02);
	return Math.round(Math.max(0, Math.min(1, raw * threat)) * 1000) / 1000;
}

// ── Blockade ────────────────────────────────────────────────────────────────

export const BLOCKADE = {
	/** Share of the target's trade taxes and market fees lost at full strength. */
	TRADE_CUT: 0.45,
	/** Share of its energy capacity lost at full strength (imported fuel). */
	ENERGY_CUT: 0.25,
	/** Extra share of the target's smuggling that is intercepted. */
	SMUGGLING_CUT: 0.5,
	/** Treasury the target loses per hour at full strength (harbour fees, rerouting). */
	COST_PER_HOUR: 4_000,
	/** Share of the blockader's hulls lost or damaged per day at full strength (weather, mines, air attack). */
	HULL_ATTRITION_PER_DAY: 0.03
} as const;

/** How strongly a blockade bites (0-1): the blockader's sea control against the defender's. */
export function blockadeStrength(attackerPoints: number, defenderPoints: number, defenderAirPower = 0): number {
	const contest = attackerPoints / Math.max(1, attackerPoints + defenderPoints);
	const air = 1 - Math.min(0.5, defenderAirPower * 0.03);
	return Math.round(Math.max(0, Math.min(1, contest * air)) * 1000) / 1000;
}

/** Factors a blockade imposes on the target. */
export interface BlockadeEffects {
	tradeFactor: number;
	energyFactor: number;
	smugglingFactor: number;
	costPerHour: number;
}

export function blockadeEffects(strength: number): BlockadeEffects {
	const s = Math.max(0, Math.min(1, strength));
	return {
		tradeFactor: 1 - BLOCKADE.TRADE_CUT * s,
		energyFactor: 1 - BLOCKADE.ENERGY_CUT * s,
		smugglingFactor: 1 + BLOCKADE.SMUGGLING_CUT * s,
		costPerHour: Math.round(BLOCKADE.COST_PER_HOUR * s)
	};
}

// ── Amphibious assault ──────────────────────────────────────────────────────

export const AMPHIBIOUS = {
	/** Attacker output penalty landing against an undefended coast. */
	BASE_PENALTY: 0.15,
	/** Extra penalty per fortification level on the coast. */
	FORT_PENALTY: 0.03,
	/** Max penalty, however fortified the coast. */
	MAX_PENALTY: 0.45,
	/** Marines and landing ships must be at least this healthy to sail. */
	MIN_HEALTH: 50,
	/** A failed assault leaves the marines this much weaker (share of strength). */
	FAILURE_LOSS: 0.2
} as const;

/** Attacker multiplier for an amphibious assault on a coast with `fortLevel` forts. */
export function amphibiousPenalty(fortLevel: number): number {
	const penalty = Math.min(AMPHIBIOUS.MAX_PENALTY, AMPHIBIOUS.BASE_PENALTY + AMPHIBIOUS.FORT_PENALTY * Math.max(0, fortLevel));
	return Math.round((1 - penalty) * 1000) / 1000;
}

/** Whether a force can mount an amphibious assault. */
export function canAmphibiousAssault(input: {
	marines: number;
	landingShips: number;
	marinesHealthy: boolean;
	shipsHealthy: boolean;
}): { ok: boolean; reason?: string } {
	if (input.marines < NAVAL_OPS.amphibious_assault.marinesRequired)
		return { ok: false, reason: "You need at least one marine unit for an amphibious assault." };
	if (input.landingShips < NAVAL_OPS.amphibious_assault.landingShipsRequired)
		return { ok: false, reason: "You need at least one landing ship to put the marines ashore." };
	if (!input.marinesHealthy) return { ok: false, reason: "The marines are too worn down to sail." };
	if (!input.shipsHealthy) return { ok: false, reason: "The landing ships are too damaged to sail." };
	return { ok: true };
}

// ── Shore bombardment ───────────────────────────────────────────────────────

export const BOMBARDMENT = {
	/** Chance a bombardment's shells and missiles find the coast's defences. */
	BASE_HIT: 0.65,
	/** Region levels knocked down on a hit. */
	LEVELS_ON_HIT: 1,
	/** Strength taken off each defending unit on a hit. */
	UNIT_DAMAGE: 18,
	/** Civilians harmed per 1,000 in the region's danger zone on a hit. */
	CIVILIAN_HARM_PER_1000: 4
} as const;

/** Chance a shore bombardment gets through the coast's defences. */
export function bombardmentHitChance(enemySeaPower: number, enemyAirPower: number): number {
	const defence = Math.min(0.5, enemySeaPower * 0.02 + enemyAirPower * 0.01);
	return Math.round(Math.max(0.1, BOMBARDMENT.BASE_HIT - defence) * 1000) / 1000;
}

// ── Sea-lane raid ───────────────────────────────────────────────────────────

export const RAID = {
	/** Share of the target's treasury taken at full strength, capped. */
	TREASURY_SHARE: 0.03,
	TREASURY_MAX: 250_000,
	/** Share of the raider's take kept after fencing the cargo. */
	KEPT: 0.6,
	/** Resources seized from the target's state stockpile at full strength. */
	STOCKPILE_UNITS: 400
} as const;

export function raidHaul(balance: number, strength: number): number {
	const s = Math.max(0, Math.min(1, strength));
	const raw = Math.max(0, balance) * RAID.TREASURY_SHARE * s;
	return Math.max(0, Math.min(RAID.TREASURY_MAX, Math.floor(raw)));
}

// ── Interdiction (navy vs smuggling) ────────────────────────────────────────

export const INTERDICTION = {
	/** Base chance a naval patrol catches a smuggling run, before sea control. */
	BASE: 0.15,
	/** Added per point of sea control. */
	PER_POINT: 0.01,
	/** Cap. */
	MAX: 0.85
} as const;

export function navalInterdictChance(seaControl: number): number {
	return Math.round(Math.min(INTERDICTION.MAX, INTERDICTION.BASE + seaControl * INTERDICTION.PER_POINT) * 1000) / 1000;
}

// ── Success odds ────────────────────────────────────────────────────────────

/**
 * Base success chance of a naval operation, before the roll. Sea control
 * helps; the enemy's air and naval power and (for assaults and bombardments)
 * the coast's forts hurt. Kept in one place so the planner and the server
 * cannot drift apart.
 */
export function navalSuccessChance(
	kind: NavalOpKind,
	ownSeaControl: number,
	enemyAirPower: number,
	enemySeaPower: number,
	enemyForts = 0
): number {
	const control = seaControlStrength(ownSeaControl, enemyAirPower, enemySeaPower);
	let base: number;
	switch (kind) {
		case "blockade":
			base = 0.75;
			break;
		case "shore_bombardment":
			base = 0.8;
			break;
		case "amphibious_assault":
			base = 0.7;
			break;
		case "sea_lane_raid":
			base = 0.7;
			break;
		case "minelaying":
			base = 0.85;
			break;
	}
	const forts = kind === "amphibious_assault" || kind === "shore_bombardment" ? enemyForts * 0.02 : 0;
	return Math.round(Math.max(0.1, Math.min(0.95, base * (0.5 + control) - forts)) * 1000) / 1000;
}

