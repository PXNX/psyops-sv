// Supply autonomy: where a factory's inputs come from, and what dependence
// costs. A plant that can draw on its own state runs at full tilt. One leaning
// on bloc partners or paid trade lanes runs a little worse and is vulnerable
// to a blockade or a closed airspace. A plant whose inputs cannot be sourced
// at all limps along on starvation rations.
//
// Pure data and pure functions only.

export type SourcingTier = "domestic" | "bloc" | "trade" | "shortage";

export interface SourcingSpec {
	label: string;
	icon: string;
	/** Output multiplier while relying on this source. */
	factor: number;
	blurb: string;
}

export const SOURCING: Record<SourcingTier, SourcingSpec> = {
	domestic: {
		label: "Domestic supply",
		icon: "🏠",
		factor: 1,
		blurb: "The state grows, mines or manufactures the input itself. Fully autonomous."
	},
	bloc: {
		label: "Bloc partner",
		icon: "🤝",
		factor: 0.9,
		blurb: "A partner in the bloc has the input. Reliable in peace, vulnerable when the bloc fractures."
	},
	trade: {
		label: "Trade lane",
		icon: "🚢",
		factor: 0.78,
		blurb: "A paid lane brings the input in. Cheap until a blockade or closure throttles the route."
	},
	shortage: {
		label: "Unsourced",
		icon: "⚠️",
		factor: 0.4,
		blurb: "Nobody in the bloc or on the trade lanes can supply it. The line runs at a fraction of output."
	}
};

export const SOURCING_TIERS = Object.keys(SOURCING) as SourcingTier[];

/** Inputs a modern state should be able to source itself. */
export const STRATEGIC_INPUTS = ["steel", "gunpowder", "fuel", "enriched_uranium", "rare_earth", "silicon", "chips", "machine_tools", "electronics"] as const;
export type StrategicInput = (typeof STRATEGIC_INPUTS)[number];

/** Sourcing factor for one input, adjusted by the trade flow available to it. */
export function sourcingFactor(tier: SourcingTier, tradeFlow = 1): number {
	const base = SOURCING[tier].factor;
	const flow = tier === "trade" ? Math.max(0.2, Math.min(1, tradeFlow)) : 1;
	return Math.round(base * flow * 1000) / 1000;
}

/** Combine several inputs' factors: the bottleneck dominates, others matter less. */
export function combinedSourcingFactor(factors: number[]): number {
	if (!factors.length) return 1;
	const sorted = [...factors].sort((a, b) => a - b);
	let sum = 0;
	let weight = 0;
	for (const f of sorted) {
		sum += f;
		weight++;
	}
	return Math.round((sum / weight) * (0.6 + 0.4 * sorted[0]!) * 1000) / 1000;
}

/** Share of strategic inputs a state can source at home (0-1). */
export function autonomyScore(domestic: number, total: number): number {
	if (total <= 0) return 1;
	return Math.round(Math.min(1, domestic / total) * 1000) / 1000;
}

/** Output lost to reliance, for the UI. */
export function dependenceLoss(tier: SourcingTier, tradeFlow = 1): number {
	return Math.round((1 - sourcingFactor(tier, tradeFlow)) * 100);
}
