// Aerial and maritime trade, and the ways to shut it down.
//
// Trade lanes are the legal counterpart of smuggling routes: air corridors and
// sea lanes carrying goods between states. They pay treasury every cycle while
// they stay open. A state can close its own airspace or declare an EEZ closure
// to deny a rival those lanes — and to make its airspace expensive to violate.
// Naval blockades already hit sea lanes; airspace closures hit air corridors.
//
// Pure data and pure functions only; services and the UI import them.

export type TradeKind = "air" | "sea";
export type ClosureKind = "airspace" | "eez";

export interface TradeLaneSpec {
	label: string;
	icon: string;
	blurb: string;
	/** Treasury cost of opening one capacity point. */
	costPerPoint: number;
	/** Treasury earned per capacity point per collection cycle at full flow. */
	revenuePerPoint: number;
	/** Minimum and maximum lane capacity. */
	minCapacity: number;
	maxCapacity: number;
	/** Which closure can deny this lane. */
	closedBy: ClosureKind;
}

export const TRADE_LANES: Record<TradeKind, TradeLaneSpec> = {
	air: {
		label: "Air corridor",
		icon: "✈️",
		blurb: "High-value, fast freight. Cheap to fly, expensive to defend: a closed airspace grounds it completely.",
		costPerPoint: 12_000,
		revenuePerPoint: 4_000,
		minCapacity: 10,
		maxCapacity: 200,
		closedBy: "airspace"
	},
	sea: {
		label: "Sea lane",
		icon: "🚢",
		blurb: "Bulk cargo by ship. Slow but capacious; blockades and EEZ closures throttle it.",
		costPerPoint: 8_000,
		revenuePerPoint: 2_500,
		minCapacity: 20,
		maxCapacity: 500,
		closedBy: "eez"
	}
};

export const TRADE_KINDS = Object.keys(TRADE_LANES) as TradeKind[];

export interface ClosureSpec {
	label: string;
	icon: string;
	blurb: string;
	/** Treasury cost per hour of closure. */
	costPerHour: number;
	/** Hours a closure can last. */
	minHours: number;
	maxHours: number;
	/** Hours before the same state can close this zone again. */
	cooldownHours: number;
	/** Share of the affected lane's flow this closure removes at full strength. */
	flowCut: number;
	/** Added chance an intruding operation is detected/attributed. */
	attribution: number;
}

export const CLOSURES: Record<ClosureKind, ClosureSpec> = {
	airspace: {
		label: "Airspace closure",
		icon: "🚫✈️",
		blurb: "No foreign aircraft may enter. Air corridors stop earning, strikes lose their route and intruders are traced.",
		costPerHour: 9_000,
		minHours: 6,
		maxHours: 168,
		cooldownHours: 24,
		flowCut: 0.95,
		attribution: 0.25
	},
	eez: {
		label: "EEZ closure",
		icon: "🚫⚓",
		blurb: "An exclusive economic zone closed to foreign shipping. Sea-lane revenue dries up, smuggling gets riskier.",
		costPerHour: 6_000,
		minHours: 6,
		maxHours: 168,
		cooldownHours: 24,
		flowCut: 0.8,
		attribution: 0.15
	}
};

export const CLOSURE_KINDS = Object.keys(CLOSURES) as ClosureKind[];

/** Cost of opening a lane of `kind` and `capacity`. */
export function laneCost(kind: TradeKind, capacity: number): number {
	return TRADE_LANES[kind].costPerPoint * Math.max(0, Math.floor(capacity));
}

/** Cost of a closure lasting `hours`. */
export function closureCost(kind: ClosureKind, hours: number): number {
	return CLOSURES[kind].costPerHour * Math.max(0, Math.floor(hours));
}

/** Flow remaining through a lane with the given closure strengths (0-1 each). */
export function tradeFlow(kind: TradeKind, closureStrength: number, blockadeStrength = 0): number {
	const cut = CLOSURES[TRADE_LANES[kind].closedBy].flowCut * Math.max(0, Math.min(1, closureStrength));
	const seaCut = kind === "sea" ? blockadeStrength * 0.6 : 0;
	return Math.round(Math.max(0, Math.min(1, 1 - cut - seaCut)) * 1000) / 1000;
}

/** Treasury a lane earns in one collection cycle. */
export function laneRevenue(kind: TradeKind, capacity: number, flow: number): number {
	return Math.round(TRADE_LANES[kind].revenuePerPoint * Math.max(0, capacity) * Math.max(0, Math.min(1, flow)));
}

/** Combined strength of several closures targeting a state (diminishing). */
export function closureStrength(strengths: number[]): number {
	const sorted = [...strengths].filter((s) => s > 0).sort((a, b) => b - a);
	let total = 0;
	let remaining = 1;
	for (const s of sorted) {
		total += Math.min(1, s) * remaining;
		remaining *= 0.5;
	}
	return Math.round(Math.min(1, total) * 1000) / 1000;
}

/** Whether an intruder gets through a closure (0 = always stopped). */
export function transitChance(closure: number, stealth = 0): number {
	return Math.round(Math.max(0, Math.min(1, 1 - closure + stealth)) * 1000) / 1000;
}

/** Revenue lost to an active closure and blockade, for the UI. */
export function tradeLoss(kind: TradeKind, capacity: number, flow: number): number {
	return laneRevenue(kind, capacity, 1) - laneRevenue(kind, capacity, flow);
}
