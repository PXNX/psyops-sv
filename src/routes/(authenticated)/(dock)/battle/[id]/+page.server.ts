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
	residences,
	regionBorders
} from "$lib/server/schema";
import { eq, desc, and, sql, count, asc, or } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { error, fail } from "@sveltejs/kit";
import { MILITARY_UNIT_TEMPLATES } from "$lib/config/militaryUnits";
import { getLogoUrl } from "$lib/server/backblaze";

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
		const unitWidth = MILITARY_UNIT_TEMPLATES[unit.unitType].combatWidth!;
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
		const newOrg = Math.max(0, attacker.currentOrganization - Math.floor(damageTaken / 2)); // Org loss is half damage

		await db
			.update(battleParticipants)
			.set({
				currentStrength: newStrength,
				currentOrganization: newOrg,
				damageTaken: sql`${battleParticipants.damageTaken} + ${damageTaken}`,
				destroyedAt: newStrength === 0 ? new Date() : undefined
			})
			.where(eq(battleParticipants.id, attacker.id));

		// Update military unit health and organization
		await db
			.update(militaryUnits)
			.set({
				health: newStrength,
				organization: newOrg
			})
			.where(eq(militaryUnits.id, attacker.unitId));
	}

	// Damage to defenders (reduced by fortifications)
	let remainingAttackerDamage = adjustedAttackerDamage;
	for (const defender of engagedDefenders) {
		if (remainingAttackerDamage <= 0) break;

		const damageTaken = Math.min(remainingAttackerDamage, defender.currentStrength);
		remainingAttackerDamage -= damageTaken;

		const newStrength = Math.max(0, defender.currentStrength - damageTaken);
		const newOrg = Math.max(0, defender.currentOrganization - Math.floor(damageTaken / 2));

		await db
			.update(battleParticipants)
			.set({
				currentStrength: newStrength,
				currentOrganization: newOrg,
				damageTaken: sql`${battleParticipants.damageTaken} + ${damageTaken}`,
				destroyedAt: newStrength === 0 ? new Date() : undefined
			})
			.where(eq(battleParticipants.id, defender.id));

		// Update military unit health and organization
		await db
			.update(militaryUnits)
			.set({
				health: newStrength,
				organization: newOrg
			})
			.where(eq(militaryUnits.id, defender.unitId));
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

	// Get state logos
	const attackerStateLogo = battle.attackerState.logo ? await getLogoUrl(battle.attackerState.logo) : null;
	const defenderStateLogo = battle.defenderState.logo ? await getLogoUrl(battle.defenderState.logo) : null;

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

	// Determine user side based on region location
	let userSide: "attacker" | "defender" | null = null;
	let canJoinReason: string | null = null;

	if (!userResidence) {
		canJoinReason = "No residence found";
	} else {
		// Check if user can defend (residence is in battle region)
		if (userResidence.regionId === battle.regionId) {
			// User is in the battle region
			if (userResidence.region.stateId === battle.defenderStateId) {
				userSide = "defender";
			} else {
				canJoinReason = "You are in the battle region but not a citizen of the defending state";
			}
		} else {
			// Check if user can attack (residence borders battle region)
			const borderingRegion = await db.query.regionBorders.findFirst({
				where: or(
					and(eq(regionBorders.regionId, userResidence.regionId), eq(regionBorders.neighborId, battle.regionId)),
					and(eq(regionBorders.regionId, battle.regionId), eq(regionBorders.neighborId, userResidence.regionId))
				)
			});

			if (borderingRegion) {
				// User's region borders the battle region
				if (userResidence.region.stateId === battle.attackerStateId) {
					userSide = "attacker";
				} else {
					canJoinReason = "Your region borders the battle but you are not a citizen of the attacking state";
				}
			} else {
				canJoinReason = "Your region does not border the battle region";
			}
		}
	}

	// Get all user units in the correct region
	const relevantRegionId = userSide === "defender" ? battle.regionId : userResidence?.regionId;

	let allUserUnitsInRegion: any[] = [];
	if (relevantRegionId) {
		allUserUnitsInRegion = await db.query.militaryUnits.findMany({
			where: and(eq(militaryUnits.ownerId, account.id), eq(militaryUnits.regionId, relevantRegionId))
		});
	}

	// Get units already in this battle
	const unitsInBattle = await db
		.select({ unitId: battleParticipants.unitId })
		.from(battleParticipants)
		.where(eq(battleParticipants.battleId, battleId));

	const unitsInBattleIds = new Set(unitsInBattle.map((u) => u.unitId));

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

	const terrainData = TERRAIN_DATA[battle.terrain as keyof typeof TERRAIN_DATA];

	const attackerParticipants = battle.participants.filter((p) => p.side === "attacker");
	const defenderParticipants = battle.participants.filter((p) => p.side === "defender");

	const engagedAttackers = attackerParticipants.filter((p) => p.isEngaged);
	const engagedDefenders = defenderParticipants.filter((p) => p.isEngaged);

	const attackerStats = {
		totalUnits: attackerParticipants.length,
		activeUnits: attackerParticipants.filter((p) => p.currentStrength > 0).length,
		engagedUnits: engagedAttackers.length,
		combatWidth: engagedAttackers.reduce((sum, p) => sum + MILITARY_UNIT_TEMPLATES[p.unit.unitType].combatWidth, 0),
		maxCombatWidth: terrainData.combatWidth,
		totalDamageDealt: attackerParticipants.reduce((sum, p) => sum + p.damageDealt, 0),
		totalDamageTaken: attackerParticipants.reduce((sum, p) => sum + p.damageTaken, 0),
		destroyedUnits: attackerParticipants.filter((p) => p.currentStrength === 0).length
	};

	const defenderStats = {
		totalUnits: defenderParticipants.length,
		activeUnits: defenderParticipants.filter((p) => p.currentStrength > 0).length,
		engagedUnits: engagedDefenders.length,
		combatWidth: engagedDefenders.reduce((sum, p) => sum + MILITARY_UNIT_TEMPLATES[p.unit.unitType].combatWidth, 0),
		maxCombatWidth: terrainData.combatWidth,
		totalDamageDealt: defenderParticipants.reduce((sum, p) => sum + p.damageDealt, 0),
		totalDamageTaken: defenderParticipants.reduce((sum, p) => sum + p.damageTaken, 0),
		destroyedUnits: defenderParticipants.filter((p) => p.currentStrength === 0).length
	};

	const userParticipants = battle.participants.filter((p) => p.unit.ownerId === account.id);

	// Determine final canJoin status and reason
	let canJoin = false;
	let finalCanJoinReason = canJoinReason;

	if (battle.phase === "ended") {
		finalCanJoinReason = "Battle has ended";
	} else if (userSide === null) {
		// canJoinReason already set above
	} else if (userUnits.length === 0) {
		finalCanJoinReason = `No eligible units in region #${relevantRegionId}`;
	} else {
		canJoin = true;
		finalCanJoinReason = null;
	}

	return {
		battle,
		attackerStats,
		defenderStats,
		userUnits,
		userSide,
		userParticipants,
		canJoin,
		canJoinReason: finalCanJoinReason,
		terrainData,
		preparationEndsAt,
		isPreparationOver,
		fortificationBonus: battle.region.fortifications || 0,
		userResidenceRegionId: userResidence?.regionId,
		attackerStateLogo,
		defenderStateLogo
	};
};

