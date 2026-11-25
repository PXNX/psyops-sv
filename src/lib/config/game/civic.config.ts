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
	/** A concrete effect beyond opinion, where the building has one. */
	sideEffect?: string;
}

export const CIVIC_BUILDINGS: Record<CivicBuildingType, CivicBuilding> = {
	water_works: {
		type: "water_works",
		name: "Water works",
		icon: "💧",
		description: "Clean piped water. The fastest way into a town's good books.",
		cost: 25_000,
		opinion: 6,
		days: 5,
		sideEffect: "Adds 80,000 water capacity to the region's civilian supply."
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
		days: 10,
		sideEffect: "+10% hospital capacity against outbreaks in the region."
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

// ── Tiers ─────────────────────────────────────────────────────────────────
// A finished building can be expanded twice. Each tier multiplies its opinion;
// the upgrade costs a share of the original price and keeps the building (and
// its current goodwill) open while the work goes on. Expanding what you have
// beats spamming new buildings, which the saturation rule below discourages.

export interface CivicTier {
	tier: number;
	label: string;
	/** Opinion multiplier while at this tier. */
	opinionMult: number;
	/** Share of the base cost charged to reach this tier (0 for tier 1). */
	costMult: number;
	/** Share of the base build time needed to reach this tier. */
	daysMult: number;
}

export const CIVIC_TIERS: readonly CivicTier[] = [
	{ tier: 1, label: "Founded", opinionMult: 1, costMult: 1, daysMult: 1 },
	{ tier: 2, label: "Expanded", opinionMult: 1.5, costMult: 0.6, daysMult: 0.5 },
	{ tier: 3, label: "Landmark", opinionMult: 2, costMult: 1, daysMult: 0.75 }
];

export const CIVIC_MAX_TIER = CIVIC_TIERS.length;

export function civicTier(tier: number): CivicTier {
	return CIVIC_TIERS[Math.max(1, Math.min(CIVIC_MAX_TIER, Math.trunc(tier) || 1)) - 1]!;
}

/** Price of raising a building to `toTier` (2 or 3). */
export function civicUpgradeCost(type: CivicBuildingType, toTier: number): number {
	return Math.round(CIVIC_BUILDINGS[type].cost * civicTier(toTier).costMult);
}

/** Days the work to reach `toTier` takes. */
export function civicUpgradeDays(type: CivicBuildingType, toTier: number): number {
	return Math.max(1, Math.round(CIVIC_BUILDINGS[type].days * civicTier(toTier).daysMult));
}

// ── Naming rights ─────────────────────────────────────────────────────────
// A patron can put their chosen name on a finished building's plaque. People
// remember a name, so a dedicated building earns a little extra opinion.

export const CIVIC_DEDICATION = {
	COST: 5_000,
	/** Flat opinion bonus a plaque adds to its building (before saturation). */
	OPINION: 1,
	MIN_LENGTH: 3,
	MAX_LENGTH: 40
} as const;

/** Letters (any script), digits, spaces and plain punctuation. */
const PLAQUE_PATTERN = /^[\p{L}\p{N} .,'’&\-]+$/u;

/** Clean a plaque inscription, or explain why it can't be engraved. */
export function parsePlaque(input: unknown): { ok: true; text: string } | { ok: false; error: string } {
	const text = String(input ?? "")
		.normalize("NFC")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length < CIVIC_DEDICATION.MIN_LENGTH)
		return { ok: false, error: `The plaque needs at least ${CIVIC_DEDICATION.MIN_LENGTH} characters.` };
	if (text.length > CIVIC_DEDICATION.MAX_LENGTH)
		return { ok: false, error: `The plaque fits at most ${CIVIC_DEDICATION.MAX_LENGTH} characters.` };
	if (!PLAQUE_PATTERN.test(text))
		return { ok: false, error: "Only letters, numbers, spaces and simple punctuation fit on a plaque." };
	return { ok: true, text };
}

/** Opinion one building is worth on its own (before regional saturation). */
export function civicBuildingOpinion(type: CivicBuildingType, tier = 1, dedicated = false): number {
	const base = Math.round(CIVIC_BUILDINGS[type].opinion * civicTier(tier).opinionMult);
	return base + (dedicated ? CIVIC_DEDICATION.OPINION : 0);
}

/** Everything a patron has paid into one building so far. */
export function civicInvested(type: CivicBuildingType, tier = 1, dedicated = false): number {
	let total = CIVIC_BUILDINGS[type].cost;
	for (let t = 2; t <= Math.min(CIVIC_MAX_TIER, tier); t++) total += civicUpgradeCost(type, t);
	return total + (dedicated ? CIVIC_DEDICATION.COST : 0);
}

// ── Saturation ────────────────────────────────────────────────────────────
// A town notices its first clinic far more than its fifth. Within one region,
// civic buildings count in the order they opened: the first at full value,
// each later one at DECAY times the one before, never below FLOOR.

export const CIVIC_SATURATION = {
	DECAY: 0.75,
	FLOOR: 0.2
} as const;

/** Effect multiplier for the building that opened `index`-th (0-based) in its region. */
export function civicSaturation(index: number): number {
	return Math.max(CIVIC_SATURATION.FLOOR, CIVIC_SATURATION.DECAY ** Math.max(0, index));
}

/**
 * Effective opinion of each building in one region, given in opening order.
 * Returns per-building values (unrounded) and the rounded regional total.
 */
export function allocateCivicOpinion(values: readonly number[]): { each: number[]; total: number } {
	const each = values.map((v, i) => v * civicSaturation(i));
	return { each, total: Math.round(each.reduce((a, b) => a + b, 0)) };
}

/**
 * What a new building would add to a region that already holds `existing`
 * civic buildings (finished or under way): its own value, the saturation
 * multiplier it will open at, and the effective opinion that leaves.
 */
export function civicNewBuildingEffect(type: CivicBuildingType, existing: number) {
	const value = civicBuildingOpinion(type);
	const multiplier = civicSaturation(existing);
	return { value, multiplier, effective: value * multiplier };
}

// ── Standing ──────────────────────────────────────────────────────────────

export const PATRON_RANKS = [
	{ min: 0, label: "Private citizen" },
	{ min: 5, label: "Donor" },
	{ min: 15, label: "Benefactor" },
	{ min: 30, label: "Patron" },
	{ min: 50, label: "Grand patron" },
	{ min: 80, label: "Pillar of the realm" }
] as const;

/** A patron's title for their total goodwill, and how far to the next one. */
export function patronRank(goodwill: number) {
	let index = 0;
	for (let i = 0; i < PATRON_RANKS.length; i++) if (goodwill >= PATRON_RANKS[i]!.min) index = i;
	const current = PATRON_RANKS[index]!;
	const next = PATRON_RANKS[index + 1] ?? null;
	const progress = next ? Math.max(0, Math.min(1, (goodwill - current.min) / (next.min - current.min))) : 1;
	return { level: index + 1, label: current.label, next: next ? { label: next.label, min: next.min } : null, progress };
}

/** How much a region's existing state buildings matter to civilian mood. */
export const OPINION_FROM_STATE_BUILDINGS = {
	infrastructure: 1,
	education: 2,
	hospitals: 3,
	economy: 1,
	fortifications: -2,
	radar: 0,
	/** Connectivity is what civilians actually notice day to day. */
	connectivity: 2
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
