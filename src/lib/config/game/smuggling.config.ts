// Smuggling: moving goods around the law, and what it is worth.
//
// Sanctions, blockades and shortages create a shadow economy. A state's
// leadership can open a smuggling route to a partner (or a rival) and let
// its citizens run cargo along it: chips, rare earths, fuel, weapons and
// medicine move at a premium because they are hard to get legally.
//
// Every run rolls three things:
//   - interception: customs, coast guard, AI-assisted detection and an enemy
//     blockade all raise it;
//   - seizure: a caught run loses its cargo and pays a fine;
//   - price: what the destination pays depends on how sanctioned or starved
//     it is, and on how much the run risked.
//
// Smuggling is how a blockaded or sanctioned state keeps its chip supply and
// how a poor region gets rich quickly. It is also how an enemy navy earns
// its keep.
//
// Pure data and pure functions only: the client imports this for the route
// planner, the server for resolution (services/economy/smuggling.ts).

export type SmugglingGood = "chips" | "electronics" | "rare_earth" | "fuel" | "uranium" | "rifles" | "explosives";
export type SmugglingGoodType = "resource" | "product";

export interface SmugglingGoodSpec {
	label: string;
	/** Which inventory it lives in. */
	kind: SmugglingGoodType;
	/** Legal market value per unit (rough; the run sells at a multiple). */
	basePrice: number;
	/** How bulky it is: bulk goods need bigger routes and are easier to catch. */
	bulk: number;
	/** Whether customs treat it as contraband even without sanctions. */
	contraband: boolean;
	blurb: string;
}

export const SMUGGLING_GOODS: Record<SmugglingGood, SmugglingGoodSpec> = {
	chips: {
		label: "Chips",
		kind: "product",
		basePrice: 900,
		bulk: 1,
		contraband: true,
		blurb: "The fabrication output every AI programme and guided weapon wants. Sanctions make it worth a fortune."
	},
	electronics: {
		label: "Electronics",
		kind: "product",
		basePrice: 1_500,
		bulk: 1.5,
		contraband: false,
		blurb: "Finished assemblies: radar parts, avionics, secure radios. Legal until someone decides otherwise."
	},
	rare_earth: {
		label: "Rare earths",
		kind: "resource",
		basePrice: 600,
		bulk: 2,
		contraband: false,
		blurb: "Magnets and phosphors for chips, satellites and precision motors."
	},
	fuel: {
		label: "Fuel",
		kind: "resource",
		basePrice: 350,
		bulk: 3,
		contraband: false,
		blurb: "Refined oil. A blockaded state pays a premium for every barrel."
	},
	uranium: {
		label: "Uranium",
		kind: "resource",
		basePrice: 1_200,
		bulk: 1,
		contraband: true,
		blurb: "Reactor and weapons feedstock. Watched by everyone, sold by someone."
	},
	rifles: {
		label: "Rifles",
		kind: "product",
		basePrice: 700,
		bulk: 2,
		contraband: true,
		blurb: "Infantry weapons. A war next door is the best market."
	},
	explosives: {
		label: "Explosives",
		kind: "product",
		basePrice: 1_100,
		bulk: 2.5,
		contraband: true,
		blurb: "Munitions and industrial explosives. Heavy, dangerous, profitable."
	}
};

export const SMUGGLING_GOOD_IDS = Object.keys(SMUGGLING_GOODS) as SmugglingGood[];

export const SMUGGLING = {
	/** Base chance a run is caught with no patrols, sanctions or AI. */
	BASE_INTERCEPT: 0.12,
	/** Added per unit of bulk (a big cargo is easier to spot). */
	BULK_RISK: 0.01,
	/** Added when the destination is under sanctions or blockade. */
	SANCTIONED_RISK: 0.08,
	/** Added per level of the destination's enforcement. */
	ENFORCEMENT_RISK: 0.05,
	/** Subtracted by the destination's AI capability. */
	AI_DETECTION: 0.03,
	/** Cap on interception. */
	MAX_INTERCEPT: 0.9,
	/** A caught run loses the cargo and pays this share of its value as a fine. */
	FINE_SHARE: 0.3,
	/** Premium multiplier when the destination is under sanctions. */
	SANCTION_PREMIUM: 1.6,
	/** Premium when the destination's own supply is short (blockade). */
	BLOCKADE_PREMIUM: 1.35,
	/** Route capacity: units a route can move per day. */
	CAPACITY_PER_DAY: 400,
	/** Hours between runs by the same player on the same route. */
	RUN_COOLDOWN_HOURS: 2,
	/** Route opening cost. */
	ROUTE_COST: 25_000
} as const;

export interface SmuggleRiskInput {
	bulk: number;
	/** Destination is sanctioned by the origin, or the reverse. */
	sanctioned: boolean;
	/** Destination is blockaded. */
	blockaded: boolean;
	/** Destination's enforcement level (0-5). */
	enforcement: number;
	/** Destination's AI level (0-5). */
	aiLevel: number;
	/** Naval sea control the destination can bring to bear. */
	seaControl: number;
}

/** Chance a run is intercepted. */
export function smuggleInterceptChance(input: SmuggleRiskInput): number {
	let chance = SMUGGLING.BASE_INTERCEPT;
	chance += Math.max(0, input.bulk) * SMUGGLING.BULK_RISK;
	if (input.sanctioned) chance += SMUGGLING.SANCTIONED_RISK;
	if (input.blockaded) chance += SMUGGLING.SANCTIONED_RISK;
	chance += Math.max(0, input.enforcement) * SMUGGLING.ENFORCEMENT_RISK;
	chance += Math.max(0, input.seaControl) * 0.008;
	chance -= Math.max(0, input.aiLevel) * SMUGGLING.AI_DETECTION;
	return Math.round(Math.max(0.02, Math.min(SMUGGLING.MAX_INTERCEPT, chance)) * 1000) / 1000;
}

/** Multiplier on the good's base price at the destination. */
export function smugglePremium(sanctioned: boolean, blockaded: boolean): number {
	let premium = 1.25;
	if (sanctioned) premium *= SMUGGLING.SANCTION_PREMIUM;
	if (blockaded) premium *= SMUGGLING.BLOCKADE_PREMIUM;
	return Math.round(premium * 100) / 100;
}

/** What a delivered run pays for `quantity` units of `good`. */
export function smugglePayout(good: SmugglingGood, quantity: number, sanctioned: boolean, blockaded: boolean): number {
	const spec = SMUGGLING_GOODS[good];
	return Math.max(0, Math.floor(spec.basePrice * quantity * smugglePremium(sanctioned, blockaded)));
}

/** The fine for a seized run of `quantity` units of `good`. */
export function smuggleFine(good: SmugglingGood, quantity: number): number {
	return Math.floor(SMUGGLING_GOODS[good].basePrice * quantity * SMUGGLING.FINE_SHARE);
}

/** Largest cargo a route can move in one run. */
export function maxCargo(good: SmugglingGood): number {
	return Math.max(1, Math.floor(SMUGGLING.CAPACITY_PER_DAY / SMUGGLING_GOODS[good].bulk));
}

/** A route's daily throughput in units of a good. */
export function routeThroughput(good: SmugglingGood, risk: number): number {
	return Math.max(0, Math.floor(maxCargo(good) * (1 - risk)));
}
