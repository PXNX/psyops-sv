// src/routes/(authenticated)/(dock)/battle/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	battles,
	battleParticipants,
	battleRounds,
	battleUnitActions,
	militaryUnits,
	wars,
	regions,
	states,
	residences
} from "$lib/server/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import type { PageServerLoad, Actions } from "../$types";
import { error, fail } from "@sveltejs/kit";

// Combat width by unit type
const UNIT_COMBAT_WIDTH: Record<string, number> = {
	infantry: 2,
	armor: 3,
	mechanized: 2,
	artillery: 3,
	air_defence: 2,
	bomber_squadron: 0,
	fighter_squadron: 0
};

// Terrain combat modifiers
const TERRAIN_DATA = {
	plains: { combatWidth: 90, attackMod: 0, defenseMod: 0, movementMod: 0 },
	forest: { combatWidth: 84, attackMod: -10, defenseMod: 15, movementMod: -20 },
	hills: { combatWidth: 80, attackMod: -5, defenseMod: 20, movementMod: -10 },
	mountain: { combatWidth: 75, attackMod: -20, defenseMod: 30, movementMod: -30 },
	urban: { combatWidth: 96, attackMod: -15, defenseMod: 25, movementMod: -15 },
	desert: { combatWidth: 90, attackMod: -5, defenseMod: -5, movementMod: 0 },
	jungle: { combatWidth: 84, attackMod: -25, defenseMod: 10, movementMod: -35 }
};

// Calculate combat efficiency (HoI4 style)
function getCombatEfficiency(org: number, strength: number): number {
	// Organization is CRITICAL - below 25% org = severe penalty
	let orgFactor: number;
	if (org >= 50) {
		orgFactor = org / 100;
	} else if (org >= 25) {
		orgFactor = (org / 100) * 0.6;
	} else {
		orgFactor = (org / 100) * 0.2; // Routed
	}

	const strengthFactor = strength / 100;

	// 80% from org, 20% from strength
	return orgFactor * 0.8 + strengthFactor * 0.2;
}

// Select units to engage based on combat width
function selectEngagedUnits(participants: any[], maxWidth: number): any[] {
	// Filter to units that can fight
	const available = participants.filter((p) => p.currentStrength > 0 && p.currentOrganization > 5 && !p.isExhausted);

	// Sort by organization (higher org units fight first)
	available.sort((a, b) => b.currentOrganization - a.currentOrganization);

	const engaged: any[] = [];
	let usedWidth = 0;

	for (const unit of available) {
		const unitWidth = UNIT_COMBAT_WIDTH[unit.unit.unitType] || 2;
		if (usedWidth + unitWidth <= maxWidth) {
			engaged.push(unit);
			usedWidth += unitWidth;
		}
	}

	return engaged;
}

