// Production recipes for personal (player) manufacturing.
// Shared between the production page and the premium automation service.

export const PRODUCTION_RECIPES = {
	rifles: {
		inputs: { iron: 5, steel: 3, wood: 2 },
		output: 10,
		duration: 60 * 60
	},
	ammunition: {
		inputs: { copper: 3, gunpowder: 2 },
		output: 100,
		duration: 30 * 60
	},
	artillery: {
		inputs: { steel: 10, iron: 8, gunpowder: 5 },
		output: 2,
		duration: 120 * 60
	},
	vehicles: {
		inputs: { steel: 15, iron: 10, copper: 5 },
		output: 1,
		duration: 180 * 60
	},
	explosives: {
		inputs: { gunpowder: 10, steel: 3 },
		output: 20,
		duration: 45 * 60
	}
} as const;

export type ProductionType = keyof typeof PRODUCTION_RECIPES;

/**
 * What one finished worker shift turns out at a factory, and the inputs it
 * takes from the company owner's stock. Mines dig from regional deposits
 * instead (resources.config.ts).
 */
export const SHIFT_RECIPES: Record<string, { inputs: Partial<Record<string, number>>; output: number }> = {
	// Refineries
	steel: { inputs: { iron: 10, coal: 5 }, output: 5 },
	gunpowder: { inputs: { coal: 5, wood: 5 }, output: 5 },
	// Armaments: one production batch per shift
	...Object.fromEntries(
		Object.entries(PRODUCTION_RECIPES).map(([product, r]) => [product, { inputs: r.inputs, output: r.output }])
	)
};
