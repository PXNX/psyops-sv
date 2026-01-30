// src/routes/(authenticated)/api/cron/battles/+server.ts

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { battles, battleParticipants, battleRounds, militaryUnits, regions, states, wars } from "$lib/server/schema";
import { eq, and, sql, count, asc } from "drizzle-orm";
import { MILITARY_UNIT_TEMPLATES } from "$lib/config/militaryUnits";

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

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let phasesTransitioned = 0;
		let roundsProcessed = 0;
		let battlesEnded = 0;
		let failed = 0;

		// 1. Find preparation phase battles that should transition to active
		const preparationBattles = await db.query.battles.findMany({
			where: eq(battles.phase, "preparation")
		});

		for (const battle of preparationBattles) {
			try {
				const preparationEndsAt = new Date(battle.startedAt);
				preparationEndsAt.setHours(preparationEndsAt.getHours() + PREPARATION_HOURS);

				if (now >= preparationEndsAt) {
					await db.update(battles).set({ phase: "active" }).where(eq(battles.id, battle.id));
					phasesTransitioned++;
					console.log(`✅ Transitioned battle ${battle.id} to active phase`);
				}
			} catch (error) {
				failed++;
				console.error(`❌ Failed to transition battle ${battle.id}:`, error);
			}
		}

		// 2. Process active battles - execute combat rounds
		const activeBattles = await db.query.battles.findMany({
			where: eq(battles.phase, "active")
		});

		for (const battle of activeBattles) {
			try {
				const result = await processCombatRound(battle.id);
				if (result.battleEnded) {
					battlesEnded++;
					console.log(`🏁 Battle ${battle.id} ended - Winner: ${result.winner}`);
				} else {
					roundsProcessed++;
					console.log(`⚔️ Processed combat round ${result.roundNumber} for battle ${battle.id}`);
				}
			} catch (error) {
				failed++;
				console.error(`❌ Failed to process combat round for battle ${battle.id}:`, error);
			}
		}

		return json({
			success: true,
			timestamp: now.toISOString(),
			phasesTransitioned,
			roundsProcessed,
			battlesEnded,
			failed,
			totalProcessed: phasesTransitioned + roundsProcessed
		});
	} catch (error) {
		console.error("Battle cron job error:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
};

// Select units that fit in combat width, prioritizing earliest joined
function selectEngagedUnits(participants: any[], maxWidth: number): any[] {
	const available = participants.filter((p) => p.currentStrength > 0);
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

async function processCombatRound(battleId: number) {
	const battle = await db.query.battles.findFirst({
		where: eq(battles.id, battleId),
		with: {
			region: true,
			participants: {
				with: { unit: true },
				orderBy: asc(battleParticipants.joinedAt)
			}
		}
	});

	if (!battle) {
		throw new Error(`Battle ${battleId} not found`);
	}

	const terrainData = TERRAIN_DATA[battle.terrain as keyof typeof TERRAIN_DATA];

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

	// Get round number
	const existingRounds = await db
		.select({ count: count() })
		.from(battleRounds)
		.where(eq(battleRounds.battleId, battleId));
	const roundNumber = (existingRounds[0]?.count || 0) + 1;

	// Calculate damage
	let attackerTotalDamage = 0;
	let defenderTotalDamage = 0;

	for (const attacker of engagedAttackers) {
		attackerTotalDamage += attacker.unit.attack || MILITARY_UNIT_TEMPLATES[attacker.unit.unitType].baseAttack || 0;
	}

	for (const defender of engagedDefenders) {
		defenderTotalDamage += defender.unit.defense || MILITARY_UNIT_TEMPLATES[defender.unit.unitType].baseDefense || 0;
	}

	// Apply fortification
	const fortificationLevel = battle.region.fortifications || 0;
	const fortificationReduction = Math.min(50, fortificationLevel * 2);
	const defenderDamageReduction = 1 - fortificationReduction / 100;
	const adjustedAttackerDamage = Math.floor(attackerTotalDamage * defenderDamageReduction);

	// Create round record
	await db.insert(battleRounds).values({
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
	});

	// Apply damage to attackers
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

		await db.update(militaryUnits).set({ health: newStrength }).where(eq(militaryUnits.id, attacker.unitId));
	}

	// Apply damage to defenders
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

	let battleEnded = false;
	let winner: "attacker" | "defender" | null = null;

	if (remainingAttackers[0].count === 0) {
		await db
			.update(battles)
			.set({ status: "defender_won", phase: "ended", endedAt: new Date() })
			.where(eq(battles.id, battleId));
		battleEnded = true;
		winner = "defender";
	} else if (remainingDefenders[0].count === 0) {
		// Attacker wins - transfer region and check for capitulation
		const capturedRegion = await db.query.regions.findFirst({
			where: eq(regions.id, battle.regionId),
			with: {
				state: true
			}
		});

		if (!capturedRegion) {
			throw new Error(`Region ${battle.regionId} not found`);
		}

		const previousStateId = capturedRegion.stateId;

		// Transfer region to attacker
		await db.update(regions).set({ stateId: battle.attackerStateId }).where(eq(regions.id, battle.regionId));

		// Check if the defending state has any regions left
		const remainingRegions = await db
			.select({ count: count() })
			.from(regions)
			.where(eq(regions.stateId, previousStateId!));

		// Get war info to check bloc membership
		const warInfo = await db.query.wars.findFirst({
			where: eq(wars.id, battle.warId),
			with: {
				defender: {
					with: {
						bloc: true
					}
				},
				defenderBloc: true
			}
		});

		if (!warInfo) {
			throw new Error(`War ${battle.warId} not found`);
		}

		// If state lost its last region
		if (remainingRegions[0].count === 0) {
			// Mark state as capitulated
			await db
				.update(states)
				.set({
					capitulated: true,
					capitulatedAt: new Date()
				})
				.where(eq(states.id, previousStateId!));

			console.log(`  🏳️ State ${previousStateId} has been capitulated (lost all regions)`);

			// Check if this was part of a bloc war
			if (warInfo.defenderBlocId) {
				// Check if any defender bloc states still have regions
				const blocStatesWithRegions = await db
					.select({
						stateId: states.id,
						regionCount: sql<number>`(SELECT COUNT(*) FROM ${regions} WHERE ${regions.stateId} = ${states.id})`
					})
					.from(states)
					.where(and(eq(states.blocId, warInfo.defenderBlocId), eq(states.capitulated, false)));

				const anyBlocStateHasRegions = blocStatesWithRegions.some((s) => Number(s.regionCount) > 0);

				if (!anyBlocStateHasRegions) {
					// Entire defending bloc has been defeated
					await db
						.update(wars)
						.set({
							status: "ended",
							endedAt: new Date()
						})
						.where(eq(wars.id, battle.warId));

					console.log(`  🏁 War ${battle.warId} ended - defending bloc completely defeated`);
				} else {
					console.log(`  ⚠️ State capitulated but war continues (other bloc members still have regions)`);
				}
			} else {
				// Not a bloc war - single state has been defeated
				await db
					.update(wars)
					.set({
						status: "ended",
						endedAt: new Date()
					})
					.where(eq(wars.id, battle.warId));

				console.log(`  🏁 War ${battle.warId} ended - defender completely defeated`);
			}
		}

		await db
			.update(battles)
			.set({ status: "attacker_won", phase: "ended", endedAt: new Date() })
			.where(eq(battles.id, battleId));
		battleEnded = true;
		winner = "attacker";
	}

	return {
		roundNumber,
		battleEnded,
		winner
	};
}