// Process a combat round
async function processCombatRound(battleId: number, terrain: string, phase: string) {
	const battle = await db.query.battles.findFirst({
		where: eq(battles.id, battleId),
		with: {
			participants: {
				with: { unit: true }
			}
		}
	});

	if (!battle) return null;

	const terrainData = TERRAIN_DATA[terrain as keyof typeof TERRAIN_DATA];

	// Separate sides
	const attackerUnits = battle.participants.filter((p) => p.side === "attacker");
	const defenderUnits = battle.participants.filter((p) => p.side === "defender");

	// Select engaged units
	const engagedAttackers = selectEngagedUnits(attackerUnits, terrainData.combatWidth);
	const engagedDefenders = selectEngagedUnits(defenderUnits, terrainData.combatWidth);

	// Update engagement status
	await db.update(battleParticipants).set({ isEngaged: false }).where(eq(battleParticipants.battleId, battleId));

	for (const unit of [...engagedAttackers, ...engagedDefenders]) {
		await db.update(battleParticipants).set({ isEngaged: true }).where(eq(battleParticipants.id, unit.id));
	}

	// Calculate combat results
	let attackerTotalDmg = 0;
	let defenderTotalDmg = 0;
	let attackerTotalOrgLoss = 0;
	let defenderTotalOrgLoss = 0;

	// Get round number
	const existingRounds = await db
		.select({ count: count() })
		.from(battleRounds)
		.where(eq(battleRounds.battleId, battleId));
	const roundNumber = (existingRounds[0]?.count || 0) + 1;

	// Create round record
	const [round] = await db
		.insert(battleRounds)
		.values({
			battleId,
			roundNumber,
			battlePhase: phase,
			attackerUnitsEngaged: engagedAttackers.length,
			defenderUnitsEngaged: engagedDefenders.length,
			attackerTotalDamage: 0,
			defenderTotalDamage: 0,
			attackerOrgLoss: 0,
			defenderOrgLoss: 0,
			attackerPlanningBonus: battle.attackerPlanningBonus,
			defenderPlanningBonus: battle.defenderPlanningBonus
		})
		.returning();

	// Process each engaged attacker
	for (const attacker of engagedAttackers) {
		const attackerEff = getCombatEfficiency(attacker.currentOrganization, attacker.currentStrength);
		const planningBonus = 1 + battle.attackerPlanningBonus / 100;
		const terrainMod = 1 + terrainData.attackMod / 100;

		// Calculate damage output
		const baseDmg = attacker.unit.attack * attackerEff * planningBonus * terrainMod;
		const damage = Math.floor(baseDmg * (0.7 + Math.random() * 0.6));

		// Org loss for attacking
		const orgLoss = Math.floor(6 + Math.random() * 8);

		attackerTotalDmg += damage;
		attackerTotalOrgLoss += orgLoss;

		// Record action
		const newOrg = Math.max(0, attacker.currentOrganization - orgLoss);
		await db.insert(battleUnitActions).values({
			roundId: round.id,
			participantId: attacker.id,
			damageDealt: damage,
			damageTaken: 0, // Will be updated
			orgLoss,
			strengthAfter: attacker.currentStrength,
			organizationAfter: newOrg
		});
	}

	// Process each engaged defender
	for (const defender of engagedDefenders) {
		const defenderEff = getCombatEfficiency(defender.currentOrganization, defender.currentStrength);
		const planningBonus = 1 + battle.defenderPlanningBonus / 100;
		const defenseMod = 1 + terrainData.defenseMod / 100;

		// Defenders use defense stat + terrain bonus
		const baseDmg = defender.unit.defense * defenderEff * planningBonus * defenseMod;
		const damage = Math.floor(baseDmg * (0.6 + Math.random() * 0.5));

		// Org loss for defending (less than attacking)
		const orgLoss = Math.floor(4 + Math.random() * 6);

		defenderTotalDmg += damage;
		defenderTotalOrgLoss += orgLoss;

		const newOrg = Math.max(0, defender.currentOrganization - orgLoss);
		await db.insert(battleUnitActions).values({
			roundId: round.id,
			participantId: defender.id,
			damageDealt: damage,
			damageTaken: 0,
			orgLoss,
			strengthAfter: defender.currentStrength,
			organizationAfter: newOrg
		});
	}

	// Distribute damage across engaged units
	const attackerDmgPerUnit = engagedAttackers.length > 0 ? defenderTotalDmg / engagedAttackers.length : 0;
	const defenderDmgPerUnit = engagedDefenders.length > 0 ? attackerTotalDmg / engagedDefenders.length : 0;

	// Apply damage and update participants
	for (const attacker of engagedAttackers) {
		const dmgTaken = Math.floor(attackerDmgPerUnit);
		const newStrength = Math.max(0, attacker.currentStrength - dmgTaken);
		const newOrg = Math.max(0, attacker.currentOrganization - Math.floor(6 + Math.random() * 8));

		await db
			.update(battleParticipants)
			.set({
				currentStrength: newStrength,
				currentOrganization: newOrg,
				damageTaken: sql`${battleParticipants.damageTaken} + ${dmgTaken}`,
				damageDealt: sql`${battleParticipants.damageDealt} + ${Math.floor(attackerTotalDmg / engagedAttackers.length)}`,
				isExhausted: newOrg < 10,
				destroyedAt: newStrength === 0 ? new Date() : undefined
			})
			.where(eq(battleParticipants.id, attacker.id));

		// Delete destroyed units
		if (newStrength === 0) {
			await db.delete(militaryUnits).where(eq(militaryUnits.id, attacker.unitId));
		}
	}

	for (const defender of engagedDefenders) {
		const dmgTaken = Math.floor(defenderDmgPerUnit);
		const newStrength = Math.max(0, defender.currentStrength - dmgTaken);
		const newOrg = Math.max(0, defender.currentOrganization - Math.floor(4 + Math.random() * 6));

		await db
			.update(battleParticipants)
			.set({
				currentStrength: newStrength,
				currentOrganization: newOrg,
				damageTaken: sql`${battleParticipants.damageTaken} + ${dmgTaken}`,
				damageDealt: sql`${battleParticipants.damageDealt} + ${Math.floor(defenderTotalDmg / engagedDefenders.length)}`,
				isExhausted: newOrg < 10,
				destroyedAt: newStrength === 0 ? new Date() : undefined
			})
			.where(eq(battleParticipants.id, defender.id));

		if (newStrength === 0) {
			await db.delete(militaryUnits).where(eq(militaryUnits.id, defender.unitId));
		}
	}

	// Update round totals
	await db
		.update(battleRounds)
		.set({
			attackerTotalDamage: attackerTotalDmg,
			defenderTotalDamage: defenderTotalDmg,
			attackerOrgLoss: attackerTotalOrgLoss,
			defenderOrgLoss: defenderTotalOrgLoss
		})
		.where(eq(battleRounds.id, round.id));

	// Check victory conditions
	const remainingAttackers = await db
		.select({ count: count() })
		.from(battleParticipants)
		.where(
			and(
				eq(battleParticipants.battleId, battleId),
				eq(battleParticipants.side, "attacker"),
				sql`${battleParticipants.currentStrength} > 0`
			)
		);

	const remainingDefenders = await db
		.select({ count: count() })
		.from(battleParticipants)
		.where(
			and(
				eq(battleParticipants.battleId, battleId),
				eq(battleParticipants.side, "defender"),
				sql`${battleParticipants.currentStrength} > 0`
			)
		);

	if (remainingAttackers[0].count === 0) {
		await db
			.update(battles)
			.set({ status: "defender_won", phase: "ended", endedAt: new Date() })
			.where(eq(battles.id, battleId));
	} else if (remainingDefenders[0].count === 0) {
		// Attacker wins - transfer region
		await db.update(regions).set({ stateId: battle.attackerStateId }).where(eq(regions.id, battle.regionId));
		await db
			.update(battles)
			.set({ status: "attacker_won", phase: "ended", endedAt: new Date() })
			.where(eq(battles.id, battleId));
	}

	return round;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const battleId = parseInt(params.id);

	if (isNaN(battleId)) {
		throw error(400, "Invalid battle ID");
	}

	const battle = await db.query.battles.findFirst({
		where: eq(battles.id, battleId),
		with: {
			war: {
				with: {
					attacker: true,
					defender: true
				}
			},
			region: {
				with: {
					state: true
				}
			},
			attackerState: {
				with: {
					logoFile: true
				}
			},
			defenderState: {
				with: {
					logoFile: true
				}
			},
			starter: {
				with: {
					profile: true
				}
			},
			participants: {
				with: {
					unit: {
						with: {
							owner: {
								with: {
									profile: true
								}
							}
						}
					}
				},
				orderBy: desc(battleParticipants.joinedAt)
			},
			rounds: {
				orderBy: desc(battleRounds.roundNumber),
				limit: 20
			}
		}
	});

	if (!battle) {
		throw error(404, "Battle not found");
	}

	const userResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id),
		with: {
			region: {
				with: {
					state: true
				}
			}
		}
	});

	const userUnits = await db.query.militaryUnits.findMany({
		where: and(
			eq(militaryUnits.ownerId, account.id),
			eq(militaryUnits.regionId, battle.regionId),
			sql`${militaryUnits.id} NOT IN (SELECT unit_id FROM ${battleParticipants} WHERE battle_id = ${battleId})`
		)
	});

	const terrainData = TERRAIN_DATA[battle.terrain];

	const attackerParticipants = battle.participants.filter((p) => p.side === "attacker");
	const defenderParticipants = battle.participants.filter((p) => p.side === "defender");

	const engagedAttackers = attackerParticipants.filter((p) => p.isEngaged);
	const engagedDefenders = defenderParticipants.filter((p) => p.isEngaged);

	const attackerStats = {
		totalUnits: attackerParticipants.length,
		activeUnits: attackerParticipants.filter((p) => p.currentStrength > 0).length,
		engagedUnits: engagedAttackers.length,
		combatWidth: engagedAttackers.reduce((sum, p) => sum + (UNIT_COMBAT_WIDTH[p.unit.unitType] || 2), 0),
		maxCombatWidth: terrainData.combatWidth,
		totalDamageDealt: attackerParticipants.reduce((sum, p) => sum + p.damageDealt, 0),
		totalDamageTaken: attackerParticipants.reduce((sum, p) => sum + p.damageTaken, 0),
		destroyedUnits: attackerParticipants.filter((p) => p.currentStrength === 0).length,
		avgOrganization: Math.floor(
			attackerParticipants.filter((p) => p.currentStrength > 0).reduce((sum, p) => sum + p.currentOrganization, 0) /
				Math.max(1, attackerParticipants.filter((p) => p.currentStrength > 0).length)
		),
		avgStrength: Math.floor(
			attackerParticipants.filter((p) => p.currentStrength > 0).reduce((sum, p) => sum + p.currentStrength, 0) /
				Math.max(1, attackerParticipants.filter((p) => p.currentStrength > 0).length)
		)
	};

	const defenderStats = {
		totalUnits: defenderParticipants.length,
		activeUnits: defenderParticipants.filter((p) => p.currentStrength > 0).length,
		engagedUnits: engagedDefenders.length,
		combatWidth: engagedDefenders.reduce((sum, p) => sum + (UNIT_COMBAT_WIDTH[p.unit.unitType] || 2), 0),
		maxCombatWidth: terrainData.combatWidth,
		totalDamageDealt: defenderParticipants.reduce((sum, p) => sum + p.damageDealt, 0),
		totalDamageTaken: defenderParticipants.reduce((sum, p) => sum + p.damageTaken, 0),
		destroyedUnits: defenderParticipants.filter((p) => p.currentStrength === 0).length,
		avgOrganization: Math.floor(
			defenderParticipants.filter((p) => p.currentStrength > 0).reduce((sum, p) => sum + p.currentOrganization, 0) /
				Math.max(1, defenderParticipants.filter((p) => p.currentStrength > 0).length)
		),
		avgStrength: Math.floor(
			defenderParticipants.filter((p) => p.currentStrength > 0).reduce((sum, p) => sum + p.currentStrength, 0) /
				Math.max(1, defenderParticipants.filter((p) => p.currentStrength > 0).length)
		)
	};

	let userSide: "attacker" | "defender" | null = null;
	if (userResidence?.region.stateId === battle.attackerStateId) {
		userSide = "attacker";
	} else if (userResidence?.region.stateId === battle.defenderStateId) {
		userSide = "defender";
	}

	const userParticipants = battle.participants.filter((p) => p.unit.ownerId === account.id);

	return {
		battle,
		attackerStats,
		defenderStats,
		userUnits,
		userSide,
		userParticipants,
		canJoin:
			userSide !== null && (battle.phase === "preparation" || battle.phase === "planning" || battle.phase === "active"),
		terrainData
	};
};

