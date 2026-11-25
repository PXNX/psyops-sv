// The people behind the covers: generated names, deterministic faces and a
// small pool of bonus traits. Most assets have no trait at all; two is rare.
// On top of that, about one recruit in twenty carries a rare trait.
export type SpyTraitId =
	| "sleeper"
	| "cabinet_confidant"
	| "ideologue"
	| "chameleon"
	| "lucky_streak"
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
	/** Rare traits are rolled separately and shown in gold. */
	rare?: boolean;
	/** Multiplier on how fast the asset sheds heat while idle. */
	decay?: number;
	/** Multiplier on an enemy's chance to turn this asset. */
	flip?: number;
}

export const SPY_TRAITS: Record<SpyTraitId, SpyTrait> = {
	sleeper: {
		id: "sleeper",
		label: "Sleeper",
		description: "Rare. Goes quiet between jobs: sheds heat 50% faster while idle.",
		weight: 1,
		access: 0,
		success: 0,
		heat: 1,
		rare: true,
		decay: 1.5
	},
	cabinet_confidant: {
		id: "cabinet_confidant",
		label: "Cabinet confidant",
		description: "Rare. Dines with ministers: +1 effective access and +3% chance.",
		weight: 1,
		access: 1,
		success: 0.03,
		heat: 1,
		rare: true
	},
	ideologue: {
		id: "ideologue",
		label: "True believer",
		description: "Rare. Cannot be turned by enemy counter-intelligence, and works with +3% chance.",
		weight: 1,
		access: 0,
		success: 0.03,
		heat: 1,
		rare: true,
		flip: 0
	},
	chameleon: {
		id: "chameleon",
		label: "Chameleon",
		description: "Rare. Blends in anywhere: 25% less heat and +2% chance.",
		weight: 1,
		access: 0,
		success: 0.02,
		heat: 0.75,
		rare: true
	},
	lucky_streak: {
		id: "lucky_streak",
		label: "Charmed life",
		description: "Rare. Things just work out: +10% chance on every action.",
		weight: 1,
		access: 0,
		success: 0.1,
		heat: 1,
		rare: true
	},
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
export const RARE_SPY_TRAIT_IDS = SPY_TRAIT_IDS.filter((id) => SPY_TRAITS[id].rare);
const COMMON_SPY_TRAIT_IDS = SPY_TRAIT_IDS.filter((id) => !SPY_TRAITS[id].rare);

/** Chance that a fresh recruit also carries one rare trait. */
export const RARE_SPY_TRAIT_CHANCE = 0.05;

const FIRST_NAMES = [
	"Anja",
	"Boris",
	"Celia",
	"Dmitri",
	"Elena",
	"Farid",
	"Greta",
	"Hugo",
	"Ines",
	"Jonas",
	"Katarina",
	"Lars",
	"Mira",
	"Niko",
	"Orla",
	"Pavel",
	"Quentin",
	"Rosa",
	"Soren",
	"Talia",
	"Ulrich",
	"Vera",
	"Willem",
	"Yara",
	"Zoltan",
	"Alina",
	"Bram",
	"Cora",
	"Elise",
	"Freya",
	"Goran",
	"Helena",
	"Ivo",
	"Jana",
	"Kiril",
	"Leonie",
	"Mateo",
	"Nadia",
	"Otto",
	"Petra",
	"Radim",
	"Sabine",
	"Tomas",
	"Ulla",
	"Viktor",
	"Wren",
	"Xenia",
	"Yusuf",
	"Zara",
	"Antonia",
	"Casimir",
	"Daria",
	"Emil",
	"Fiona",
	"Gustav",
	"Hana",
	"Ilya",
	"Julia",
	"Klemens",
	"Lena",
	"Marin",
	"Nora",
	"Oskar",
	"Paloma",
	"Rafael",
	"Silje",
	"Teodor",
	"Valentina",
	"Waldemar",
	"Aiko",
	"Amara",
	"Anselm",
	"Aurelio",
	"Beatrix",
	"Bogdan",
	"Camille",
	"Chiara",
	"Cyrus",
	"Dagny",
	"Desmond",
	"Dorota",
	"Eamon",
	"Esther",
	"Ezra",
	"Fatima",
	"Florin",
	"Gideon",
	"Giulia",
	"Hakon",
	"Hedda",
	"Idris",
	"Ingrid",
	"Isak",
	"Jasmin",
	"Jovan",
	"Kasia",
	"Kenji",
	"Laila",
	"Leif",
	"Lucian",
	"Magda",
	"Malik",
	"Margit",
	"Milan",
	"Nastya",
	"Nils",
	"Noemi",
	"Odile",
	"Omar",
	"Ottilie",
	"Priya",
	"Rasmus",
	"Regina",
	"Rurik",
	"Saskia",
	"Selim",
	"Signe",
	"Stellan",
	"Tamsin",
	"Tariq",
	"Thea",
	"Tobias",
	"Una",
	"Vadim",
	"Vesna",
	"Wilhelmina",
	"Yannick",
	"Zdenka",
	"Zeno"
];
const LAST_NAMES = [
	"Adler",
	"Bauer",
	"Castellan",
	"Dahl",
	"Eberhardt",
	"Ferrand",
	"Gatto",
	"Hoffmann",
	"Ivanov",
	"Jansen",
	"Kovacs",
	"Lindqvist",
	"Moreau",
	"Navarro",
	"Ostrowski",
	"Petrov",
	"Quintana",
	"Reinhardt",
	"Sato",
	"Thornton",
	"Ueda",
	"Voss",
	"Weber",
	"Xiang",
	"Zeller",
	"Ahlgren",
	"Beaumont",
	"Czerny",
	"Delacroix",
	"Eriksen",
	"Falk",
	"Grimaldi",
	"Havel",
	"Ibarra",
	"Jorgensen",
	"Kaminska",
	"Lombardi",
	"Marchetti",
	"Novak",
	"Okafor",
	"Pallesen",
	"Rasmussen",
	"Salazar",
	"Takahashi",
	"Uhlig",
	"Varga",
	"Wojcik",
	"Yamamoto",
	"Zimmermann",
	"Bergstrom",
	"Cardoso",
	"Dumont",
	"Engel",
	"Forsberg",
	"Glowacki",
	"Hartmann",
	"Ionescu",
	"Jankowski",
	"Keller",
	"Lindberg",
	"Meyer",
	"Nyman",
	"Ortega",
	"Pappas",
	"Rossi",
	"Sandberg",
	"Abernathy",
	"Aksoy",
	"Albescu",
	"Arslan",
	"Babic",
	"Barros",
	"Bianchi",
	"Brennan",
	"Chaudhry",
	"Costa",
	"Dimitrov",
	"Dvorak",
	"Esposito",
	"Fischer",
	"Fontaine",
	"Gallagher",
	"Haddad",
	"Halloran",
	"Horvath",
	"Ishikawa",
	"Jovanovic",
	"Kowalczyk",
	"Kuznetsova",
	"Laurent",
	"Lehtinen",
	"Mancini",
	"Mendes",
	"Mikkelsen",
	"Nakamura",
	"Nieminen",
	"O'Rourke",
	"Popescu",
	"Quiroga",
	"Renaud",
	"Sokolov",
	"Stavros",
	"Szabo",
	"Toivonen",
	"Valdez",
	"Vasquez",
	"Vlahos",
	"Wallin",
	"Winter",
	"Yilmaz",
	"Zielinski",
	"von Arnim",
	"de Vries",
	"van Dijk",
	"al-Rashid",
	"MacLeod",
	"Okonkwo"
];
/** A minority go by a middle initial or a nickname in quotes. */
const NICKNAMES = [
	"Doc",
	"Sparrow",
	"Tiny",
	"Professor",
	"Red",
	"Smiler",
	"Kid",
	"Duchess",
	"Fox",
	"Bookworm",
	"Padre",
	"Lefty",
	"Magpie",
	"Saint",
	"Mouse",
	"Captain",
	"Sunny",
	"Chess",
	"Nightingale",
	"Ox"
];
const INITIALS = "ABCDEFGHJKLMNOPRSTVW";

/** Deterministic name for an asset: the same index always yields the same person. */
export function spyName(seed: number): string {
	const n = Math.abs(Math.floor(seed));
	const first = FIRST_NAMES[(n * 7 + 3) % FIRST_NAMES.length]!;
	const last = LAST_NAMES[(n * 11 + 5) % LAST_NAMES.length]!;
	const flavour = (n >>> 9) % 20;
	if (flavour < 3) return `${first} ${INITIALS[(n >>> 13) % INITIALS.length]}. ${last}`;
	if (flavour < 5) return `${first} “${NICKNAMES[(n >>> 14) % NICKNAMES.length]}” ${last}`;
	return `${first} ${last}`;
}

/** Number of portraits in the generated face pool; each feature is drawn from its own bits. */
export const SPY_PORTRAIT_COUNT = 1 << 20;
export function spyPortrait(seed: number): number {
	return Math.abs(Math.floor(seed * 13 + Math.floor(seed / 7) * 29 + 7)) % SPY_PORTRAIT_COUNT;
}

/**
 * Most assets are ordinary people: 62% have no bonus trait, 28% have one and
 * only 10% have two. Individual traits are drawn by rarity weight. Separately,
 * one recruit in twenty also carries a rare trait.
 */
export function rollSpyTraits(rng: () => number = Math.random): SpyTraitId[] {
	const roll = rng();
	const count = roll < 0.62 ? 0 : roll < 0.9 ? 1 : 2;
	const out = drawWeighted(COMMON_SPY_TRAIT_IDS, count, rng);
	if (rng() < RARE_SPY_TRAIT_CHANCE) out.push(...drawWeighted(RARE_SPY_TRAIT_IDS, 1, rng));
	return out;
}

function drawWeighted(ids: readonly SpyTraitId[], count: number, rng: () => number): SpyTraitId[] {
	const pool = new Map(ids.map((id) => [id, SPY_TRAITS[id].weight]));
	const out: SpyTraitId[] = [];
	for (let i = 0; i < count && pool.size; i++) {
		const total = [...pool.values()].reduce((sum, w) => sum + w, 0);
		let pick = rng() * total;
		let chosen: SpyTraitId | null = null;
		for (const [id, weight] of pool) {
			pick -= weight;
			if (pick <= 0) {
				chosen = id;
				break;
			}
		}
		chosen ??= [...pool.keys()][0]!;
		pool.delete(chosen);
		out.push(chosen);
	}
	return out;
}

/** Aggregate mechanical effects of a person's traits. */
export function spyTraitModifiers(traitIds: string[]) {
	const out = { access: 0, success: 0, heat: 1, decay: 1, flip: 1 };
	for (const id of traitIds) {
		const trait = SPY_TRAITS[id as SpyTraitId];
		if (!trait) continue;
		out.access += trait.access;
		out.success += trait.success;
		out.heat *= trait.heat;
		out.decay *= trait.decay ?? 1;
		out.flip *= trait.flip ?? 1;
	}
	return out;
}
