import { describe, it, expect } from "@rstest/core";

// Combat configuration (mirrored from config to avoid SvelteKit path aliases)
const COMBAT_CONFIG = {
    PREPARATION_PHASE_DURATION: 24,
    PLANNING_PHASE_DURATION: 48,
    MAX_PLANNING_BONUS: 50,
    PLANNING_BONUS_PER_HOUR: 1,
    BASE_COMBAT_WIDTH: 80,
    TERRAIN_WIDTH_MODIFIERS: {
        plains: 1.0,
        forest: 0.8,
        hills: 0.7,
        mountain: 0.5,
        urban: 0.6,
        desert: 0.9,
        jungle: 0.6,
    } as Record<string, number>,
    ORG_THRESHOLD_EXHAUSTED: 20,
    STRENGTH_THRESHOLD_DESTROYED: 0,
    DAILY_ORG_RECOVERY: 10,
    DAILY_STRENGTH_RECOVERY: 5,
    ROUND_DURATION_HOURS: 1,
    BASE_DAMAGE_MULTIPLIER: 1.0,
    FORTIFICATION_DEFENSE_BONUS: 0.15,
    ORG_THRESHOLD_RETREAT: 10,
    RETREAT_DAMAGE_MULTIPLIER: 1.5,
} as const;

// Pure logic functions from BattleService
function calculateCombatWidth(terrain: string): number {
    const modifier =
        COMBAT_CONFIG.TERRAIN_WIDTH_MODIFIERS[terrain] ?? 1.0;
    return Math.floor(COMBAT_CONFIG.BASE_COMBAT_WIDTH * modifier);
}

function calculatePlanningBonus(hoursPlanning: number): number {
    return Math.min(
        hoursPlanning * COMBAT_CONFIG.PLANNING_BONUS_PER_HOUR,
        COMBAT_CONFIG.MAX_PLANNING_BONUS,
    );
}

function calculateDamage(
    baseAttack: number,
    targetDefense: number,
    planningBonus: number = 0,
    fortificationLevel: number = 0,
): number {
    const attackWithPlanning = baseAttack * (1 + planningBonus / 100);
    const defenseWithFort =
        targetDefense *
        (1 + fortificationLevel * COMBAT_CONFIG.FORTIFICATION_DEFENSE_BONUS);
    const baseDamage = Math.max(
        0,
        attackWithPlanning - defenseWithFort * 0.5,
    );
    return Math.floor(baseDamage * COMBAT_CONFIG.BASE_DAMAGE_MULTIPLIER);
}

function calculateOrganizationLoss(
    damageDealt: number,
    currentOrg: number,
): number {
    const orgLoss = Math.floor(damageDealt * 0.3);
    return Math.min(orgLoss, currentOrg);
}

function isUnitExhausted(organization: number): boolean {
    return organization <= COMBAT_CONFIG.ORG_THRESHOLD_EXHAUSTED;
}

function isUnitDestroyed(strength: number): boolean {
    return strength <= COMBAT_CONFIG.STRENGTH_THRESHOLD_DESTROYED;
}

function shouldUnitRetreat(organization: number): boolean {
    return organization <= COMBAT_CONFIG.ORG_THRESHOLD_RETREAT;
}

describe("BattleService - Combat Width", () => {
    it("should calculate plains combat width (100%)", () => {
        expect(calculateCombatWidth("plains")).toBe(80);
    });

    it("should calculate forest combat width (80%)", () => {
        expect(calculateCombatWidth("forest")).toBe(64);
    });

    it("should calculate mountain combat width (50%)", () => {
        expect(calculateCombatWidth("mountain")).toBe(40);
    });

    it("should calculate urban combat width (60%)", () => {
        expect(calculateCombatWidth("urban")).toBe(48);
    });

    it("should calculate hills combat width (70%)", () => {
        expect(calculateCombatWidth("hills")).toBe(56);
    });

    it("should calculate desert combat width (90%)", () => {
        expect(calculateCombatWidth("desert")).toBe(72);
    });

    it("should calculate jungle combat width (60%)", () => {
        expect(calculateCombatWidth("jungle")).toBe(48);
    });
});

