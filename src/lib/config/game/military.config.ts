// Military units configuration
import type { militaryUnitTypeEnum } from "#lib/server/schema.js";
import type { Domain } from "./domains.config";

export type MilitaryUnitTemplate = {
	id: number;
	unitType: string;
	/** The domain the unit fights in: land, sea or air. */
	domain: Domain;
	baseAttack: number;
	baseDefense: number;
	combatWidth: number;
	trainingDuration: number;
	currencyCost: number;
	ironCost: number | undefined;
	steelCost: number | undefined;
	gunpowderCost: number | undefined;
	riflesCost: number | undefined;
	ammunitionCost: number | undefined;
	artilleryCost: number;
	vehiclesCost: number | undefined;
	explosivesCost: number | undefined;
};

export const MILITARY_UNIT_TEMPLATES: Record<(typeof militaryUnitTypeEnum.enumValues)[number], MilitaryUnitTemplate> = {
	infantry: {
		id: 1,
		unitType: "infantry" as const,
		domain: "land",
		baseAttack: 15,
		baseDefense: 20,
		combatWidth: 2,
		trainingDuration: 6,
		currencyCost: 50000,
		ironCost: 0,
		steelCost: 50,
		gunpowderCost: 100,
		riflesCost: 500,
		ammunitionCost: 1000,
		artilleryCost: 0,
		vehiclesCost: 0,
		explosivesCost: 50
	},
	armor: {
		id: 2,
		unitType: "armor" as const,
		domain: "land",
		baseAttack: 50,
		baseDefense: 40,
		combatWidth: 4,
		trainingDuration: 12,
		currencyCost: 200000,
		ironCost: 200,
		steelCost: 500,
		gunpowderCost: 200,
		riflesCost: 200,
		ammunitionCost: 2000,
		artilleryCost: 0,
		vehiclesCost: 50,
		explosivesCost: 100
	},
	mechanized: {
		id: 3,
		unitType: "mechanized" as const,
		domain: "land",
		baseAttack: 30,
		baseDefense: 30,
		combatWidth: 3,
		trainingDuration: 10,
		currencyCost: 150000,
		ironCost: 100,
		steelCost: 300,
		gunpowderCost: 150,
		riflesCost: 400,
		ammunitionCost: 1500,
		artilleryCost: 0,
		vehiclesCost: 30,
		explosivesCost: 75
	},
	artillery: {
		id: 4,
		unitType: "artillery" as const,
		domain: "land",
		baseAttack: 40,
		baseDefense: 15,
		combatWidth: 3,
		trainingDuration: 8,
		currencyCost: 100000,
		ironCost: 150,
		steelCost: 200,
		gunpowderCost: 300,
		riflesCost: 100,
		ammunitionCost: 3000,
		artilleryCost: 20,
		vehiclesCost: 10,
		explosivesCost: 200
	},
	air_defence: {
		id: 5,
		unitType: "air_defence" as const,
		domain: "land",
		baseAttack: 25,
		baseDefense: 25,
		combatWidth: 2,
		trainingDuration: 10,
		currencyCost: 175000,
		ironCost: 100,
		steelCost: 400,
		gunpowderCost: 100,
		riflesCost: 200,
		ammunitionCost: 1000,
		artilleryCost: 15,
		vehiclesCost: 20,
		explosivesCost: 150
	},
	fighter_squadron: {
		id: 6,
		unitType: "fighter_squadron" as const,
		domain: "air",
		baseAttack: 60,
		baseDefense: 35,
		combatWidth: 4,
		trainingDuration: 16,
		currencyCost: 300000,
		ironCost: 200,
		steelCost: 600,
		gunpowderCost: 150,
		riflesCost: 100,
		ammunitionCost: 2500,
		artilleryCost: 0,
		vehiclesCost: 12,
		explosivesCost: 200
	},
	bomber_squadron: {
		id: 7,
		unitType: "bomber_squadron" as const,
		domain: "air",
		baseAttack: 70,
		baseDefense: 20,
		combatWidth: 5,
		trainingDuration: 18,
		currencyCost: 350000,
		ironCost: 250,
		steelCost: 700,
		gunpowderCost: 200,
		riflesCost: 50,
		ammunitionCost: 2000,
		artilleryCost: 0,
		vehiclesCost: 8,
		explosivesCost: 500
	},
	// ── Sea ────────────────────────────────────────────────────────────────
	frigate: {
		id: 8,
		unitType: "frigate" as const,
		domain: "sea",
		baseAttack: 45,
		baseDefense: 35,
		combatWidth: 4,
		trainingDuration: 20,
		currencyCost: 260000,
		ironCost: 150,
		steelCost: 800,
		gunpowderCost: 50,
		riflesCost: 0,
		ammunitionCost: 1500,
		artilleryCost: 0,
		vehiclesCost: 0,
		explosivesCost: 100
	},
	submarine: {
		id: 9,
		unitType: "submarine" as const,
		domain: "sea",
		baseAttack: 60,
		baseDefense: 20,
		combatWidth: 3,
		trainingDuration: 26,
		currencyCost: 400000,
		ironCost: 200,
		steelCost: 700,
		gunpowderCost: 0,
		riflesCost: 0,
		ammunitionCost: 500,
		artilleryCost: 0,
		vehiclesCost: 0,
		explosivesCost: 300
	},
	carrier: {
		id: 10,
		unitType: "carrier" as const,
		domain: "sea",
		baseAttack: 30,
		baseDefense: 55,
		combatWidth: 6,
		trainingDuration: 40,
		currencyCost: 900000,
		ironCost: 300,
		steelCost: 1500,
		gunpowderCost: 100,
		riflesCost: 0,
		ammunitionCost: 2000,
		artilleryCost: 0,
		vehiclesCost: 20,
		explosivesCost: 200
	},
	landing_ship: {
		id: 11,
		unitType: "landing_ship" as const,
		domain: "sea",
		baseAttack: 8,
		baseDefense: 30,
		combatWidth: 4,
		trainingDuration: 18,
		currencyCost: 220000,
		ironCost: 100,
		steelCost: 600,
		gunpowderCost: 20,
		riflesCost: 0,
		ammunitionCost: 300,
		artilleryCost: 0,
		vehiclesCost: 40,
		explosivesCost: 50
	},
	// Amphibious infantry: land domain, but it can be landed from the sea.
	marine: {
		id: 12,
		unitType: "marine" as const,
		domain: "land",
		baseAttack: 28,
		baseDefense: 24,
		combatWidth: 2,
		trainingDuration: 10,
		currencyCost: 90000,
		ironCost: 20,
		steelCost: 100,
		gunpowderCost: 80,
		riflesCost: 400,
		ammunitionCost: 1200,
		artilleryCost: 0,
		vehiclesCost: 0,
		explosivesCost: 100
	}
};