export const actions: Actions = {
	assignUnit: async ({ request, params, locals }) => {
		const account = locals.account!;
		const battleId = parseInt(params.id);
		const formData = await request.formData();
		const unitId = parseInt(formData.get("unitId") as string);

		const battle = await db.query.battles.findFirst({
			where: eq(battles.id, battleId)
		});

		if (!battle || battle.phase === "ended") {
			return fail(400, { error: "Cannot join this battle" });
		}

		const unit = await db.query.militaryUnits.findFirst({
			where: and(
				eq(militaryUnits.id, unitId),
				eq(militaryUnits.ownerId, account.id),
				eq(militaryUnits.regionId, battle.regionId)
			)
		});

		if (!unit) {
			return fail(400, { error: "Unit not found or not in battle region" });
		}

		const existing = await db.query.battleParticipants.findFirst({
			where: and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.unitId, unitId))
		});

		if (existing) {
			return fail(400, { error: "Unit already in battle" });
		}

		const userResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: { region: true }
		});

		if (!userResidence) {
			return fail(400, { error: "No residence found" });
		}

		const side = userResidence.region.stateId === battle.attackerStateId ? "attacker" : "defender";

		await db.insert(battleParticipants).values({
			battleId,
			unitId,
			side,
			currentStrength: unit.health || 100,
			currentOrganization: unit.organization || 100,
			maxStrength: 100
		});

		return { success: true };
	},

	executeCombatRound: async ({ params, locals }) => {
		const account = locals.account!;
		const battleId = parseInt(params.id);

		const battle = await db.query.battles.findFirst({
			where: eq(battles.id, battleId)
		});

		if (!battle || battle.phase === "ended") {
			return fail(400, { error: "Battle is not active" });
		}

		if (battle.phase === "preparation") {
			return fail(400, { error: "Battle is still in preparation phase" });
		}

		await processCombatRound(battleId, battle.terrain, battle.phase);

		// Increment planning bonus if in planning/active phase
		if (battle.phase === "planning" || battle.phase === "active") {
			await db
				.update(battles)
				.set({
					attackerPlanningBonus: Math.min(50, battle.attackerPlanningBonus + 2),
					defenderPlanningBonus: Math.min(50, battle.defenderPlanningBonus + 2)
				})
				.where(eq(battles.id, battleId));
		}

		return { success: true };
	},

	startPlanning: async ({ params, locals }) => {
		const account = locals.account!;
		const battleId = parseInt(params.id);

		const battle = await db.query.battles.findFirst({
			where: eq(battles.id, battleId)
		});

		if (!battle || battle.phase !== "preparation") {
			return fail(400, { error: "Cannot start planning now" });
		}

		// Check if user is battle starter or has authority
		if (battle.startedBy !== account.id) {
			return fail(403, { error: "Not authorized" });
		}

		await db
			.update(battles)
			.set({
				phase: "planning",
				planningStartedAt: new Date()
			})
			.where(eq(battles.id, battleId));

		return { success: true };
	}
};
