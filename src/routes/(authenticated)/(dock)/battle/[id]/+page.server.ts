// src/routes/(authenticated)/(dock)/battle/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	battles,
	battleParticipants,
	battleRounds,
	militaryUnits,
	wars,
	regions,
	states,
	accounts,
	userProfiles,
	residences
} from "$lib/server/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "../$types";
import { error, fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const battleId = parseInt(params.id);

	if (isNaN(battleId)) {
		throw error(400, "Invalid battle ID");
	}

	// Get battle with all details
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
				with: {
					attackingUnit: {
						with: {
							owner: {
								with: {
									profile: true
								}
							}
						}
					},
					defendingUnit: {
						with: {
							owner: {
								with: {
									profile: true
								}
							}
						}
					}
				},
				orderBy: desc(battleRounds.roundedAt),
				limit: 50
			}
		}
	});

	if (!battle) {
		throw error(404, "Battle not found");
	}

	// Get user's residence to check if they can participate
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

	// Get user's available units in this region
	const userUnits = await db.query.militaryUnits.findMany({
		where: and(
			eq(militaryUnits.ownerId, account.id),
			eq(militaryUnits.regionId, battle.regionId),
			sql`${militaryUnits.id} NOT IN (SELECT unit_id FROM ${battleParticipants} WHERE battle_id = ${battleId})`
		)
	});

	// Calculate battle statistics
	const attackerParticipants = battle.participants.filter((p) => p.side === "attacker");
	const defenderParticipants = battle.participants.filter((p) => p.side === "defender");

	const attackerStats = {
		totalUnits: attackerParticipants.length,
		activeUnits: attackerParticipants.filter((p) => p.currentHealth > 0 && p.currentOrganization > 0).length,
		totalDamageDealt: attackerParticipants.reduce((sum, p) => sum + p.damageDealt, 0),
		totalDamageTaken: attackerParticipants.reduce((sum, p) => sum + p.damageTaken, 0),
		destroyedUnits: attackerParticipants.filter((p) => p.currentHealth === 0).length
	};

	const defenderStats = {
		totalUnits: defenderParticipants.length,
		activeUnits: defenderParticipants.filter((p) => p.currentHealth > 0 && p.currentOrganization > 0).length,
		totalDamageDealt: defenderParticipants.reduce((sum, p) => sum + p.damageDealt, 0),
		totalDamageTaken: defenderParticipants.reduce((sum, p) => sum + p.damageTaken, 0),
		destroyedUnits: defenderParticipants.filter((p) => p.currentHealth === 0).length
	};

	// Determine user's side
	let userSide: "attacker" | "defender" | null = null;
	if (userResidence?.region.stateId === battle.attackerStateId) {
		userSide = "attacker";
	} else if (userResidence?.region.stateId === battle.defenderStateId) {
		userSide = "defender";
	}

	// Check if user has units in battle
	const userParticipants = battle.participants.filter((p) => p.unit.ownerId === account.id);

	return {
		battle,
		attackerStats,
		defenderStats,
		userUnits,
		userSide,
		userParticipants,
		canParticipate: userSide !== null && battle.status === "ongoing"
	};
};

