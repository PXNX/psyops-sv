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
	residences
} from "$lib/server/schema";
import { eq, desc, and, sql, count, asc } from "drizzle-orm";
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
	plains: { combatWidth: 90 },
	forest: { combatWidth: 84 },
	hills: { combatWidth: 80 },
	mountain: { combatWidth: 75 },
	urban: { combatWidth: 96 },
	desert: { combatWidth: 90 },
	jungle: { combatWidth: 84 }
};

const PREPARATION_HOURS = 24;

// Select units that fit in combat width, prioritizing earliest joined
function selectEngagedUnits(participants: any[], maxWidth: number): any[] {
	// Filter to units with health > 0
	const available = participants.filter((p) => p.currentStrength > 0);

	// Sort by join time (earliest first)
	available.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

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

// Process a combat round - simplified damage dealing
async function processCombatRound(battleId: number) {
	const battle = await db.query.battles.findFirst({
		where: eq(battles.id, battleId),
		with: {
			region: true,
			participants: {
				with: { unit: true },
				orderBy: asc(battleParticipants.joinedAt) // Earliest first
			}
		}
	});

	if (!battle) return null;

	const terrainData = TERRAIN_DATA[battle.terrain as keyof typeof TERRAIN_DATA];

	// Separate sides
	const attackerUnits = battle.participants.filter((p) => p.side === "attacker");
	const defenderUnits = battle.participants.filter((p) => p.side === "defender");

	// Select engaged units (prioritizes earliest joined)
	const engagedAttackers = selectEngagedUnits(attackerUnits, terrainData.combatWidth);
	const engagedDefenders = selectEngagedUnits(defenderUnits, terrainData.combatWidth);

	// Update engagement status
	await db.update(battleParticipants).set({ isEngaged: false }).where(eq(battleParticipants.battleId, battleId));

	for (const unit of [...engagedAttackers, ...engagedDefenders]) {
		await db.update(battleParticipants).set({ isEngaged: true }).where(eq(battleParticipants.id, unit.id));
	}

	// Get round number
	const existingRounds = await db
		.select({ count: count() })
		.from(battleRounds)
		.where(eq(battleRounds.battleId, battleId));
	const roundNumber = (existingRounds[0]?.count || 0) + 1;

	// Calculate total damage for each side
	let attackerTotalDamage = 0;
	let defenderTotalDamage = 0;

	// Attackers deal damage based on their attack stat
	for (const attacker of engagedAttackers) {
		const damage = attacker.unit.attack;
		attackerTotalDamage += damage;
	}

	// Defenders deal damage based on their defense stat
	for (const defender of engagedDefenders) {
		const damage = defender.unit.defense;
		defenderTotalDamage += damage;
	}

	// Apply fortification reduction to defender damage taken
	const fortificationLevel = battle.region.fortifications || 0;
	const fortificationReduction = Math.min(50, fortificationLevel * 2); // Max 50% reduction
	const defenderDamageReduction = 1 - fortificationReduction / 100;

	const adjustedAttackerDamage = Math.floor(attackerTotalDamage * defenderDamageReduction);

	// Create round record
	const [round] = await db
		.insert(battleRounds)
		.values({
			battleId,
			roundNumber,
			battlePhase: battle.phase,
			attackerUnitsEngaged: engagedAttackers.length,
			defenderUnitsEngaged: engagedDefenders.length,
			attackerTotalDamage: adjustedAttackerDamage,
			defenderTotalDamage: defenderTotalDamage,
			attackerOrgLoss: 0,
			defenderOrgLoss: 0,
			attackerPlanningBonus: 0,
			defenderPlanningBonus: fortificationLevel
		})
		.returning();

	// Distribute damage to engaged units sequentially (hit earliest first)

	// Damage to attackers
	let remainingDefenderDamage = defenderTotalDamage;
	for (const attacker of engagedAttackers) {
		if (remainingDefenderDamage <= 0) break;

		const damageTaken = Math.min(remainingDefenderDamage, attacker.currentStrength);
		remainingDefenderDamage -= damageTaken;

		const newStrength = Math.max(0, attacker.currentStrength - damageTaken);

		await db
			.update(battleParticipants)
			.set({
				currentStrength: newStrength,
				damageTaken: sql`${battleParticipants.damageTaken} + ${damageTaken}`,
				destroyedAt: newStrength === 0 ? new Date() : undefined
			})
			.where(eq(battleParticipants.id, attacker.id));

		// Update military unit health
		await db.update(militaryUnits).set({ health: newStrength }).where(eq(militaryUnits.id, attacker.unitId));
	}

	// Damage to defenders (reduced by fortifications)
	let remainingAttackerDamage = adjustedAttackerDamage;
	for (const defender of engagedDefenders) {
		if (remainingAttackerDamage <= 0) break;

		const damageTaken = Math.min(remainingAttackerDamage, defender.currentStrength);
		remainingAttackerDamage -= damageTaken;

		const newStrength = Math.max(0, defender.currentStrength - damageTaken);

		await db
			.update(battleParticipants)
			.set({
				currentStrength: newStrength,
				damageTaken: sql`${battleParticipants.damageTaken} + ${damageTaken}`,
				destroyedAt: newStrength === 0 ? new Date() : undefined
			})
			.where(eq(battleParticipants.id, defender.id));

		// Update military unit health
		await db.update(militaryUnits).set({ health: newStrength }).where(eq(militaryUnits.id, defender.unitId));
	}

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
			attackerState: true,
			defenderState: true,
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
				orderBy: asc(battleParticipants.joinedAt) // Show earliest first
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

	// Check if preparation phase is over
	const preparationEndsAt = new Date(battle.startedAt);
	preparationEndsAt.setHours(preparationEndsAt.getHours() + PREPARATION_HOURS);
	const isPreparationOver = new Date() >= preparationEndsAt;

	// Auto-transition to active phase if preparation is over
	if (battle.phase === "preparation" && isPreparationOver) {
		await db.update(battles).set({ phase: "active" }).where(eq(battles.id, battleId));
		battle.phase = "active";
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

	console.log("=== BATTLE DEPLOYMENT DEBUG ===");
	console.log("User ID:", account.id);
	console.log("User residence:", userResidence?.regionId, "State:", userResidence?.region?.stateId);
	console.log("Battle region:", battle.regionId);
	console.log("Attacker state:", battle.attackerStateId);
	console.log("Defender state:", battle.defenderStateId);

	// Get all user units in the battle region
	const allUserUnitsInRegion = await db.query.militaryUnits.findMany({
		where: and(eq(militaryUnits.ownerId, account.id), eq(militaryUnits.regionId, battle.regionId))
	});

	console.log("Total user units in battle region:", allUserUnitsInRegion.length);
	allUserUnitsInRegion.forEach((u) => {
		console.log(`  - ${u.name}: training=${u.isTraining}, health=${u.health}, org=${u.organization}`);
	});

	// Get units already in this battle
	const unitsInBattle = await db
		.select({ unitId: battleParticipants.unitId })
		.from(battleParticipants)
		.where(eq(battleParticipants.battleId, battleId));

	const unitsInBattleIds = new Set(unitsInBattle.map((u) => u.unitId));
	console.log("Units already in battle:", unitsInBattleIds.size);

	// Filter to available units
	const userUnits = allUserUnitsInRegion.filter(
		(unit) =>
			!unitsInBattleIds.has(unit.id) &&
			!unit.isTraining &&
			unit.health &&
			unit.health > 0 &&
			unit.organization &&
			unit.organization > 5
	);

	console.log("Eligible units after filtering:", userUnits.length);
	console.log("Filter reasons:");
	allUserUnitsInRegion.forEach((u) => {
		if (unitsInBattleIds.has(u.id)) console.log(`  - ${u.name}: Already in battle`);
		else if (u.isTraining) console.log(`  - ${u.name}: Is training`);
		else if (!u.health || u.health <= 0) console.log(`  - ${u.name}: No health (${u.health})`);
		else if (!u.organization || u.organization <= 5) console.log(`  - ${u.name}: Low org (${u.organization})`);
		else console.log(`  - ${u.name}: ✓ ELIGIBLE`);
	});
	console.log("=== END DEBUG ===");

	const terrainData = TERRAIN_DATA[battle.terrain as keyof typeof TERRAIN_DATA];

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
		destroyedUnits: attackerParticipants.filter((p) => p.currentStrength === 0).length
	};

	const defenderStats = {
		totalUnits: defenderParticipants.length,
		activeUnits: defenderParticipants.filter((p) => p.currentStrength > 0).length,
		engagedUnits: engagedDefenders.length,
		combatWidth: engagedDefenders.reduce((sum, p) => sum + (UNIT_COMBAT_WIDTH[p.unit.unitType] || 2), 0),
		maxCombatWidth: terrainData.combatWidth,
		totalDamageDealt: defenderParticipants.reduce((sum, p) => sum + p.damageDealt, 0),
		totalDamageTaken: defenderParticipants.reduce((sum, p) => sum + p.damageTaken, 0),
		destroyedUnits: defenderParticipants.filter((p) => p.currentStrength === 0).length
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
		canJoin: userSide !== null && userUnits.length > 0 && battle.phase !== "ended",
		terrainData,
		preparationEndsAt,
		isPreparationOver,
		fortificationBonus: battle.region.fortifications || 0
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
			where: and(eq(militaryUnits.id, unitId), eq(militaryUnits.ownerId, account.id))
		});

		if (!unit) {
			return fail(400, { error: "Unit not found or you don't own it" });
		}

		if (unit.regionId !== battle.regionId) {
			return fail(400, { error: `Unit must be in the battle region` });
		}

		if (unit.isTraining) {
			return fail(400, { error: "Unit is still training" });
		}

		if (!unit.health || unit.health <= 0) {
			return fail(400, { error: "Unit has no strength remaining" });
		}

		if (!unit.organization || unit.organization <= 5) {
			return fail(400, { error: "Unit organization is too low" });
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

		let side: "attacker" | "defender";
		if (userResidence.region.stateId === battle.attackerStateId) {
			side = "attacker";
		} else if (userResidence.region.stateId === battle.defenderStateId) {
			side = "defender";
		} else {
			return fail(400, { error: "You are not a citizen of either warring state" });
		}

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
		const battleId = parseInt(params.id);

		const battle = await db.query.battles.findFirst({
			where: eq(battles.id, battleId)
		});

		if (!battle || battle.phase === "ended") {
			return fail(400, { error: "Battle is not active" });
		}

		if (battle.phase === "preparation") {
			return fail(400, { error: "Battle is still in preparation phase (24h)" });
		}

		await processCombatRound(battleId);

		return { success: true };
	}
};
