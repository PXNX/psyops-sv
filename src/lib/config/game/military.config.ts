// Military units configuration
import type { militaryUnitTypeEnum } from "$lib/server/schema";

export type MilitaryUnitTemplate = {
    id: number;
    unitType: string;
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

export const MILITARY_UNIT_TEMPLATES: Record<
    (typeof militaryUnitTypeEnum.enumValues)[number],
    MilitaryUnitTemplate
> = {
    infantry: {
        id: 1,
        unitType: "infantry" as const,
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
    }
};
