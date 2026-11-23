// The people behind the covers: generated names, deterministic faces and a
// small pool of bonus traits. Most assets have no trait at all; two is rare.
export type SpyTraitId =
	| "clean_operator"
	| "well_connected"
	| "night_owl"
	| "photographic"
	| "ghost"
	| "technophile"
	| "linguist"
	| "veteran";

export interface SpyTrait {
	id: SpyTraitId;
	label: string;
	description: string;
	/** Relative chance of being rolled: 5 common, 3 uncommon, 1 rare. */
	weight: number;
	/** Effective access added to the asset's card level. */
	access: number;
	/** Added to every action's success chance. */
	success: number;
	/** Multiplier on the heat an action leaves behind. */
	heat: number;
}

export const SPY_TRAITS: Record<SpyTraitId, SpyTrait> = {
	clean_operator: {
		id: "clean_operator",
		label: "Clean operator",
		description: "Leaves 30% less heat behind.",
		weight: 5,
		access: 0,
		success: 0,
		heat: 0.7
	},
	well_connected: {
		id: "well_connected",
		label: "Well connected",
		description: "Reaches one level higher than the card says.",
		weight: 3,
		access: 1,
		success: 0,
		heat: 1
	},
	night_owl: {
		id: "night_owl",
		label: "Night owl",
		description: "+6% chance on every action.",
		weight: 5,
		access: 0,
		success: 0.06,
		heat: 1
	},
	photographic: {
		id: "photographic",
		label: "Photographic memory",
		description: "+5% chance and 15% less heat on file pulls.",
		weight: 3,
		access: 0,
		success: 0.05,
		heat: 0.85
	},
	ghost: {
		id: "ghost",
		label: "Ghost",
		description: "A natural at staying unseen: 40% less heat.",
		weight: 1,
		access: 0,
		success: 0.02,
		heat: 0.6
	},
	technophile: {
		id: "technophile",
		label: "Technophile",
		description: "+8% chance on every action.",
		weight: 3,
		access: 0,
		success: 0.08,
		heat: 1
	},
	linguist: {
		id: "linguist",
		label: "Linguist",
		description: "+4% chance and a little less heat.",
		weight: 5,
		access: 0,
		success: 0.04,
		heat: 0.9
	},
	veteran: {
		id: "veteran",
		label: "Veteran",
		description: "+1 effective access and +4% chance.",
		weight: 1,
		access: 1,
		success: 0.04,
		heat: 1
	}
};

export const SPY_TRAIT_IDS = Object.keys(SPY_TRAITS) as SpyTraitId[];

const FIRST_NAMES = [
	"Anja", "Boris", "Celia", "Dmitri", "Elena", "Farid", "Greta", "Hugo", "Ines", "Jonas",
	"Katarina", "Lars", "Mira", "Niko", "Orla", "Pavel", "Quentin", "Rosa", "Soren", "Talia",
	"Ulrich", "Vera", "Willem", "Yara", "Zoltan", "Alina", "Bram", "Cora", "Elise", "Freya",
	"Goran", "Helena", "Ivo", "Jana", "Kiril", "Leonie", "Mateo", "Nadia", "Otto", "Petra",
	"Radim", "Sabine", "Tomas", "Ulla", "Viktor", "Wren", "Xenia", "Yusuf", "Zara", "Antonia",
	"Casimir", "Daria", "Emil", "Fiona", "Gustav", "Hana", "Ilya", "Julia", "Klemens", "Lena",
	"Marin", "Nora", "Oskar", "Paloma", "Rafael", "Silje", "Teodor", "Valentina", "Waldemar"
];
const LAST_NAMES = [
	"Adler", "Bauer", "Castellan", "Dahl", "Eberhardt", "Ferrand", "Gatto", "Hoffmann", "Ivanov",
	"Jansen", "Kovacs", "Lindqvist", "Moreau", "Navarro", "Ostrowski", "Petrov", "Quintana",
	"Reinhardt", "Sato", "Thornton", "Ueda", "Voss", "Weber", "Xiang", "Zeller", "Ahlgren",
	"Beaumont", "Czerny", "Delacroix", "Eriksen", "Falk", "Grimaldi", "Havel", "Ibarra",
	"Jorgensen", "Kaminska", "Lombardi", "Marchetti", "Novak", "Okafor", "Pallesen", "Rasmussen",
	"Salazar", "Takahashi", "Uhlig", "Varga", "Wojcik", "Yamamoto", "Zimmermann", "Bergstrom",
	"Cardoso", "Dumont", "Engel", "Forsberg", "Glowacki", "Hartmann", "Ionescu", "Jankowski",
	"Keller", "Lindberg", "Meyer", "Nyman", "Ortega", "Pappas", "Rossi", "Sandberg"
];

/** Deterministic name for an asset: the same index always yields the same person. */
export function spyName(seed: number): string {
	const first = FIRST_NAMES[Math.abs(seed * 7 + 3) % FIRST_NAMES.length]!;
	const last = LAST_NAMES[Math.abs(seed * 11 + 5) % LAST_NAMES.length]!;
	return `${first} ${last}`;
}

/** Number of portraits in the generated face pool. */
export const SPY_PORTRAIT_COUNT = 72;
export function spyPortrait(seed: number): number {
	return Math.abs(seed * 13 + Math.floor(seed / 7) * 29 + 7) % SPY_PORTRAIT_COUNT;
}

/**
 * Most assets are ordinary people: 62% have no bonus trait, 28% have one and
 * only 10% have two. Individual traits are drawn by rarity weight.
 */
export function rollSpyTraits(rng: () => number = Math.random): SpyTraitId[] {
	const roll = rng();
	const count = roll < 0.62 ? 0 : roll < 0.9 ? 1 : 2;
	const pool = new Map(SPY_TRAIT_IDS.map((id) => [id, SPY_TRAITS[id].weight]));
	const out: SpyTraitId[] = [];
	for (let i = 0; i < count && pool.size; i++) {
		const total = [...pool.values()].reduce((sum, w) => sum + w, 0);
		let pick = rng() * total;
		let chosen: SpyTraitId | null = null;
		for (const [id, weight] of pool) {
			pick -= weight;
			if (pick <= 0) { chosen = id; break; }
		}
		if (!chosen) chosen = SPY_TRAIT_IDS[0]!;
		pool.delete(chosen);
		out.push(chosen);
	}
	return out;
}

/** Aggregate mechanical effects of a person's traits. */
export function spyTraitModifiers(traitIds: string[]) {
	const out = { access: 0, success: 0, heat: 1 };
	for (const id of traitIds) {
		const trait = SPY_TRAITS[id as SpyTraitId];
		if (!trait) continue;
		out.access += trait.access;
		out.success += trait.success;
		out.heat *= trait.heat;
	}
	return out;
}