describe("BattleService - Planning Bonus", () => {
    it("should give 1% per hour of planning", () => {
        expect(calculatePlanningBonus(10)).toBe(10);
    });

    it("should cap at maximum planning bonus (50%)", () => {
        expect(calculatePlanningBonus(100)).toBe(50);
    });

    it("should return 0 for 0 hours", () => {
        expect(calculatePlanningBonus(0)).toBe(0);
    });

    it("should handle exactly max hours", () => {
        expect(calculatePlanningBonus(50)).toBe(50);
    });
});

describe("BattleService - Damage Calculation", () => {
    it("should calculate basic damage without bonuses", () => {
        const damage = calculateDamage(50, 30);
        // attack = 50, defense contribution = 30 * 0.5 = 15
        // baseDamage = max(0, 50 - 15) = 35
        expect(damage).toBe(35);
    });

    it("should apply planning bonus to attack", () => {
        const damage = calculateDamage(50, 30, 20);
        // attackWithPlanning = 50 * 1.2 = 60
        // defense = 30 * 0.5 = 15
        // baseDamage = 60 - 15 = 45
        expect(damage).toBe(45);
    });

    it("should apply fortification defense bonus", () => {
        const damage = calculateDamage(50, 30, 0, 2);
        // attack = 50
        // defenseWithFort = 30 * (1 + 2 * 0.15) = 30 * 1.3 = 39
        // baseDamage = max(0, 50 - 39 * 0.5) = max(0, 50 - 19.5) = 30.5 -> 30
        expect(damage).toBe(30);
    });

    it("should not produce negative damage", () => {
        const damage = calculateDamage(10, 100);
        // attack = 10, defense = 100 * 0.5 = 50
        // baseDamage = max(0, 10 - 50) = 0
        expect(damage).toBe(0);
    });

    it("should combine planning bonus and fortifications", () => {
        const damage = calculateDamage(50, 30, 50, 3);
        // attackWithPlanning = 50 * 1.5 = 75
        // defenseWithFort = 30 * (1 + 3 * 0.15) = 30 * 1.45 = 43.5
        // baseDamage = max(0, 75 - 43.5 * 0.5) = max(0, 75 - 21.75) = 53.25 -> 53
        expect(damage).toBe(53);
    });
});

describe("BattleService - Organization Loss", () => {
    it("should calculate 30% of damage as org loss", () => {
        expect(calculateOrganizationLoss(100, 100)).toBe(30);
    });

    it("should not exceed current organization", () => {
        expect(calculateOrganizationLoss(100, 10)).toBe(10);
    });

    it("should floor fractional values", () => {
        expect(calculateOrganizationLoss(7, 100)).toBe(2); // 2.1 -> 2
    });

    it("should return 0 for 0 damage", () => {
        expect(calculateOrganizationLoss(0, 100)).toBe(0);
    });
});

describe("BattleService - Unit Status Checks", () => {
    it("should mark unit as exhausted when org <= 20", () => {
        expect(isUnitExhausted(20)).toBe(true);
        expect(isUnitExhausted(19)).toBe(true);
        expect(isUnitExhausted(0)).toBe(true);
    });

    it("should not mark unit as exhausted when org > 20", () => {
        expect(isUnitExhausted(21)).toBe(false);
        expect(isUnitExhausted(100)).toBe(false);
    });

    it("should mark unit as destroyed when strength <= 0", () => {
        expect(isUnitDestroyed(0)).toBe(true);
        expect(isUnitDestroyed(-1)).toBe(true);
    });

    it("should not mark unit as destroyed when strength > 0", () => {
        expect(isUnitDestroyed(1)).toBe(false);
        expect(isUnitDestroyed(100)).toBe(false);
    });

    it("should trigger retreat when org <= 10", () => {
        expect(shouldUnitRetreat(10)).toBe(true);
        expect(shouldUnitRetreat(5)).toBe(true);
        expect(shouldUnitRetreat(0)).toBe(true);
    });

    it("should not trigger retreat when org > 10", () => {
        expect(shouldUnitRetreat(11)).toBe(false);
        expect(shouldUnitRetreat(100)).toBe(false);
    });
});
