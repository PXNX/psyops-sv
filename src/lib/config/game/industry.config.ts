// Industry: fabrication, chips and the electronics chain.
//
// The old economy stopped at rifles and vehicles. A modern state also needs
// semiconductors: chips run AI programmes, satellites, guided weapons and
// radar. Chips are made in fabrication plants from silicon, rare earths and
// copper, using a lot of energy; electronics are assembled from chips.
//
// The chain is deliberately short and legible:
//   silicon + rare earths + copper → chips → electronics
//   oil → fuel (refinery)
//   uranium → enriched uranium (refinery) → nuclear/fusion power
//
// Pure data and pure functions only: factory creation and the production
// page import this; the shift engine uses SHIFT_RECIPES in production.config.

export type FabProduct = "chips" | "electronics";

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
	}
};

export const FAB_PRODUCTS = Object.keys(FABRICATION) as FabProduct[];

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
