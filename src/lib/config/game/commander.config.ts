// src/lib/config/game/commander.config.ts
// Officers are earned through the state academy. Each has 0–3 traits that make
// some capabilities better and others worse; the same trait table feeds sea,
// air and ground modifiers so a commander behaves consistently everywhere.

export type CommanderTraitId =
	| "bold"
	| "cautious"
	| "logistician"
	| "navigator"
	| "scout"
	| "engineer"
	| "inspiring"
	| "reckless"
	| "veteran"
	| "night_owl"
	| "rigid"
	| "careless";

export interface CommanderTrait {
	id: CommanderTraitId;
	label: string;
	description: string;
	attack: number;
	defense: number;
	speed: number;
	intel: number;
}

export interface CommanderModifiers {
	attack: number;
	defense: number;
	speed: number;
	intel: number;
}

export const COMMANDER_TRAITS: Record<CommanderTraitId, CommanderTrait> = {
	bold: { id: "bold", label: "Bold", description: "+12% attack, −6% defence", attack: 0.12, defense: -0.06, speed: 0, intel: 0 },
	cautious: { id: "cautious", label: "Cautious", description: "+12% defence, −6% attack", attack: -0.06, defense: 0.12, speed: 0, intel: 0 },
	logistician: { id: "logistician", label: "Logistician", description: "+8% speed, +5% defence", attack: 0, defense: 0.05, speed: 0.08, intel: 0 },
	navigator: { id: "navigator", label: "Navigator", description: "+15% speed, +5% intel", attack: 0, defense: 0, speed: 0.15, intel: 0.05 },
	scout: { id: "scout", label: "Scout", description: "+20% intel, +3% attack", attack: 0.03, defense: 0, speed: 0, intel: 0.2 },
	engineer: { id: "engineer", label: "Engineer", description: "+8% defence, −10% fuel use", attack: 0, defense: 0.08, speed: 0, intel: 0 },
	inspiring: { id: "inspiring", label: "Inspiring", description: "+8% attack and defence", attack: 0.08, defense: 0.08, speed: 0, intel: 0 },
	reckless: { id: "reckless", label: "Reckless", description: "+18% attack, −12% defence", attack: 0.18, defense: -0.12, speed: 0, intel: 0 },
	veteran: { id: "veteran", label: "Veteran", description: "+6% attack, defence and speed", attack: 0.06, defense: 0.06, speed: 0.04, intel: 0 },
	night_owl: { id: "night_owl", label: "Night owl", description: "+12% intel, +5% attack", attack: 0.05, defense: 0, speed: 0, intel: 0.12 },
	rigid: { id: "rigid", label: "Rigid", description: "+10% defence, −10% speed", attack: 0, defense: 0.1, speed: -0.1, intel: 0 },
	careless: { id: "careless", label: "Careless", description: "−15% intel, −5% defence", attack: 0, defense: -0.05, speed: 0, intel: -0.15 }
};

export const COMMANDER_TRAIT_IDS = Object.keys(COMMANDER_TRAITS) as CommanderTraitId[];

export const COMMANDER_MAX_LEVEL = 10;
/** 100 experience per level, up to level 10. */
export function commanderLevel(experience: number): number {
	return Math.max(0, Math.min(COMMANDER_MAX_LEVEL, Math.floor(Math.max(0, experience) / 100)));
}

/** Multipliers applied by traits, ten small experience levels and wounds. */
export function commanderModifiers(
	traitIds: string[],
	experience = 0,
	health = 100,
	alive = true
): CommanderModifiers {
	const out: CommanderModifiers = { attack: 1, defense: 1, speed: 1, intel: 1 };
	if (!alive) return out;
	for (const id of traitIds) {
		const trait = COMMANDER_TRAITS[id as CommanderTraitId];
		if (!trait) continue;
		out.attack += trait.attack;
		out.defense += trait.defense;
		out.speed += trait.speed;
		out.intel += trait.intel;
	}
	const levelBonus = 1 + commanderLevel(experience) * 0.015;
	const woundPenalty = health <= 0 ? 0 : health < 50 ? 0.85 : 1;
	out.attack = Math.max(0.6, out.attack * levelBonus * woundPenalty);
	out.defense = Math.max(0.6, out.defense * levelBonus * woundPenalty);
	out.speed = Math.max(0.6, out.speed * levelBonus * woundPenalty);
	out.intel = Math.max(0.6, out.intel * levelBonus * woundPenalty);
	return out;
}

/** How many traits a fresh officer gets: 0–3, most get one or two. */
export function rollTraitCount(rng: () => number = Math.random): number {
	const roll = rng();
	if (roll < 0.1) return 0;
	if (roll < 0.45) return 1;
	if (roll < 0.85) return 2;
	return 3;
}

export function rollTraits(rng: () => number = Math.random): CommanderTraitId[] {
	const pool = [...COMMANDER_TRAIT_IDS];
	const out: CommanderTraitId[] = [];
	for (let i = 0; i < rollTraitCount(rng) && pool.length; i++) {
		out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!);
	}
	return out;
}

const FIRST_NAMES = [
	"Alina", "Bram", "Cora", "Dmitri", "Elise", "Farid", "Greta", "Hugo", "Iris", "Jonas",
	"Kira", "Lars", "Mira", "Niko", "Orla", "Pavel", "Quentin", "Rosa", "Soren", "Talia",
	"Ulrich", "Vera", "Willem", "Yara", "Zoltan"
];
const LAST_NAMES = [
	"Adler", "Bauer", "Castellan", "Dahl", "Eberhardt", "Ferrand", "Gatto", "Hoffmann", "Ivanov", "Jansen",
	"Kovacs", "Lindqvist", "Moreau", "Navarro", "Ostrowski", "Petrov", "Quintana", "Reinhardt", "Sato", "Thornton",
	"Ueda", "Voss", "Weber", "Xiang", "Yilmaz", "Zeller"
];

export function rollCommanderName(rng: () => number = Math.random): string {
	return `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]}`;
}

/** Number of distinct generated portrait variants. */
export const COMMANDER_PORTRAIT_COUNT = 8;

export function rollPortrait(rng: () => number = Math.random): number {
	return Math.floor(rng() * COMMANDER_PORTRAIT_COUNT);
}
