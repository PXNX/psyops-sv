// Fuel allocation: who gets the refined product after the refinery is done.
//
// A barrel of fuel can warm a home, move a fleet or earn hard currency abroad.
// It cannot do all three. Every state sets a policy — the share of its refined
// fuel that goes to civilians, the armed forces and export — and the daily
// energy tick divides the stockpile accordingly. Export fuel actually leaves
// the country and pays into the treasury; the military share becomes a reserve
// naval operations draw on; the civilian share is burned for heat and decays
// as it is used. Blockades make exports pay less, because the buyer knows the
// cargo has to run the gauntlet.
//
// Pure data and pure functions only.

export const ALLOCATION_USES = ["civilian", "military", "export"] as const;
export type AllocationUse = (typeof ALLOCATION_USES)[number];

export interface FuelShares {
	civilian: number;
	military: number;
	export: number;
}

export const DEFAULT_FUEL_SHARES: FuelShares = { civilian: 50, military: 30, export: 20 };

export const ALLOCATION = {
	/** Refined fuel sells for this much per unit on the world market. */
	FUEL_WORLD_PRICE: 5_000,
	/** A blockade knocks this share off the export price. */
	BLOCKADE_EXPORT_PENALTY: 0.4,
	/** Share of the civilian heating pool burned off each day. */
	CIVILIAN_FUEL_DECAY: 0.3,
	/** Military reserve cannot grow beyond this — fuel spoils in storage. */
	MAX_MILITARY_FUEL: 20_000,
	/** Full civilian heating reserve relative to population (per person). */
	CIVILIAN_FUEL_TARGET_PER_CAPITA: 0.0005,
	/** Best heating relief a full civilian fuel reserve gives. */
	MAX_HEAT_RELIEF: 0.4
} as const;

/** Shares must be whole percentages that add up to exactly 100. */
export function validShares(shares: FuelShares): boolean {
	const values = ALLOCATION_USES.map((use) => shares[use]);
	return values.every((v) => Number.isInteger(v) && v >= 0 && v <= 100) && values.reduce((a, b) => a + b, 0) === 100;
}

/** Split a quantity of refined fuel into the three policy pools. */
export function allocateFuel(quantity: number, shares: FuelShares): Record<AllocationUse, number> {
	const total = Math.max(0, Math.floor(quantity));
	const military = Math.floor((total * shares.military) / 100);
	const exportPool = Math.floor((total * shares.export) / 100);
	return {
		civilian: Math.max(0, total - military - exportPool),
		military,
		export: exportPool
	};
}

/** Treasury earned by selling `units` of fuel abroad. */
export function exportRevenue(units: number, blockaded = false): number {
	return Math.max(0, Math.floor(units) * Math.round(ALLOCATION.FUEL_WORLD_PRICE * (blockaded ? 1 - ALLOCATION.BLOCKADE_EXPORT_PENALTY : 1)));
}

/** Fuel a naval operation draws from the military reserve. */
export const NAVAL_FUEL_PER_OP: Record<string, number> = {
	blockade: 60,
	shore_bombardment: 40,
	amphibious_assault: 120,
	sea_lane_raid: 50,
	minelaying: 30
};

/** How much of a state's heat demand its civilian fuel pool can cover (0..1). */
export function fuelHeatRelief(fuelReserve: number, population: number): number {
	const target = Math.max(1, population * ALLOCATION.CIVILIAN_FUEL_TARGET_PER_CAPITA);
	const fraction = Math.min(1, Math.max(0, fuelReserve) / target);
	return Math.round(fraction * ALLOCATION.MAX_HEAT_RELIEF * 1000) / 1000;
}
