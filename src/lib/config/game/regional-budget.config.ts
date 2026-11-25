// src/lib/config/game/regional-budget.config.ts
// Regional budgets: a state hands part of the tax raised in each region to
// that region's own budget, and the governor spends it on public works or
// short programmes that lift local opinion. Pure: no database here.

/** Bounds and default for the regional share of local tax, in percent. */
export const REGIONAL_SHARE = {
	MIN: 0,
	MAX: 50,
	DEFAULT: 20
} as const;

/** Keep a share inside the allowed bounds; garbage becomes the default. */
export function clampRegionalShare(share: number): number {
	if (!Number.isFinite(share)) return REGIONAL_SHARE.DEFAULT;
	return Math.min(REGIONAL_SHARE.MAX, Math.max(REGIONAL_SHARE.MIN, Math.round(share)));
}

/** The share that applies to a region: its override if set, otherwise the state's. */
export function effectiveRegionalShare(stateShare: number | null | undefined, override: number | null | undefined) {
	return clampRegionalShare(override ?? stateShare ?? REGIONAL_SHARE.DEFAULT);
}

/**
 * Split collected tax between the region and the state treasury. The region's
 * part rounds down so the state never receives less than its stated share and
 * the two parts always add up to the whole.
 */
export function splitTax(taxAmount: number, sharePercent: number): { regional: number; state: number } {
	const total = Number.isFinite(taxAmount) && taxAmount > 0 ? Math.floor(taxAmount) : 0;
	const regional = Math.floor((total * clampRegionalShare(sharePercent)) / 100);
	return { regional, state: total - regional };
}

export type RegionalProgrammeKind = "festival" | "relief" | "cleanup";

export interface RegionalProgramme {
	kind: RegionalProgrammeKind;
	name: string;
	icon: string;
	description: string;
	/** Paid from the regional budget up front. */
	cost: number;
	/** Opinion points while it runs. */
	opinion: number;
	/** How long it runs. */
	days: number;
}

export const REGIONAL_PROGRAMMES: Record<RegionalProgrammeKind, RegionalProgramme> = {
	festival: {
		kind: "festival",
		name: "Town festival",
		icon: "🎉",
		description: "Music, food stalls and a speech from the governor. Cheap, cheerful, quickly forgotten.",
		cost: 15_000,
		opinion: 3,
		days: 3
	},
	cleanup: {
		kind: "cleanup",
		name: "Street clean-up",
		icon: "🧹",
		description: "Potholes filled, parks tidied, graffiti gone. People notice for a week or two.",
		cost: 40_000,
		opinion: 4,
		days: 10
	},
	relief: {
		kind: "relief",
		name: "Hardship relief",
		icon: "🍞",
		description: "Food vouchers and heating subsidies for struggling households.",
		cost: 90_000,
		opinion: 7,
		days: 7
	}
};

export const REGIONAL_PROGRAMME_KINDS = Object.keys(REGIONAL_PROGRAMMES) as RegionalProgrammeKind[];

export function isRegionalProgrammeKind(kind: string): kind is RegionalProgrammeKind {
	return kind in REGIONAL_PROGRAMMES;
}

/** Most opinion all running programmes in one region can add together. */
export const MAX_PROGRAMME_OPINION = 10;

/** Opinion from the programmes running now, capped. */
export function programmeOpinion(running: readonly { opinion: number }[]): number {
	return Math.min(
		MAX_PROGRAMME_OPINION,
		running.reduce((sum, p) => sum + Math.max(0, p.opinion), 0)
	);
}

/**
 * Whether the governor may start a programme now. Pure; the caller supplies
 * the balance and which kinds are already running.
 */
export function checkProgramme(input: {
	kind: string;
	balance: number;
	running: readonly string[];
	isGovernor: boolean;
}): { ok: boolean; problems: string[] } {
	const problems: string[] = [];
	if (!input.isGovernor) problems.push("Only the region's governor can spend its budget.");
	if (!isRegionalProgrammeKind(input.kind)) {
		problems.push("Unknown programme.");
		return { ok: false, problems };
	}
	const programme = REGIONAL_PROGRAMMES[input.kind];
	if (input.running.includes(input.kind)) problems.push(`A ${programme.name.toLowerCase()} is already running here.`);
	const balance = Number.isFinite(input.balance) ? Math.max(0, Math.floor(input.balance)) : 0;
	if (balance < programme.cost) {
		problems.push(`The regional budget is $${(programme.cost - balance).toLocaleString()} short.`);
	}
	return { ok: problems.length === 0, problems };
}
