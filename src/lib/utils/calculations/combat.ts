// Combat calculations
import { COMBAT_CONFIG, MILITARY_UNIT_TEMPLATES, type TerrainType } from '$lib/config';

export function calculateCombatWidth(terrain: TerrainType): number {
    const modifier = COMBAT_CONFIG.TERRAIN_WIDTH_MODIFIERS[terrain];
    return Math.floor(COMBAT_CONFIG.BASE_COMBAT_WIDTH * modifier);
}

export function calculatePlanningBonus(hoursPlanning: number): number {
    const bonus = Math.min(
        hoursPlanning * COMBAT_CONFIG.PLANNING_BONUS_PER_HOUR,
        COMBAT_CONFIG.MAX_PLANNING_BONUS
    );
    return bonus;
}

export function calculateDamage(
    baseAttack: number,
    targetDefense: number,
    planningBonus: number = 0,
    fortificationLevel: number = 0
): number {
    // Apply planning bonus
    const attackWithPlanning = baseAttack * (1 + planningBonus / 100);

    // Apply fortification defense bonus
    const defenseWithFort = targetDefense * (1 + fortificationLevel * COMBAT_CONFIG.FORTIFICATION_DEFENSE_BONUS);

    // Calculate damage (simplified formula)
    const baseDamage = Math.max(0, attackWithPlanning - defenseWithFort * 0.5);
    return Math.floor(baseDamage * COMBAT_CONFIG.BASE_DAMAGE_MULTIPLIER);
}

export function calculateOrganizationLoss(damageDealt: number, currentOrg: number): number {
    // Organization loss is proportional to damage dealt
    const orgLoss = Math.floor(damageDealt * 0.3);
    return Math.min(orgLoss, currentOrg);
}

export function isUnitExhausted(organization: number): boolean {
    return organization <= COMBAT_CONFIG.ORG_THRESHOLD_EXHAUSTED;
}

export function isUnitDestroyed(strength: number): boolean {
    return strength <= COMBAT_CONFIG.STRENGTH_THRESHOLD_DESTROYED;
}

export function shouldUnitRetreat(organization: number): boolean {
    return organization <= COMBAT_CONFIG.ORG_THRESHOLD_RETREAT;
}

export function getUnitTemplate(unitType: string) {
    return MILITARY_UNIT_TEMPLATES[unitType as keyof typeof MILITARY_UNIT_TEMPLATES];
}