export const actions: Actions = {
	assignUnits: async ({ request, params, locals }) => {
		const account = locals.account!;
		const battleId = parseInt(params.id);

		const formData = await request.formData();
		const unitIds = formData.getAll("unitIds").map((id) => parseInt(id as string));

		if (unitIds.length === 0) {
			return fail(400, { error: "No units selected" });
		}

		const battle = await db.query.battles.findFirst({
			where: eq(battles.id, battleId)
		});

		if (!battle || battle.phase === "ended") {
			return fail(400, { error: "Cannot join this battle" });
		}

		const userResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id),
			with: { region: true }
		});

		if (!userResidence) {
			return fail(400, { error: "No residence found" });
		}

		let side: "attacker" | "defender";

		// Determine side based on region location
		if (userResidence.regionId === battle.regionId) {
			// User is in battle region - must defend
			if (userResidence.region.stateId === battle.defenderStateId) {
				side = "defender";
			} else {
				return fail(400, { error: "You are in the battle region but not a citizen of the defending state" });
			}
		} else {
			// User is not in battle region - check if can attack
			const borderingRegion = await db.query.regionBorders.findFirst({
				where: or(
					and(eq(regionBorders.regionId, userResidence.regionId), eq(regionBorders.neighborId, battle.regionId)),
					and(eq(regionBorders.regionId, battle.regionId), eq(regionBorders.neighborId, userResidence.regionId))
				)
			});

			if (!borderingRegion) {
				return fail(400, { error: "Your region does not border the battle region" });
			}

			if (userResidence.region.stateId === battle.attackerStateId) {
				side = "attacker";
			} else {
				return fail(400, { error: "You are not a citizen of the attacking state" });
			}
		}

		// Validate and deploy each unit
		let deployed = 0;
		const errors: string[] = [];

		for (const unitId of unitIds) {
			const unit = await db.query.militaryUnits.findFirst({
				where: and(eq(militaryUnits.id, unitId), eq(militaryUnits.ownerId, account.id))
			});

			if (!unit) {
				errors.push(`Unit ${unitId} not found or you don't own it`);
				continue;
			}

			if (unit.isTraining) {
				errors.push(`${unit.name} is still training`);
				continue;
			}

			if (!unit.health || unit.health <= 0) {
				errors.push(`${unit.name} has no strength remaining`);
				continue;
			}

			if (!unit.organization || unit.organization <= 5) {
				errors.push(`${unit.name} organization is too low`);
				continue;
			}

			const existing = await db.query.battleParticipants.findFirst({
				where: and(eq(battleParticipants.battleId, battleId), eq(battleParticipants.unitId, unitId))
			});

			if (existing) {
				errors.push(`${unit.name} already in battle`);
				continue;
			}

			// Verify unit is in correct region
			const requiredRegion = side === "defender" ? battle.regionId : userResidence.regionId;
			if (unit.regionId !== requiredRegion) {
				errors.push(`${unit.name} is not in the required region`);
				continue;
			}

			// Deploy the unit
			await db.insert(battleParticipants).values({
				battleId,
				unitId,
				side,
				currentStrength: unit.health || 100,
				currentOrganization: unit.organization || 100,
				maxStrength: 100
			});

			deployed++;
		}

		if (deployed === 0) {
			return fail(400, { error: errors.join("; ") || "Failed to deploy any units" });
		}

		return { success: true, deployed, errors: errors.length > 0 ? errors : undefined };
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
} as Actions;
