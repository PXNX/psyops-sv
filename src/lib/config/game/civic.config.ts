// src/lib/config/game/civic.config.ts
// Buildings a wealthy player can fund personally instead of waiting for a
// state. Each one buys civilian goodwill in its region — the oligarch's
// lever over public opinion.

export type CivicBuildingType =
	"water_works" | "housing_block" | "market_hall" | "clinic" | "school_annex" | "power_relay";

export interface CivicBuilding {
	type: CivicBuildingType;
	name: string;
	icon: string;
	description: string;
	/** Cost in the player's own wallet. */
	cost: number;
	/** Points of civilian opinion gained on completion. */
	opinion: number;
	/** Days until the ribbon can be cut. */
	days: number;
}

export const CIVIC_BUILDINGS: Record<CivicBuildingType, CivicBuilding> = {
	water_works: {
		type: "water_works",
		name: "Water works",
		icon: "💧",
		description: "Clean piped water. The fastest way into a town's good books.",
		cost: 25_000,
		opinion: 6,
		days: 5
	},
	housing_block: {
		type: "housing_block",
		name: "Housing block",
		icon: "🏘️",
		description: "Affordable flats for workers displaced by the war.",
		cost: 40_000,
		opinion: 8,
		days: 8
	},
	market_hall: {
		type: "market_hall",
		name: "Market hall",
		icon: "🏬",
		description: "A covered bazaar where local traders can keep their stalls.",
		cost: 30_000,
		opinion: 5,
		days: 6
	},
	clinic: {
		type: "clinic",
		name: "Field clinic",
		icon: "⚕️",
		description: "A free clinic that treats civilians as well as workers.",
		cost: 55_000,
		opinion: 9,
		days: 10
	},
	school_annex: {
		type: "school_annex",
		name: "School annex",
		icon: "📚",
		description: "Extra classrooms, so children are not taught in shifts.",
		cost: 45_000,
		opinion: 7,
		days: 9
	},
	power_relay: {
		type: "power_relay",
		name: "Power relay",
		icon: "🔌",
		description: "Keeps the lights on in a district the grid has forgotten.",
		cost: 60_000,
		opinion: 8,
		days: 12
	}
};

export const CIVIC_BUILDING_TYPES = Object.keys(CIVIC_BUILDINGS) as CivicBuildingType[];

export function isCivicBuildingType(value: unknown): value is CivicBuildingType {
	return typeof value === "string" && Object.hasOwn(CIVIC_BUILDINGS, value);
}

/** How much a region's existing state buildings matter to civilian mood. */
export const OPINION_FROM_STATE_BUILDINGS = {
	infrastructure: 1,
	education: 2,
	hospitals: 3,
	economy: 1,
	fortifications: -2,
	radar: 0
} as const;

export const OPINION_CONFIG = {
	BASE: 50,
	/** Opinion lost per 1,000 civilian casualties suffered in the region. */
	CASUALTY_PENALTY_PER_THOUSAND: 2,
	MAX_CASUALTY_PENALTY: 25
} as const;

// A state's civilians also hold a stance toward *foreign* states. It starts at
// neutral: nobody has done anything yet. Declaring war sours it, strikes on
// civilians sour it further, and a bailout buys goodwill. Stances are kept per
// pair of states (whose civilians -> which foreign state) so a rescue can make
// one population warm to a government another population still distrusts.
export const STANCE_CONFIG = {
	MIN: -100,
	MAX: 100,
	DEFAULT: 0,
	/** Shared bloc membership earns a baseline of goodwill between civilians. */
	BLOC_MEMBER: 10,
	/** A declaration of war turns the defender's civilians against the aggressor. */
	WAR_DECLARATION: -18,
	/** Merely being struck (even with no casualties) sours civilians. */
	STRIKE: -5,
	/** Each thousand casualties a strike inflicts costs this much stance. */
	CASUALTY_PENALTY_PER_THOUSAND: OPINION_CONFIG.CASUALTY_PENALTY_PER_THOUSAND,
	MAX_CASUALTY_PENALTY: OPINION_CONFIG.MAX_CASUALTY_PENALTY,
	/** A bailout buys goodwill with the rescued state's civilians. */
	BAILOUT: 12,
	/** Extra goodwill per 10,000 of aid above the minimum, up to BAILOUT_MAX. */
	BAILOUT_PER_10K: 1,
	BAILOUT_MAX: 30
} as const;

export type StanceLabel = "hostile" | "unfriendly" | "neutral" | "friendly" | "warm";

/** Clamp a stance delta to the range civilians can actually feel. */
export function clampStance(stance: number): number {
	return Math.max(STANCE_CONFIG.MIN, Math.min(STANCE_CONFIG.MAX, Math.round(stance)));
}

/** A short, human label for a stance score. */
export function stanceLabel(stance: number): StanceLabel {
	if (stance <= -50) return "hostile";
	if (stance <= -10) return "unfriendly";
	if (stance >= 50) return "warm";
	if (stance >= 10) return "friendly";
	return "neutral";
}

/** Tailwind tone classes for a stance, shared by the panels that show it. */
export const STANCE_TONE: Record<StanceLabel, string> = {
	hostile: "text-red-300",
	unfriendly: "text-amber-300",
	neutral: "text-fg-muted",
	friendly: "text-friendly-fg",
	warm: "text-positive"
};
