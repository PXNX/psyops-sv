// The five domains of the game: air, land, sea, space and cyber.
//
// Every military or political action belongs to one of them. Land, air and
// sea are the fighting domains (units, battles, strikes); space and cyber are
// the support domains (satellites, reconnaissance, networks, influence). A
// state that only fields one domain is brittle: the edge matrix below is what
// makes combined arms worth the money.
//
// Pure data and pure functions only: the client imports this for the domain
// map and unit badges, the server for combat modifiers.

export type Domain = "air" | "land" | "sea" | "space" | "cyber";
export const DOMAIN_ORDER: Domain[] = ["land", "sea", "air", "space", "cyber"];

export interface DomainSpec {
	label: string;
	short: string;
	icon: string;
	/** Whether units of this domain take part in battles. */
	fighting: boolean;
	blurb: string;
	/** What the domain is good at, for the overview page. */
	strengths: string[];
	/** What it cannot do, so the overview page is honest. */
	limits: string[];
}

export const DOMAINS: Record<Domain, DomainSpec> = {
	land: {
		label: "Land",
		short: "LAND",
		icon: "🪖",
		fighting: true,
		blurb: "Infantry, armour, artillery and the logistics that keep them supplied. Land forces hold and take territory.",
		strengths: ["Takes and holds regions", "Digs into terrain and fortifications", "Cheapest way to put boots on the ground"],
		limits: ["Cannot cross water without the navy", "Slow to redeploy", "Exposed to air power and shore bombardment"]
	},
	sea: {
		label: "Sea",
		short: "SEA",
		icon: "⚓",
		fighting: true,
		blurb: "Frigates, submarines, carriers and marines. Sea power blockades, raids shipping and lands troops on a hostile coast.",
		strengths: ["Blockades and sea-lane raids", "Amphibious assault bypasses land borders", "Shore bombardment and naval air power"],
		limits: ["Only projects power onto the coast", "Vulnerable to land-based air and anti-ship missiles", "Expensive to build and keep at sea"]
	},
	air: {
		label: "Air",
		short: "AIR",
		icon: "✈️",
		fighting: true,
		blurb: "Fighters, bombers, drones and air defence. Air power strikes deep, spots for the guns and decides who can move in the open.",
		strengths: ["Deep strikes on industry and infrastructure", "Reconnaissance and targeting", "Interdiction of supply and reinforcements"],
		limits: ["Needs airfields, fuel and munitions", "Blunted by air defence and radar", "Cannot hold ground on its own"]
	},
	space: {
		label: "Space",
		short: "SPACE",
		icon: "🛰️",
		fighting: false,
		blurb: "Reconnaissance, navigation and early-warning satellites. Space is quiet until it is not: blinding a rival's constellation changes every other domain.",
		strengths: ["GPS precision for strikes and navigation", "Wide-area reconnaissance and early warning", "Anti-satellite and uplink attacks"],
		limits: ["No direct combat power", "Launching and replacing satellites is slow", "Constellations are fragile and visible"]
	},
	cyber: {
		label: "Cyber",
		short: "CYBER",
		icon: "🕸️",
		fighting: false,
		blurb: "Network operations and psychological operations. Cyber degrades grids, command links and morale before a shot is fired.",
		strengths: ["Grid, C2 and treasury attacks", "Influence and deception campaigns", "Cheap, deniable pressure in peacetime"],
		limits: ["No territorial control", "Effects expire and can be traced", "Defenders harden and put the attacker on alert"]
	}
};

export const DOMAIN_IDS = Object.keys(DOMAINS) as Domain[];

// ── Units by domain ─────────────────────────────────────────────────────────

export const DOMAIN_UNITS: Record<Domain, string[]> = {
	land: ["infantry", "armor", "mechanized", "artillery", "air_defence", "marine"],
	sea: ["frigate", "submarine", "carrier", "landing_ship"],
	air: ["fighter_squadron", "bomber_squadron"],
	space: [],
	cyber: []
};

/** The domain a unit type fights in (null for an unknown type). */
export function domainOfUnit(unitType: string): Domain | null {
	for (const domain of DOMAIN_IDS) {
		if (DOMAIN_UNITS[domain].includes(unitType)) return domain;
	}
	return null;
}

