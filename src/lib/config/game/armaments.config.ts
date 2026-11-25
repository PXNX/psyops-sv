// src/lib/config/game/armaments.config.ts
// A separate market for military hardware.
//
// - Trade inside the seller's state or bloc clears at once. Selling to a state
//   outside the bloc needs an export licence from the seller's defence
//   minister (or president), and only the licensed state may buy.
// - Sanctions and bloc embargoes between the two states block a deal.
// - Bought hardware ships: it reaches the buyer after a delivery time that
//   grows with the distance between the two states and the shipment's size.
// - A guide price per good follows supply (units on offer) and demand (units
//   traded recently). Offers have to stay inside a band around it.
// - Hardware that went through the market once is second-hand: every sale
//   wears it a little, and worn hardware is worth less.
import { CIVILIAN_WORK } from "./workforce.config";

/** The finished goods that count as armaments. */
export const ARMAMENT_GOODS = ["rifles", "ammunition", "artillery", "vehicles", "explosives"] as const;
export type ArmamentGood = (typeof ARMAMENT_GOODS)[number];

export type ArmamentCategory = "small_arms" | "heavy" | "armour";
export const ARMAMENT_CATEGORIES: { id: ArmamentCategory; label: string }[] = [
	{ id: "small_arms", label: "Small arms" },
	{ id: "heavy", label: "Heavy weapons" },
	{ id: "armour", label: "Armour" }
];

/** Stats on a 0-10 scale, for the market cards. */
export type ArmamentStats = { firepower: number; range: number; mobility: number; logistics: number };
export const ARMAMENT_PROFILE: Record<
	ArmamentGood,
	{ label: string; category: ArmamentCategory; blurb: string; stats: ArmamentStats }
> = {
	rifles: {
		label: "Rifles",
		category: "small_arms",
		blurb: "Service rifles that equip infantry, militia and police units.",
		stats: { firepower: 3, range: 3, mobility: 9, logistics: 8 }
	},
	ammunition: {
		label: "Ammunition",
		category: "small_arms",
		blurb: "Cartridges and shells. Every unit in the field burns through it.",
		stats: { firepower: 2, range: 2, mobility: 8, logistics: 10 }
	},
	artillery: {
		label: "Artillery",
		category: "heavy",
		blurb: "Towed guns and howitzers for long-range fire support.",
		stats: { firepower: 9, range: 9, mobility: 2, logistics: 3 }
	},
	explosives: {
		label: "Explosives",
		category: "heavy",
		blurb: "Demolition charges, mines and warheads.",
		stats: { firepower: 7, range: 1, mobility: 6, logistics: 5 }
	},
	vehicles: {
		label: "Vehicles",
		category: "armour",
		blurb: "Armoured carriers and tanks that give an army its punch and speed.",
		stats: { firepower: 7, range: 5, mobility: 8, logistics: 2 }
	}
};

export type ArmsRoute = "domestic" | "bloc" | "foreign";

export const ARMAMENTS = {
	/** Minimum offer. */
	MIN_QUANTITY: 1,
	/** Maximum units in one offer. */
	MAX_QUANTITY: 100_000,
	/** The office that issues export licences. */
	APPROVING_MINISTRY: "defense" as const,
	/** Levy on a licensed foreign sale, taken from the seller's proceeds and paid into the seller's treasury. */
	EXPORT_TAX_PERCENT: 5,
	/** Condition of factory-fresh hardware. */
	NEW_CONDITION: 100,
	/** Condition points lost each time hardware changes hands. */
	RESALE_WEAR: 12,
	/** Hardware never wears below this. */
	MIN_CONDITION: 30,
	/** Value share left at condition 0 (scales linearly up to 1 at 100). */
	CONDITION_VALUE_FLOOR: 0.4,
	/** Hours of trades counted as demand. */
	DEMAND_WINDOW_HOURS: 168,
	/** How strongly the guide price reacts to the demand/supply ratio. */
	PRICE_ELASTICITY: 0.3,
	GUIDE_MIN_FACTOR: 0.6,
	GUIDE_MAX_FACTOR: 1.8,
	/** Offers must be priced between these multiples of the guide price. */
	PRICE_BAND_LOW: 0.25,
	PRICE_BAND_HIGH: 4,
	/** Base delivery time in hours per route. */
	DELIVERY_HOURS: { domestic: 1, bloc: 4, foreign: 10 } satisfies Record<ArmsRoute, number>
} as const;