export const actions: Actions = {
	joinBattle: async ({ request, params, locals }) => {
		const account = locals.account!;
		const battleId = parseInt(params.id);
		const formData = await request.formData();
		const unitId = parseInt(formData.get("unitId") as string);

		// Verify battle exists and is ongoing
		const battle = await db.query.battles.findFirst({
			where: eq(battles.id, battleId)
		});

		if (!battle || battle.status !== "ongoing") {
			return fail(400, { error: "Battle is not active" });
		}

		// Verify unit ownership and location
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

		// Check if unit is already in battle
		const existing = await db.query.battleParticipants.findFirst({
			where: and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.unitId, unitId))
		});

		if (existing) {
			return fail(400, { error: "Unit already in battle" });
		}

		// Determine side based on unit's state
		const userResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: { region: true }
		});

		if (!userResidence) {
			return fail(400, { error: "No residence found" });
		}

		const side = userResidence.region.stateId === battle.attackerStateId ? "attacker" : "defender";

		// Add unit to battle
		await db.insert(battleParticipants).values({
			battleId,
			unitId,
			side,
			currentHealth: unit.health || 100,
			currentOrganization: unit.organization || 100
		});

		return { success: true };
	},

	attack: async ({ request, params, locals }) => {
		const account = locals.account!;
		const battleId = parseInt(params.id);
		const formData = await request.formData();
		const attackingUnitId = parseInt(formData.get("attackingUnitId") as string);
		const defendingUnitId = parseInt(formData.get("defendingUnitId") as string);

		// Verify battle is ongoing
		const battle = await db.query.battles.findFirst({
			where: eq(battles.id, battleId)
		});

		if (!battle || battle.status !== "ongoing") {
			return fail(400, { error: "Battle is not active" });
		}

		// Get both participants
		const [attacker, defender] = await Promise.all([
			db.query.battleParticipants.findFirst({
				where: and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.unitId, attackingUnitId)),
				with: {
					unit: true
				}
			}),
			db.query.battleParticipants.findFirst({
				where: and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.unitId, defendingUnitId)),
				with: {
					unit: true
				}
			})
		]);

		if (!attacker || !defender) {
			return fail(400, { error: "Invalid units" });
		}

		// Verify ownership
		if (attacker.unit.ownerId !== account.id) {
			return fail(403, { error: "Not your unit" });
		}

		// Check organization
		if (attacker.currentOrganization <= 0) {
			return fail(400, { error: "Unit has no organization" });
		}

		// Check if units are on opposite sides
		if (attacker.side === defender.side) {
			return fail(400, { error: "Cannot attack friendly units" });
		}

		// Calculate damage based on organization
		const attackerOrgMod = attacker.currentOrganization / 100;
		const defenderOrgMod = defender.currentOrganization / 100;

		const attackerDamage = Math.floor(attacker.unit.attack * attackerOrgMod * (0.8 + Math.random() * 0.4));
		const defenderDamage = Math.floor(defender.unit.defense * defenderOrgMod * (0.5 + Math.random() * 0.3));

		// Calculate organization loss
		const attackerOrgLoss = Math.floor(5 + Math.random() * 10);
		const defenderOrgLoss = Math.floor(3 + Math.random() * 7);

		// Update health and organization
		const newAttackerHealth = Math.max(0, attacker.currentHealth - defenderDamage);
		const newDefenderHealth = Math.max(0, defender.currentHealth - attackerDamage);
		const newAttackerOrg = Math.max(0, attacker.currentOrganization - attackerOrgLoss);
		const newDefenderOrg = Math.max(0, defender.currentOrganization - defenderOrgLoss);

		// Record battle round
		await db.insert(battleRounds).values({
			battleId,
			attackingUnitId,
			defendingUnitId,
			attackerDamage,
			defenderDamage,
			attackerOrganizationLoss: attackerOrgLoss,
			defenderOrganizationLoss: defenderOrgLoss
		});

		// Update participants
		await Promise.all([
			db
				.update(battleParticipants)
				.set({
					currentHealth: newAttackerHealth,
					currentOrganization: newAttackerOrg,
					damageTaken: sql`${battleParticipants.damageTaken} + ${defenderDamage}`,
					damageDealt: sql`${battleParticipants.damageDealt} + ${attackerDamage}`,
					lastActionAt: new Date()
				})
				.where(eq(battleParticipants.id, attacker.id)),
			db
				.update(battleParticipants)
				.set({
					currentHealth: newDefenderHealth,
					currentOrganization: newDefenderOrg,
					damageTaken: sql`${battleParticipants.damageTaken} + ${attackerDamage}`,
					damageDealt: sql`${battleParticipants.damageDealt} + ${defenderDamage}`
				})
				.where(eq(battleParticipants.id, defender.id))
		]);

		// Update military units if destroyed
		if (newAttackerHealth === 0) {
			await db.delete(militaryUnits).where(eq(militaryUnits.id, attackingUnitId));
		}
		if (newDefenderHealth === 0) {
			await db.delete(militaryUnits).where(eq(militaryUnits.id, defendingUnitId));
		}

		// Check if battle is over
		const remainingAttackers = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(battleParticipants)
			.where(
				and(
					eq(battleParticipants.battleId, battleId),
					eq(battleParticipants.side, "attacker"),
					sql`${battleParticipants.currentHealth} > 0`
				)
			);

		const remainingDefenders = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(battleParticipants)
			.where(
				and(
					eq(battleParticipants.battleId, battleId),
					eq(battleParticipants.side, "defender"),
					sql`${battleParticipants.currentHealth} > 0`
				)
			);

		if (remainingAttackers[0].count === 0) {
			await db.update(battles).set({ status: "defender_won", endedAt: new Date() }).where(eq(battles.id, battleId));
		} else if (remainingDefenders[0].count === 0) {
			// Transfer region to attacker
			await db.update(regions).set({ stateId: battle.attackerStateId }).where(eq(regions.id, battle.regionId));

			await db.update(battles).set({ status: "attacker_won", endedAt: new Date() }).where(eq(battles.id, battleId));
		}

		return { success: true };
	}
};
