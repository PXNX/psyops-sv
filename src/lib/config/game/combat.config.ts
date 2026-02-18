// Combat system configuration
export const COMBAT_CONFIG = {
    // Battle phases duration (in hours)
    PREPARATION_PHASE_DURATION: 24,
    PLANNING_PHASE_DURATION: 48,

    // Planning bonus
    MAX_PLANNING_BONUS: 50, // Maximum planning bonus percentage
    PLANNING_BONUS_PER_HOUR: 1, // Bonus gained per hour

    // Combat width
    BASE_COMBAT_WIDTH: 80,
    TERRAIN_WIDTH_MODIFIERS: {
        plains: 1.0,
        forest: 0.8,
        hills: 0.7,
        mountain: 0.5,
        urban: 0.6,
        desert: 0.9,
        jungle: 0.6
    },

    // Organization and strength
    ORG_THRESHOLD_EXHAUSTED: 20, // Below this, unit is exhausted
    STRENGTH_THRESHOLD_DESTROYED: 0, // At this, unit is destroyed
    DAILY_ORG_RECOVERY: 10, // Organization recovery per day when not in combat
    DAILY_STRENGTH_RECOVERY: 5, // Strength recovery per day when not in combat

    // Combat rounds
    ROUND_DURATION_HOURS: 1, // How often combat rounds occur
    BASE_DAMAGE_MULTIPLIER: 1.0,
    FORTIFICATION_DEFENSE_BONUS: 0.15, // 15% per fortification level

    // Retreat and encirclement
    ORG_THRESHOLD_RETREAT: 10, // Below this, units start retreating
    RETREAT_DAMAGE_MULTIPLIER: 1.5 // Extra damage when retreating
} as const;

export type TerrainType = keyof typeof COMBAT_CONFIG.TERRAIN_WIDTH_MODIFIERS;
