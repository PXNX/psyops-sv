// Natural resource deposits and how hard states exploit them.
//
// Every region holds deposits of the mineable resources. A mine's output per
// shift depends on three things:
//   1. its base production rate (factories.production_rate),
//   2. the state's exploitation law (more output now, deposits drain faster),
//   3. how much of the deposit is left (rich seams yield fully, nearly
//      exhausted ones only a fraction, empty ones nothing).

export const MINEABLE_RESOURCES = [
	"iron",
	"copper",
	"coal",
	"wood",
	// Strategic resources: rarer, region-specific, and the input to the
	// energy and chip chains (see energy.config.ts and industry.config.ts).
	"oil",
	"gas",
	"uranium",
	"rare_earth",
	"silicon"
] as const;
export type MineableResource = (typeof MINEABLE_RESOURCES)[number];

/** Display names for every extractable resource. */
export const RESOURCE_LABELS: Record<MineableResource, string> = {
	iron: "Iron ore",
	copper: "Copper",
	coal: "Coal",
	wood: "Timber",
	oil: "Crude oil",
	gas: "Natural gas",
	uranium: "Uranium",
	rare_earth: "Rare earths",
	silicon: "Silicon"
};

/** Resources the world fights over: they feed chips, satellites and power. */
export const STRATEGIC_RESOURCES: MineableResource[] = ["oil", "gas", "uranium", "rare_earth", "silicon"];

/** How much one unit is worth on the world market (rough, for planning). */
export const RESOURCE_VALUE: Record<MineableResource, number> = {
	iron: 20,
	copper: 30,
	coal: 15,
	wood: 10,
	oil: 45,
	gas: 40,
	uranium: 120,
	rare_earth: 90,
	silicon: 60
};

export const EXPLOITATION_POLICIES = {
	conservation: {
		label: "Conservation",
		description: "Careful extraction: lower output, but deposits last much longer.",
		outputMultiplier: 0.7,
		depletionMultiplier: 0.8
	},
	standard: {
		label: "Standard",
		description: "Balanced extraction.",
		outputMultiplier: 1,
		depletionMultiplier: 1
	},
	industrial: {
		label: "Industrial",
		description: "Heavy machinery: more output, deposits drain faster.",
		outputMultiplier: 1.35,
		depletionMultiplier: 1.3
	},
	unrestricted: {
		label: "Unrestricted",
		description: "Strip everything now: highest output, deposits are exhausted quickly.",
		outputMultiplier: 1.75,
		depletionMultiplier: 1.8
	}
} as const;

export type ExploitationPolicy = keyof typeof EXPLOITATION_POLICIES;
export const EXPLOITATION_POLICY_KEYS = Object.keys(EXPLOITATION_POLICIES) as ExploitationPolicy[];
export const DEFAULT_EXPLOITATION_POLICY: ExploitationPolicy = "standard";

export const DEPOSIT_CONFIG = {
	/** Share of full output a nearly exhausted deposit still gives (yield = floor + (1 - floor) * richness). */
	MIN_YIELD: 0.25
} as const;

export interface MineYield {
	/** Units the worker receives (before mining tax). */
	produced: number;
	/** Units removed from the deposit. */
	depleted: number;
	/** remaining / capacity before this shift, 0..1. */
	richness: number;
}

/**
 * Output of one mine shift, and how much it takes out of the deposit.
 * Never extracts more than the deposit holds.
 */
export function mineYield(
	baseRate: number,
	policy: ExploitationPolicy,
	capacity: number,
	remaining: number
): MineYield {
	if (capacity <= 0 || remaining <= 0 || baseRate <= 0) return { produced: 0, depleted: 0, richness: 0 };
	const { outputMultiplier, depletionMultiplier } = EXPLOITATION_POLICIES[policy];
	const richness = Math.min(1, remaining / capacity);
	const efficiency = DEPOSIT_CONFIG.MIN_YIELD + (1 - DEPOSIT_CONFIG.MIN_YIELD) * richness;
	let produced = Math.floor(baseRate * outputMultiplier * efficiency);
	// What's left in the ground caps the output.
	produced = Math.min(produced, Math.floor(remaining / depletionMultiplier));
	if (produced <= 0) return { produced: 0, depleted: 0, richness };
	const depleted = Math.min(remaining, Math.ceil(produced * depletionMultiplier));
	return { produced, depleted, richness };
}

/** Shifts left at the current law if output stayed at today's yield (rough, for display). */
export function estimatedShiftsLeft(
	baseRate: number,
	policy: ExploitationPolicy,
	capacity: number,
	remaining: number
): number {
	let left = remaining;
	let shifts = 0;
	// Simulate in steps; deposits are small enough that this is cheap, and it
	// accounts for yield falling as the deposit empties.
	while (left > 0 && shifts < 100_000) {
		const { depleted } = mineYield(baseRate, policy, capacity, left);
		if (depleted <= 0) break;
		left -= depleted;
		shifts++;
	}
	return shifts;
}

/**
 * Human names for every tradeable good. Resource and product keys are DB
 * enums and snake_case, so they must never be shown raw in the UI.
 */
export const GOOD_LABELS: Record<string, string> = {
	// Resources
	iron: "Iron ore",
	copper: "Copper",
	steel: "Steel",
	gunpowder: "Gunpowder",
	wood: "Timber",
	coal: "Coal",
	oil: "Crude oil",
	gas: "Natural gas",
	uranium: "Uranium",
	rare_earth: "Rare earths",
	silicon: "Silicon",
	fuel: "Fuel",
	enriched_uranium: "Enriched uranium",
	// Products
	rifles: "Rifles",
	ammunition: "Ammunition",
	artillery: "Artillery",
	vehicles: "Vehicles",
	explosives: "Explosives",
	chips: "Chips",
	electronics: "Electronics",
	hardware: "Server hardware",
	datacenter: "Datacenter",
	machine_tools: "Machine tools",
	fab_equipment: "Fab equipment",
	// Pseudo-goods used in costs and ledgers
	currency: "Credits",
	money: "Credits",
	credits: "Credits"
};

/** The display name for a good, with a readable fallback for unknown keys. */
export function goodLabel(name: string | null | undefined): string {
	if (!name) return "—";
	return GOOD_LABELS[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
