// Industrial equipment, production efficiency and quality.
//
// A factory cannot be built out of thin air: it needs shared machine tools
// (and a fabrication line needs its own exotic tooling). Once built, it gets
// better at its job with every shift, but a strike on the grid, a severed
// supply line, a blockade or a missing input damages both its output and the
// quality of what it makes. The plant's ledger records efficiency and quality
// so the player can see the wear and recover it with steady, supplied shifts.
//
// Pure data and pure functions only: the factory screens and services import
// them.

export type EquipmentProduct = "machine_tools" | "fab_equipment";

export interface EquipmentSpec {
	label: string;
	icon: string;
	blurb: string;
	/** Output per shift of an equipment plant. */
	output: number;
	/** Inputs per shift. Products may be inputs as well as resources. */
	inputs: Record<string, number>;
}

export const EQUIPMENT: Record<EquipmentProduct, EquipmentSpec> = {
	machine_tools: {
		label: "Machine tools",
		icon: "⚙️",
		blurb: "Lathes, presses and jigs. Every factory needs them to be built and to keep running.",
		output: 3,
		inputs: { steel: 20, iron: 10, copper: 5 }
	},
	fab_equipment: {
		label: "Fab equipment",
		icon: "🔬",
		blurb: "Etchers and clean-room gear. Only a fabrication line needs this specialized kit.",
		output: 1,
		inputs: { machine_tools: 2, chips: 5, rare_earth: 3 }
	}
};

export const EQUIPMENT_PRODUCTS = Object.keys(EQUIPMENT) as EquipmentProduct[];

/** What a new factory consumes from its owner's product inventory. */
export const FACTORY_EQUIPMENT = {
	/** Shared by every factory type. */
	MACHINE_TOOLS: 5,
	/** Extra, specialized kit for a fabrication line. */
	FAB_TOOLS: 2,
	/** Machine tools ground away every N completed shifts. */
	WEAR_EVERY_SHIFTS: 5,
	WEAR_PERIOD: 5
} as const;

export function equipmentForFactory(factoryType: string): { machine_tools: number; fab_equipment?: number } {
	return factoryType === "fabrication"
		? { machine_tools: FACTORY_EQUIPMENT.MACHINE_TOOLS, fab_equipment: FACTORY_EQUIPMENT.FAB_TOOLS }
		: { machine_tools: FACTORY_EQUIPMENT.MACHINE_TOOLS };
}

// ── Learning and degradation ────────────────────────────────────────────────

export const PRODUCTION_QUALITY = {
	START_EFFICIENCY: 50,
	START_QUALITY: 90,
	MIN: 0,
	MAX: 100,
	/** Each clean, supplied shift teaches the crew a little. */
	GAIN_PER_SHIFT: 2,
	/** A missing input or worn-out tool stops the line and loses know-how. */
	LOSS_ON_SHORTAGE: 8,
	/** Each point of grid/supply loss above this threshold costs efficiency. */
	DISRUPTION_THRESHOLD: 0.8,
	DISRUPTION_LOSS: 4,
	/** Quality trails efficiency but recovers faster than it falls. */
	QUALITY_GAIN: 2,
	QUALITY_LOSS: 6,
	/** Output multiplier from efficiency: a green line makes 70% more than a worn one. */
	EFFICIENCY_FLOOR: 0.7,
	EFFICIENCY_GAIN: 0.3
} as const;

/** Output multiplier from a plant's accumulated know-how. */
export function efficiencyFactor(efficiency: number): number {
	const e = Math.max(0, Math.min(100, efficiency));
	return Math.round((PRODUCTION_QUALITY.EFFICIENCY_FLOOR + (e / 100) * PRODUCTION_QUALITY.EFFICIENCY_GAIN) * 1000) / 1000;
}

/** Quality multiplier applied to a shift's output; attacks degrade it. */
export function qualityFactor(quality: number): number {
	return Math.round((0.8 + (Math.max(0, Math.min(100, quality)) / 100) * 0.4) * 1000) / 1000;
}

/** How many efficiency points a shift with these disruptions loses (0 when clean). */
export function disruptionPenalty(factors: number[]): number {
	const worst = Math.min(...factors, 1);
	if (worst >= PRODUCTION_QUALITY.DISRUPTION_THRESHOLD) return 0;
	return Math.round(PRODUCTION_QUALITY.DISRUPTION_LOSS * (1 - worst / PRODUCTION_QUALITY.DISRUPTION_THRESHOLD));
}

/** New efficiency after one shift. */
export function nextEfficiency(efficiency: number, options: { supplied: boolean; disruptions: number[] }): number {
	const loss = options.supplied ? disruptionPenalty(options.disruptions) : PRODUCTION_QUALITY.LOSS_ON_SHORTAGE;
	const gain = options.supplied && loss === 0 ? PRODUCTION_QUALITY.GAIN_PER_SHIFT : 0;
	return Math.max(
		PRODUCTION_QUALITY.MIN,
		Math.min(PRODUCTION_QUALITY.MAX, Math.round(efficiency - loss + gain))
	);
}

/** New quality after one shift (quality follows efficiency, slowly). */
export function nextQuality(quality: number, efficiency: number, supplied: boolean): number {
	const target = Math.round(efficiency * 0.9 + 10);
	const step = quality < target ? (supplied ? PRODUCTION_QUALITY.QUALITY_GAIN : 0) : PRODUCTION_QUALITY.QUALITY_LOSS;
	return Math.max(
		PRODUCTION_QUALITY.MIN,
		Math.min(PRODUCTION_QUALITY.MAX, quality + Math.sign(target - quality) * step)
	);
}

/** Whether the plant is due to grind through another machine tool. */
export function dueForWear(shiftsCompleted: number): boolean {
	return shiftsCompleted > 0 && shiftsCompleted % FACTORY_EQUIPMENT.WEAR_EVERY_SHIFTS === 0;
}
