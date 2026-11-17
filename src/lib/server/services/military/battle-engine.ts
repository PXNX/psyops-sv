// src/lib/server/services/military/battle-engine.ts
// The one combat engine: the hourly battle job and the battle page both use
// it, so rules can't drift apart again.
import { and, asc, count, eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	battleParticipants,
	battleRounds,
	battles,
	militaryUnits,
	regionBorders,
	regions,
	residences
} from "../../schema";
import {
	MILITARY_UNIT_TEMPLATES,
	calculateCombatExperienceLoss,
	getExperienceCombatModifier
} from "#lib/config/index.js";
import { selectEngagedUnits } from "./combat";
import { applyConquestDamage } from "../politics/construction.service";

/** Frontage per terrain: how much combat width each side may put in the line. */
export const TERRAIN_DATA = {
	plains: { combatWidth: 90 },
	forest: { combatWidth: 84 },
	hills: { combatWidth: 80 },
	mountain: { combatWidth: 75 },
	urban: { combatWidth: 96 },
	desert: { combatWidth: 90 },
	jungle: { combatWidth: 84 }
} as const;
export type Terrain = keyof typeof TERRAIN_DATA;

/** Hours between a battle starting and its first combat round. */
export const PREPARATION_HOURS = 24;

/** Fortification level → % less damage the defenders take (2% per level, max 50%). */
export const fortificationReduction = (level: number) => Math.min(50, Math.max(0, level) * 2);