/** Whether a unit type can take part in a land battle. */
export function fightsOnLand(unitType: string): boolean {
	return domainOfUnit(unitType) === "land" || domainOfUnit(unitType) === "air";
}

/** Whether a unit type floats (and so needs a port or a coast). */
export function isNavalUnit(unitType: string): boolean {
	return domainOfUnit(unitType) === "sea";
}

// ── Combined-arms edge ──────────────────────────────────────────────────────

/**
 * How much better (or worse) an attacker of one domain fights against a
 * defender of another. 1 = no edge. Values are deliberately small: domain
 * choice flavours a battle, it does not decide it.
 *
 *   air vs sea       +12%  ships have nowhere to hide from aircraft
 *   air vs land      -8%   ground forces dig in and mass air defence
 *   sea vs land      +10%  naval gunfire and missiles soften the coast
 *   sea vs air       -10%  a fleet under air attack is in trouble
 *   land vs sea      +6%   coastal defence batteries and anti-ship missiles
 *   land vs air      +4%   MANPADS and short-range air defence
 */
export const DOMAIN_EDGE: Record<"land" | "sea" | "air", Record<"land" | "sea" | "air", number>> = {
	land: { land: 1, sea: 1.06, air: 1.04 },
	sea: { land: 1.1, sea: 1, air: 0.9 },
	air: { land: 0.92, sea: 1.12, air: 1 }
};

/** The edge multiplier for an attacking unit domain against a defending one. */
export function domainEdge(attacker: Domain, defender: Domain): number {
	if (!DOMAINS[attacker].fighting || !DOMAINS[defender].fighting) return 1;
	const a = attacker as "land" | "sea" | "air";
	const d = defender as "land" | "sea" | "air";
	return DOMAIN_EDGE[a][d];
}

/** A side's domain mix: how many units of each fighting domain it fields. */
export type DomainMix = Partial<Record<Domain, number>>;

export function domainMix(unitTypes: string[]): DomainMix {
	const mix: DomainMix = {};
	for (const unitType of unitTypes) {
		const domain = domainOfUnit(unitType);
		if (!domain) continue;
		mix[domain] = (mix[domain] ?? 0) + 1;
	}
	return mix;
}

/** Domains a side fields at least one unit of. */
export function coveredDomains(unitTypes: string[]): Domain[] {
	return DOMAIN_IDS.filter((d) => DOMAINS[d].fighting && (domainMix(unitTypes)[d] ?? 0) > 0);
}

/**
 * Combined-arms bonus: a side that fields all three fighting domains fights
 * up to COMBINED_ARMS_BONUS better. Missing a domain costs nothing directly;
 * the edge matrix and the enemy's choices punish it.
 */
export const COMBINED_ARMS_BONUS = 0.08;

export function combinedArmsBonus(unitTypes: string[]): number {
	const covered = coveredDomains(unitTypes).length;
	return 1 + COMBINED_ARMS_BONUS * Math.max(0, covered - 1);
}

/** A side's overall multiplier for a battle: domain edge against the enemy mix, times combined arms. */
export function sideDomainMultiplier(own: string[], enemy: string[]): number {
	const ownMix = domainMix(own);
	const enemyMix = domainMix(enemy);
	const domains = DOMAIN_IDS.filter((d) => DOMAINS[d].fighting);
	let weightedEdge = 0;
	let total = 0;
	for (const d of domains) {
		const n = ownMix[d] ?? 0;
		if (n <= 0) continue;
		// Average edge of this domain's units against the enemy's mix.
		const enemyTotal = domains.reduce((s, e) => s + (enemyMix[e] ?? 0), 0);
		const edge = enemyTotal
			? domains.reduce((s, e) => s + domainEdge(d, e) * (enemyMix[e] ?? 0), 0) / enemyTotal
			: 1;
		weightedEdge += edge * n;
		total += n;
	}
	const edge = total ? weightedEdge / total : 1;
	return Math.round(edge * combinedArmsBonus(own) * 1000) / 1000;
}

/** One-line readiness verdict for the overview page. */
export function domainReadiness(unitTypes: string[]): { covered: Domain[]; missing: Domain[]; bonus: number } {
	const covered = coveredDomains(unitTypes);
	const missing = (["land", "sea", "air"] as Domain[]).filter((d) => !covered.includes(d));
	return { covered, missing, bonus: combinedArmsBonus(unitTypes) };
}
