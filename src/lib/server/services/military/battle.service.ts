// Battle service - handles battle logic
import type { Database } from '../../db';
import { battles, battleParticipants, battleRounds, militaryUnits } from '../../schema';
import { eq, and, desc } from 'drizzle-orm';
import { COMBAT_CONFIG, MILITARY_UNIT_TEMPLATES, type TerrainType } from '$lib/config';

export class BattleService {
    constructor(private db: typeof import('../../db').db) { }

    // ============ Combat Calculations ============

    calculateCombatWidth(terrain: TerrainType): number {
        const modifier = COMBAT_CONFIG.TERRAIN_WIDTH_MODIFIERS[terrain];
        return Math.floor(COMBAT_CONFIG.BASE_COMBAT_WIDTH * modifier);
    }

    calculatePlanningBonus(hoursPlanning: number): number {
        const bonus = Math.min(
            hoursPlanning * COMBAT_CONFIG.PLANNING_BONUS_PER_HOUR,
            COMBAT_CONFIG.MAX_PLANNING_BONUS
        );
        return bonus;
    }

    calculateDamage(
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

    calculateOrganizationLoss(damageDealt: number, currentOrg: number): number {
        // Organization loss is proportional to damage dealt
        const orgLoss = Math.floor(damageDealt * 0.3);
        return Math.min(orgLoss, currentOrg);
    }

    isUnitExhausted(organization: number): boolean {
        return organization <= COMBAT_CONFIG.ORG_THRESHOLD_EXHAUSTED;
    }

    isUnitDestroyed(strength: number): boolean {
        return strength <= COMBAT_CONFIG.STRENGTH_THRESHOLD_DESTROYED;
    }

    shouldUnitRetreat(organization: number): boolean {
        return organization <= COMBAT_CONFIG.ORG_THRESHOLD_RETREAT;
    }

    getUnitTemplate(unitType: string) {
        return MILITARY_UNIT_TEMPLATES[unitType as keyof typeof MILITARY_UNIT_TEMPLATES];
    }

    // ============ Battle Operations ============

    async getBattleById(battleId: number) {
        const result = await this.db.select().from(battles).where(eq(battles.id, battleId));
        return result[0] || null;
    }

    async getBattleParticipants(battleId: number, side?: 'attacker' | 'defender') {
        const conditions = [eq(battleParticipants.battleId, battleId)];

        if (side) {
            conditions.push(eq(battleParticipants.side, side));
        }

        return await this.db
            .select()
            .from(battleParticipants)
            .where(and(...conditions));
    }

    async addUnitToBattle(battleId: number, unitId: number, side: 'attacker' | 'defender') {
        const unit = await this.db.select().from(militaryUnits).where(eq(militaryUnits.id, unitId));

        if (!unit[0]) {
            throw new Error('Unit not found');
        }

        const participant = {
            battleId,
            unitId,
            side,
            currentStrength: unit[0].health,
            currentOrganization: unit[0].organization,
            maxStrength: 100
        };

        await this.db.insert(battleParticipants).values(participant);
        return participant;
    }

    async processBattleRound(battleId: number) {
        const battle = await this.getBattleById(battleId);
        if (!battle) {
            throw new Error('Battle not found');
        }

        // Get all participants
        const attackers = await this.getBattleParticipants(battleId, 'attacker');
        const defenders = await this.getBattleParticipants(battleId, 'defender');

        // Filter active units (not exhausted)
        const activeAttackers = attackers.filter((p) => !this.isUnitExhausted(p.currentOrganization));
        const activeDefenders = defenders.filter((p) => !this.isUnitExhausted(p.currentOrganization));

        if (activeAttackers.length === 0 || activeDefenders.length === 0) {
            // Battle ends
            await this.endBattle(battleId);
            return;
        }

        // Calculate damage for each side
        let attackerTotalDamage = 0;
        let defenderTotalDamage = 0;
        let attackerOrgLoss = 0;
        let defenderOrgLoss = 0;

        // Attackers attack defenders
        for (const attacker of activeAttackers) {
            const unit = await this.db
                .select()
                .from(militaryUnits)
                .where(eq(militaryUnits.id, attacker.unitId));
            const template = this.getUnitTemplate(unit[0]!.unitType);

            const target = activeDefenders[Math.floor(Math.random() * activeDefenders.length)];
            if (target) {
                const damage = this.calculateDamage(
                    template.baseAttack,
                    template.baseDefense,
                    battle.attackerPlanningBonus
                );
                attackerTotalDamage += damage;

                // Update target
                const orgLoss = this.calculateOrganizationLoss(damage, target.currentOrganization);
                await this.db
                    .update(battleParticipants)
                    .set({
                        currentStrength: Math.max(0, target.currentStrength - damage),
                        currentOrganization: Math.max(0, target.currentOrganization - orgLoss)
                    })
                    .where(eq(battleParticipants.id, target.id));
            }
        }

        // Defenders attack attackers
        for (const defender of activeDefenders) {
            const unit = await this.db
                .select()
                .from(militaryUnits)
                .where(eq(militaryUnits.id, defender.unitId));
            const template = this.getUnitTemplate(unit[0]!.unitType);

            const target = activeAttackers[Math.floor(Math.random() * activeAttackers.length)];
            if (target) {
                const damage = this.calculateDamage(
                    template.baseAttack,
                    template.baseDefense,
                    battle.defenderPlanningBonus
                );
                defenderTotalDamage += damage;

                // Update target
                const orgLoss = this.calculateOrganizationLoss(damage, target.currentOrganization);
                await this.db
                    .update(battleParticipants)
                    .set({
                        currentStrength: Math.max(0, target.currentStrength - damage),
                        currentOrganization: Math.max(0, target.currentOrganization - orgLoss)
                    })
                    .where(eq(battleParticipants.id, target.id));
            }
        }

        // Create battle round record
        const roundNumber =
            (
                await this.db
                    .select()
                    .from(battleRounds)
                    .where(eq(battleRounds.battleId, battleId))
                    .orderBy(desc(battleRounds.roundNumber))
            )[0]?.roundNumber || 0;

        await this.db.insert(battleRounds).values({
            battleId,
            roundNumber: roundNumber + 1,
            battlePhase: battle.phase,
            attackerUnitsEngaged: activeAttackers.length,
            defenderUnitsEngaged: activeDefenders.length,
            attackerTotalDamage,
            defenderTotalDamage,
            attackerOrgLoss,
            defenderOrgLoss,
            attackerPlanningBonus: battle.attackerPlanningBonus,
            defenderPlanningBonus: battle.defenderPlanningBonus
        });
    }

    async endBattle(battleId: number) {
        const attackers = await this.getBattleParticipants(battleId, 'attacker');
        const defenders = await this.getBattleParticipants(battleId, 'defender');

        const activeAttackers = attackers.filter((p) => !this.isUnitExhausted(p.currentOrganization));
        const activeDefenders = defenders.filter((p) => !this.isUnitExhausted(p.currentOrganization));

        let status: 'attacker_won' | 'defender_won';
        if (activeAttackers.length > 0 && activeDefenders.length === 0) {
            status = 'attacker_won';
        } else {
            status = 'defender_won';
        }

        await this.db
            .update(battles)
            .set({
                status,
                endedAt: new Date()
            })
            .where(eq(battles.id, battleId));
    }
}
