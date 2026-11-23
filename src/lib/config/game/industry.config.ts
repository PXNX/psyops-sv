// Industry: fabrication, chips and the electronics/computing chain.
//
// The old economy stopped at rifles and vehicles. A modern state also needs
// semiconductors: chips run AI programmes, satellites, guided weapons and
// radar. Chips are made in fabrication plants from silicon, rare earths and
// copper, using a lot of energy; electronics are assembled from chips. The
// last two links are the computing chain: electronics and chips become server
// hardware, and hardware becomes the datacenters that sharpen cyber operations
// and AI. Both are power- and water-hungry, so a state that wants to think has
// to keep the lights on and the cooling towers running.
//
// The chain is deliberately short and legible:
//   silicon + rare earths + copper → chips → electronics
//   electronics + chips → hardware → datacenter
//   oil → fuel (refinery)
//   uranium → enriched uranium (refinery) → nuclear/fusion power
//
// Pure data and pure functions only: factory creation and the production
// page import this; the shift engine uses SHIFT_RECIPES in production.config.
import { ENERGY_CONFIG } from "./energy.config.js";

export type FabProduct = "chips" | "electronics" | "hardware";

export interface FabSpec {
	label: string;
	/** Factory output per shift at full supply. */
	output: number;
	/** Energy the fabrication line draws. */
	energyDraw: number;
	/** Resource inputs per shift (from the owner's stock). */
	inputs: Partial<Record<string, number>>;
	blurb: string;
}

export const FABRICATION: Record<FabProduct, FabSpec> = {
	chips: {
		label: "Chips",
		output: 5,
		energyDraw: 100,
		inputs: { silicon: 8, rare_earth: 3, copper: 2 },
		blurb: "Semiconductor fabrication: the bottleneck for AI, satellites and precision weapons."
	},
	electronics: {
		label: "Electronics",
		output: 3,
		energyDraw: 60,
		inputs: { chips: 5, copper: 3, rare_earth: 1 },
		blurb: "Radar, avionics and secure radios assembled from chips."
	},
	hardware: {
		label: "Server hardware",
		output: 2,
		energyDraw: 180,
		inputs: { electronics: 3, chips: 4, copper: 4, rare_earth: 2 },
		blurb: "Rack-mounted servers, switches and crypto gear. The physical edge that makes cyber operations and AI sharper — and a voracious draw on power and cooling water."
	},
};

export const FAB_PRODUCTS = Object.keys(FABRICATION) as FabProduct[];

/** Is this output from a fabrication line (and so charged the fab's energy draw)? */
export const isFabProduct = (output: string | null | undefined): output is FabProduct =>
	!!output && output in FABRICATION;

/**
 * MW reserved on the state grid when a factory of this output is built.
 * Ordinary lines draw the standard factory share; fabs, and especially the
 * hardware and datacenter chain, reserve much more of the grid for themselves.
 */
export function factoryEnergyRequirement(output: string | null | undefined): number {
	if (!output) return ENERGY_CONFIG.FACTORY_DRAW;
	return isFabProduct(output) ? FABRICATION[output].energyDraw : ENERGY_CONFIG.FACTORY_DRAW;
}

/** Strategic stockpiles a state is expected to hold for its programmes. */
export const STRATEGIC_STOCK = {
	/** Chips a state should keep for one AI level and a satellite launch. */
	chipsPerAiLevel: 120,
	chipsPerSatellite: 80,
	rareEarthPerSatellite: 20,
	fuelPerFleetDay: 40
} as const;

/** How many chips a state's stockpile can support, as a rough readiness score. */
export function chipReadiness(chips: number, rareEarth: number): number {
	const chipScore = Math.min(1, chips / (STRATEGIC_STOCK.chipsPerAiLevel * 3));
	const earthScore = Math.min(1, rareEarth / (STRATEGIC_STOCK.rareEarthPerSatellite * 6));
	return Math.round(((chipScore + earthScore) / 2) * 100) / 100;
}