export function isArmament(good: string): good is ArmamentGood {
	return (ARMAMENT_GOODS as readonly string[]).includes(good);
}

/** Reference value of one new unit. */
export function armamentValue(good: string): number {
	return CIVILIAN_WORK.GOOD_VALUE[good] ?? CIVILIAN_WORK.DEFAULT_GOOD_VALUE;
}

const clampCondition = (c: number) =>
	Math.max(0, Math.min(ARMAMENTS.NEW_CONDITION, Math.round(Number.isFinite(c) ? c : 0)));

/** Share of a new unit's value that hardware in `condition` is worth. */
export function conditionFactor(condition: number): number {
	const f = ARMAMENTS.CONDITION_VALUE_FLOOR;
	return f + (1 - f) * (clampCondition(condition) / ARMAMENTS.NEW_CONDITION);
}

/** Condition after one more change of hands. */
export function wornCondition(condition: number): number {
	return Math.max(ARMAMENTS.MIN_CONDITION, clampCondition(condition) - ARMAMENTS.RESALE_WEAR);
}

export function conditionGrade(condition: number): "new" | "good" | "worn" | "battered" {
	const c = clampCondition(condition);
	return c >= ARMAMENTS.NEW_CONDITION ? "new" : c >= 75 ? "good" : c >= 50 ? "worn" : "battered";
}

/** Average condition after mixing two batches. */
export function blendCondition(qa: number, ca: number, qb: number, cb: number): number {
	const total = Math.max(0, qa) + Math.max(0, qb);
	if (total <= 0) return ARMAMENTS.NEW_CONDITION;
	return clampCondition((Math.max(0, qa) * ca + Math.max(0, qb) * cb) / total);
}

/**
 * Multiplier on the reference value from recent demand (units traded in the
 * demand window) against supply (units on offer now). Scarce, sought-after
 * hardware gets dearer; a glut drives the guide price down.
 */
export function demandFactor(demand: number, supply: number): number {
	const ratio = (Math.max(0, demand) + 1) / (Math.max(0, supply) + 1);
	const f = Math.pow(ratio, ARMAMENTS.PRICE_ELASTICITY);
	return Math.min(ARMAMENTS.GUIDE_MAX_FACTOR, Math.max(ARMAMENTS.GUIDE_MIN_FACTOR, f));
}

/** Guide price of one unit in `condition`. */
export function guidePrice(good: string, demand: number, supply: number, condition: number = ARMAMENTS.NEW_CONDITION) {
	return Math.max(1, Math.round(armamentValue(good) * demandFactor(demand, supply) * conditionFactor(condition)));
}

/** The prices an offer may ask, around the guide price. */
export function priceBand(guide: number): { min: number; max: number } {
	return {
		min: Math.max(1, Math.floor(guide * ARMAMENTS.PRICE_BAND_LOW)),
		max: Math.max(1, Math.ceil(guide * ARMAMENTS.PRICE_BAND_HIGH))
	};
}

/** How a shipment between two states travels. A missing state counts as foreign. */
export function armsRoute(
	seller: { stateId: number | null; blocId: number | null },
	buyer: { stateId: number | null; blocId: number | null }
): ArmsRoute {
	if (!seller.stateId || !buyer.stateId) return "foreign";
	if (seller.stateId === buyer.stateId) return "domestic";
	if (seller.blocId && seller.blocId === buyer.blocId) return "bloc";
	return "foreign";
}

/** Delivery time: base hours per route plus one hour per tenfold of shipment size. */
export function deliveryHours(route: ArmsRoute, quantity: number): number {
	const size = Math.floor(Math.log10(Math.max(1, Math.floor(quantity))));
	return ARMAMENTS.DELIVERY_HOURS[route] + size;
}

/** Levy share for a route, in percent. Only foreign sales pay it. */
export function levyPercent(route: ArmsRoute): number {
	return route === "foreign" ? ARMAMENTS.EXPORT_TAX_PERCENT : 0;
}