export interface RoundResult {
	roundNumber: number;
	attackerDamage: number;
	defenderDamage: number;
	battleEnded: boolean;
	winner: "attacker" | "defender" | null;
	/** Region levels destroyed when the attacker took the region. */
	buildingsDestroyed: Partial<Record<string, number>> | null;
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Fight one round of an active battle, all in one transaction: engaged units
 * deal damage (attack/defence × experience), the defenders' losses are cut by
 * fortifications, casualties cost organisation and experience, and the
 * battle ends when one side has nothing left standing (the region changes
 * hands if the attackers win). Returns null if the battle isn't active.
 */
export async function processCombatRound(db: Database, battleId: number): Promise<RoundResult | null> {
	return db.transaction(async (tx) => {
		// Lock the battle row so two rounds can never run at the same time.
		const [locked] = await tx
			.select({ phase: battles.phase })
			.from(battles)
			.where(eq(battles.id, battleId))
			.for("update");
		if (!locked || locked.phase !== "active") return null;

		const battle = await tx.query.battles.findFirst({
			where: eq(battles.id, battleId),
			with: { region: true, participants: { with: { unit: true }, orderBy: asc(battleParticipants.joinedAt) } }
		});
		if (!battle) return null;

		const width = TERRAIN_DATA[battle.terrain as Terrain]?.combatWidth ?? TERRAIN_DATA.plains.combatWidth;
		const attackers = selectEngagedUnits(
			battle.participants.filter((p) => p.side === "attacker"),
			width
		);
		const defenders = selectEngagedUnits(
			battle.participants.filter((p) => p.side === "defender"),
			width
		);

		await tx.update(battleParticipants).set({ isEngaged: false }).where(eq(battleParticipants.battleId, battleId));
		const engagedIds = [...attackers, ...defenders].map((p) => p.id);
		if (engagedIds.length) {
			await tx.update(battleParticipants).set({ isEngaged: true }).where(inArray(battleParticipants.id, engagedIds));
		}

		// Each engaged unit's output this round.
		const output = (p: (typeof attackers)[number], stat: "baseAttack" | "baseDefense") =>
			Math.floor(
				(MILITARY_UNIT_TEMPLATES[p.unit.unitType]?.[stat] ?? 0) * getExperienceCombatModifier(p.unit.experience ?? 0)
			);
		const fortLevel = battle.region.fortifications ?? 0;
		const fortFactor = 1 - fortificationReduction(fortLevel) / 100;
		const attackerOutput = attackers.map((p) => Math.floor(output(p, "baseAttack") * fortFactor));
		const defenderOutput = defenders.map((p) => output(p, "baseDefense"));
		const attackerDamage = attackerOutput.reduce((a, b) => a + b, 0);
		const defenderDamage = defenderOutput.reduce((a, b) => a + b, 0);

		const [{ value: previousRounds }] = await tx
			.select({ value: count() })
			.from(battleRounds)
			.where(eq(battleRounds.battleId, battleId));
		const roundNumber = previousRounds + 1;
		await tx.insert(battleRounds).values({
			battleId,
			roundNumber,
			battlePhase: battle.phase,
			attackerUnitsEngaged: attackers.length,
			defenderUnitsEngaged: defenders.length,
			attackerTotalDamage: attackerDamage,
			defenderTotalDamage: defenderDamage,
			attackerOrgLoss: 0,
			defenderOrgLoss: 0,
			attackerPlanningBonus: 0,
			defenderPlanningBonus: fortLevel
		});

		// Credit each unit with the damage it dealt.
		const credit = async (units: typeof attackers, amounts: number[]) => {
			for (const [i, p] of units.entries()) {
				if (amounts[i]) {
					await tx
						.update(battleParticipants)
						.set({ damageDealt: sql`${battleParticipants.damageDealt} + ${amounts[i]}`, lastActionAt: new Date() })
						.where(eq(battleParticipants.id, p.id));
				}
			}
		};
		await credit(attackers, attackerOutput);
		await credit(defenders, defenderOutput);

		// Damage hits the earliest-deployed engaged units first.
		await applyDamage(tx, defenders, attackerDamage);
		await applyDamage(tx, attackers, defenderDamage);

		// Victory: one side has nothing left standing.
		const standing = async (side: "attacker" | "defender") =>
			(
				await tx
					.select({ value: count() })
					.from(battleParticipants)
					.where(
						and(
							eq(battleParticipants.battleId, battleId),
							eq(battleParticipants.side, side),
							sql`${battleParticipants.currentStrength} > 0`
						)
					)
			)[0]!.value;
		const [attackersLeft, defendersLeft] = [await standing("attacker"), await standing("defender")];

		let winner: RoundResult["winner"] = null;
		if (attackersLeft === 0) winner = "defender";
		else if (defendersLeft === 0) winner = "attacker";

		if (winner) {
			let buildingsDestroyed: Partial<Record<string, number>> | null = null;
			if (winner === "attacker") {
				// The fighting wrecks part of what was built there.
				const { losses } = await applyConquestDamage(tx, battle.regionId);
				if (Object.keys(losses).length) buildingsDestroyed = losses;
				await tx.update(regions).set({ stateId: battle.attackerStateId }).where(eq(regions.id, battle.regionId));
			}
			await tx
				.update(battles)
				.set({
					status: winner === "attacker" ? "attacker_won" : "defender_won",
					phase: "ended",
					endedAt: new Date(),
					buildingsDestroyed
				})
				.where(eq(battles.id, battleId));
			return { roundNumber, attackerDamage, defenderDamage, battleEnded: true, winner, buildingsDestroyed };
		}

		return { roundNumber, attackerDamage, defenderDamage, battleEnded: false, winner, buildingsDestroyed: null };
	});
}

async function applyDamage(
	tx: Tx,
	targets: {
		id: number;
		unitId: number;
		currentStrength: number;
		currentOrganization: number;
		unit: { experience: number | null };
	}[],
	damage: number
) {
	let left = damage;
	for (const t of targets) {
		if (left <= 0) break;
		const taken = Math.min(left, t.currentStrength);
		left -= taken;
		const strength = Math.max(0, t.currentStrength - taken);
		const organization = Math.max(0, t.currentOrganization - Math.floor(taken / 2));
		// Casualties dilute experience: veterans lost, green replacements.
		const exp = t.unit.experience ?? 0;
		const experience = Math.max(0, exp - calculateCombatExperienceLoss(exp, taken));
		await tx
			.update(battleParticipants)
			.set({
				currentStrength: strength,
				currentOrganization: organization,
				damageTaken: sql`${battleParticipants.damageTaken} + ${taken}`,
				...(strength === 0 ? { destroyedAt: new Date() } : {})
			})
			.where(eq(battleParticipants.id, t.id));
		await tx
			.update(militaryUnits)
			.set({ health: strength, organization, experience })
			.where(eq(militaryUnits.id, t.unitId));
	}
}

export interface SideEligibility {
	side: "attacker" | "defender" | null;
	/** Why the user can't fight here (null when they can). */
	reason: string | null;
	/** Region the user's units must be in to deploy. */
	deployFromRegionId: number | null;
}

/**
 * Which side a user may fight on: defenders are citizens of the defending
 * state standing in the battle region; attackers are citizens of the attacking
 * state standing in a region that borders it.
 */
export async function battleSide(
	db: Database,
	userId: string,
	battle: { regionId: number; attackerStateId: number; defenderStateId: number }
): Promise<SideEligibility> {
	const residence = await db.query.residences.findFirst({
		where: eq(residences.userId, userId),
		with: { region: true }
	});
	if (!residence) return { side: null, reason: "You have no residence yet.", deployFromRegionId: null };

	if (residence.regionId === battle.regionId) {
		return residence.region.stateId === battle.defenderStateId
			? { side: "defender", reason: null, deployFromRegionId: battle.regionId }
			: {
					side: null,
					reason: "You're in the battle region, but not a citizen of the defending state.",
					deployFromRegionId: null
				};
	}

	const [border] = await db
		.select({ id: regionBorders.id })
		.from(regionBorders)
		.where(
			or(
				and(eq(regionBorders.regionId, residence.regionId), eq(regionBorders.neighborId, battle.regionId)),
				and(eq(regionBorders.regionId, battle.regionId), eq(regionBorders.neighborId, residence.regionId))
			)
		)
		.limit(1);
	if (!border) {
		return {
			side: null,
			reason: "To attack, travel to a region that borders the battle; to defend, travel into it.",
			deployFromRegionId: null
		};
	}
	return residence.region.stateId === battle.attackerStateId
		? { side: "attacker", reason: null, deployFromRegionId: residence.regionId }
		: {
				side: null,
				reason: "Your region borders the battle, but you aren't a citizen of the attacking state.",
				deployFromRegionId: null
			};
}
