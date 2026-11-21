// src/lib/server/services/military/naval.ts
// Naval and amphibious operations against the database: who may order them,
// what the planner shows, launching one (pay, roll, apply effects) and the
// blockade state other systems read.
//
// Blockades and minefields are read on demand (their rows carry an expiry),
// so no cron is needed. Amphibious assaults open a normal battle with the
// `amphibious` flag set, so the existing battle engine fights it.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, desc, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	battleParticipants,
	battles,
	governmentBudgetTransactions,
	militaryUnits,
	navalBlockades,
	navalOperations,
	presidents,
	ministers,
	regions,
	stateEnergy,
	stateTreasury,
	states,
	wars,
	type NavalDamage
} from "../../schema";
import {
	AMPHIBIOUS,
	BOMBARDMENT,
	NAVAL_FUEL_PER_OP,
	NAVAL_OPS,
	RAID,
	amphibiousPenalty,
	blockadeEffects,
	blockadeStrength,
	canAmphibiousAssault,
	isCoastal,
	navalSuccessChance,
	raidHaul,
	seaControlPoints,
	seaControlStrength,
	type BlockadeEffects,
	type NavalOpKind
} from "#lib/config/index.js";
import { regionPopulation, regionTerrain } from "#lib/config/index.js";
import { enemiesOf, sideOf } from "./recon";
import { hasCasusBelli } from "./state-effects";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3600_000;
const NAVAL_TYPES = ["frigate", "submarine", "carrier", "landing_ship"] as const;

export class NavalOpError extends Error {}

export type NavalRole = "president" | "defense";
export const NAVAL_ROLE_LABEL: Record<NavalRole, string> = {
	president: "President",
	defense: "Minister of Defence"
};

/** The state a player may command at sea: as president or defence minister. */
export async function navalAuthority(db: Db, userId: string): Promise<{ stateId: number; role: NavalRole } | null> {
	const [president] = await db
		.select({ stateId: presidents.stateId })
		.from(presidents)
		.where(eq(presidents.userId, userId))
		.limit(1);
	if (president) return { stateId: president.stateId, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId })
		.from(ministers)
		.where(and(eq(ministers.userId, userId), eq(ministers.ministry, "defense")))
		.limit(1);
	return minister ? { stateId: minister.stateId, role: "defense" } : null;
}

export interface FleetUnit {
	id: number;
	name: string;
	unitType: string;
	regionId: number;
	health: number;
	organization: number;
	isTraining: boolean;
}

/** A state's hulls and marines that are ready for sea. */
export async function navalFleet(db: Db, stateId: number): Promise<FleetUnit[]> {
	const rows = await db
		.select({
			id: militaryUnits.id,
			name: militaryUnits.name,
			unitType: militaryUnits.unitType,
			regionId: militaryUnits.regionId,
			health: militaryUnits.health,
			organization: militaryUnits.organization,
			isTraining: militaryUnits.isTraining
		})
		.from(militaryUnits)
		.where(and(eq(militaryUnits.stateId, stateId), eq(militaryUnits.isTraining, false)));
	return rows;
}

/** Sea-control points a state can put to sea right now (health-weighted). */
export async function seaControlOf(db: Db, stateId: number): Promise<number> {
	const fleet = await navalFleet(db, stateId);
	return fleet.reduce((sum, u) => {
		const base = seaControlPoints([u.unitType]);
		return sum + Math.round(base * Math.max(0, Math.min(1, u.health / 100)));
	}, 0);
}

/** Air power a state can bring to a naval fight (fighters, bombers, carriers, air defence). */
export async function airPowerOf(db: Db, stateId: number): Promise<number> {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(militaryUnits)
		.where(
			and(
				eq(militaryUnits.stateId, stateId),
				eq(militaryUnits.isTraining, false),
				inArray(militaryUnits.unitType, ["fighter_squadron", "bomber_squadron", "air_defence", "carrier"])
			)
		);
	return row?.n ?? 0;
}

/** The strongest active blockade on `stateId` (0 when none). */
export async function blockadeStrengthOn(db: Db, stateId: number, now = new Date()): Promise<number> {
	const [row] = await db
		.select({ strength: sql<number>`coalesce(max(${navalBlockades.strength}), 0)::int` })
		.from(navalBlockades)
		.where(
			and(eq(navalBlockades.targetStateId, stateId), lte(navalBlockades.startsAt, now), gt(navalBlockades.expiresAt, now))
		);
	return Math.min(1, Math.max(0, (row?.strength ?? 0) / 100));
}

/** What a blockade does to the target state right now. */
export async function blockadeEffectsOn(db: Db, stateId: number, now = new Date()): Promise<BlockadeEffects> {
	return blockadeEffects(await blockadeStrengthOn(db, stateId, now));
}

/** Whether the state is currently blockaded. */
export async function isBlockaded(db: Db, stateId: number, now = new Date()): Promise<boolean> {
	return (await blockadeStrengthOn(db, stateId, now)) > 0;
}

/** Active minefields around a region (the state that laid them, 0-1 strength). */
export async function minefieldsAt(db: Db, regionId: number, now = new Date()): Promise<number> {
	const rows = await db
		.select({ strength: navalOperations.strength })
		.from(navalOperations)
		.where(
			and(
				eq(navalOperations.regionId, regionId),
				eq(navalOperations.kind, "minelaying"),
				eq(navalOperations.outcome, "success"),
				gt(navalOperations.createdAt, new Date(now.getTime() - NAVAL_OPS.minelaying.durationHours * HOUR))
			)
		);
	return rows.length ? Math.min(1, Math.max(...rows.map((r) => r.strength)) / 100) : 0;
}

// ── Planner ─────────────────────────────────────────────────────────────────

export interface NavalTarget {
	id: number;
	name: string;
	/** How many of our hulls are ready. */
	fleet: number;
	seaControl: number;
	atWar: boolean;
}

/** States a naval operation can be planned against, with the odds inputs. */
export async function navalTargets(db: Db, stateId: number, now = new Date()): Promise<NavalTarget[]> {
	const side = await sideOf(db, stateId);
	const enemies = await enemiesOf(db, side);
	const all = await db.select({ id: states.id, name: states.name }).from(states);
	const out: NavalTarget[] = [];
	for (const s of all) {
		if (s.id === stateId) continue;
		const atWar = enemies.has(s.id);
		const casus = atWar || (await hasCasusBelli(db, stateId, s.id, now));
		out.push({ id: s.id, name: s.name, fleet: 0, seaControl: 0, atWar: casus });
	}
	return out;
}

export interface LaunchNavalInput {
	stateId: number;
	orderedBy: string;
	kind: NavalOpKind;
	targetStateId?: number | null;
	regionId?: number | null;
	/** Seeded rng for tests; defaults to Math.random. */
	rng?: () => number;
	now?: Date;
}

export interface NavalLaunchResult {
	operationId: number;
	kind: NavalOpKind;
	succeeded: boolean;
	message: string;
	damage: NavalDamage;
	strength: number;
}

/**
 * Launch a naval operation. Pays from the treasury, checks the fleet, rolls
 * the outcome and applies it in one transaction. Throws NavalOpError with a
 * player-readable reason when the operation is not allowed.
 */
export async function launchNavalOperation(db: Database, input: LaunchNavalInput): Promise<NavalLaunchResult> {
	const now = input.now ?? new Date();
	const rng = input.rng ?? Math.random;
	const spec = NAVAL_OPS[input.kind];
	if (!spec) throw new NavalOpError("Unknown naval operation.");

	return db.transaction(async (tx) => {
		const [state] = await tx.select({ name: states.name, blocId: states.blocId }).from(states).where(eq(states.id, input.stateId));
		if (!state) throw new NavalOpError("That state doesn't exist.");

		// Target validation.
		let targetStateId = input.targetStateId ?? null;
		let targetRegion: typeof regions.$inferSelect | null = null;
		if (input.regionId) {
			[targetRegion] = await tx.select().from(regions).where(eq(regions.id, input.regionId));
			if (!targetRegion) throw new NavalOpError("That region doesn't exist.");
			if (targetRegion.stateId) targetStateId = targetRegion.stateId;
		}
		if (spec.needsWar) {
			if (!targetStateId) throw new NavalOpError("Choose a target state.");
			const side = await sideOf(tx, input.stateId);
			const enemies = await enemiesOf(tx, side);
			const casus = enemies.has(targetStateId) || (await hasCasusBelli(tx, input.stateId, targetStateId, now));
			if (!casus) throw new NavalOpError("You must be at war with that state (or hold a casus belli) to do this.");
		}
		if (spec.needsCoast) {
			if (!targetRegion) throw new NavalOpError("Choose a coastal region.");
			if (!isCoastal(targetRegion)) throw new NavalOpError("That region has no coast to operate against.");
		}

		// Fleet requirements.
		const fleet = await navalFleet(tx, input.stateId);
		const hulls = fleet.filter((u) => (NAVAL_TYPES as readonly string[]).includes(u.unitType));
		const usable = hulls.filter((u) => u.health > 0);
		if (!usable.some((u) => spec.requires.includes(u.unitType as never)))
			throw new NavalOpError(`This operation needs ${spec.requires.join(" or ")}.`);
		const marines = fleet.filter((u) => u.unitType === "marine");
		const landingShips = fleet.filter((u) => u.unitType === "landing_ship");
		if (input.kind === "amphibious_assault") {
			const check = canAmphibiousAssault({
				marines: marines.length,
				landingShips: landingShips.length,
				marinesHealthy: marines.some((u) => u.health >= AMPHIBIOUS.MIN_HEALTH),
				shipsHealthy: landingShips.some((u) => u.health >= AMPHIBIOUS.MIN_HEALTH)
			});
			if (!check.ok) throw new NavalOpError(check.reason!);
		}

		// Treasury.
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < spec.cost)
			throw new NavalOpError(`The treasury needs ${spec.cost.toLocaleString()} for this operation.`);
		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${spec.cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${spec.cost}`,
				updatedAt: now
			})
			.where(eq(stateTreasury.stateId, input.stateId));

		// Fuel: operations draw from the military pool the daily energy tick
		// fills from the state's refined-fuel policy.
		const fuelNeeded = NAVAL_FUEL_PER_OP[input.kind] ?? 0;
		if (fuelNeeded > 0) {
			const [energy] = await tx.select().from(stateEnergy).where(eq(stateEnergy.stateId, input.stateId)).limit(1);
			if (!energy || energy.militaryFuel < fuelNeeded)
				throw new NavalOpError(
					`This operation needs ${fuelNeeded} fuel in the military reserve. Raise the military share of the refined-fuel policy.`
				);
			const [spent] = await tx
				.update(stateEnergy)
				.set({ militaryFuel: sql`${stateEnergy.militaryFuel} - ${fuelNeeded}`, updatedAt: now })
				.where(and(eq(stateEnergy.stateId, input.stateId), sql`${stateEnergy.militaryFuel} >= ${fuelNeeded}`))
				.returning({ stateId: stateEnergy.stateId });
			if (!spent) throw new NavalOpError("The military fuel reserve was spent elsewhere.");
		}

		// Odds: our sea control against their air and sea power, plus coastal forts.
		const ownPoints = usable.reduce(
			(sum, u) => sum + Math.round(seaControlPoints([u.unitType]) * Math.max(0, u.health / 100)),
			0
		);
		const enemyAir = targetStateId ? await airPowerOf(tx, targetStateId) : 0;
		const enemySea = targetStateId ? await seaControlOf(tx, targetStateId) : 0;
		const forts = targetRegion?.fortifications ?? 0;
		const successChance = navalSuccessChance(input.kind, ownPoints, enemyAir, enemySea, forts);
		const succeeded = rng() < successChance;
		const strength = Math.round(seaControlStrength(ownPoints, enemyAir, enemySea) * 100);

		// Apply the effect.
		const damage: NavalDamage = {};
		let message = "";
		const expiresAt = new Date(now.getTime() + spec.durationHours * HOUR);

		if (!succeeded) {
			message = `${NAVAL_OPS[input.kind].label} failed: the fleet withdrew.`;
		} else if (input.kind === "blockade" && targetStateId) {
			const blockStrength = Math.round(blockadeStrength(ownPoints, enemySea, enemyAir) * 100);
			await tx.insert(navalBlockades).values({
				blockaderStateId: input.stateId,
				targetStateId,
				strength: blockStrength,
				startsAt: now,
				expiresAt
			});
			message = `Blockade in place: ${blockStrength}% pressure on the enemy coast for ${spec.durationHours} h.`;
		} else if (input.kind === "shore_bombardment" && targetRegion) {
			const hit = rng() < 0.5 + strength / 200;
			if (hit) {
				const levels = Math.max(1, BOMBARDMENT.LEVELS_ON_HIT);
				await tx
					.update(regions)
					.set({
						infrastructure: sql`greatest(0, ${regions.infrastructure} - ${levels})`,
						fortifications: sql`greatest(0, ${regions.fortifications} - ${levels})`
					})
					.where(eq(regions.id, targetRegion.id));
				damage.levels = { infrastructure: levels, fortifications: levels };
				const defenders = await tx
					.select({ id: militaryUnits.id, name: militaryUnits.name, health: militaryUnits.health })
					.from(militaryUnits)
					.where(and(eq(militaryUnits.regionId, targetRegion.id), eq(militaryUnits.isTraining, false)));
				damage.units = [];
				for (const unit of defenders.slice(0, 4)) {
					const dmg = Math.min(unit.health, BOMBARDMENT.UNIT_DAMAGE);
					await tx
						.update(militaryUnits)
						.set({ health: sql`greatest(0, ${militaryUnits.health} - ${dmg})`, updatedAt: now })
						.where(eq(militaryUnits.id, unit.id));
					damage.units.push({ unitId: unit.id, name: unit.name, damage: dmg, destroyed: dmg >= unit.health, side: "enemy" });
				}
				const civ = regionPopulation(targetRegion);
				const harmed = Math.round((civ / 1000) * BOMBARDMENT.CIVILIAN_HARM_PER_1000);
				if (harmed > 0) {
					damage.civilians = harmed;
					await tx
						.update(regions)
						.set({ population: Math.max(1000, civ - harmed) })
						.where(eq(regions.id, targetRegion.id));
				}
				message = `Bombardment hit: ${levels} level(s) knocked down, ${damage.units.length} unit(s) damaged.`;
			} else {
				message = "Bombardment fell short: the coast's defences held.";
			}
		} else if (input.kind === "amphibious_assault" && targetRegion && targetStateId) {
			const [war] = await tx
				.select({ id: sql<number>`id` })
				.from(battles)
				.where(and(eq(battles.regionId, targetRegion.id), eq(battles.status, "ongoing")))
				.limit(1);
			// Find the active war between the two states.
			const [activeWar] = await tx
				.select({ id: wars.id })
				.from(wars)
				.where(
					and(
						eq(wars.status, "active"),
						or(
							and(eq(wars.attackerId, input.stateId), eq(wars.defenderId, targetStateId)),
							and(eq(wars.attackerId, targetStateId), eq(wars.defenderId, input.stateId))
						)
					)
				)
				.limit(1);
			if (!activeWar) throw new NavalOpError("There is no active war to land into.");
			if (war) throw new NavalOpError("A battle is already under way in that region.");
			const [battle] = await tx
				.insert(battles)
				.values({
					warId: activeWar.id,
					regionId: targetRegion.id,
					attackerStateId: input.stateId,
					defenderStateId: targetStateId,
					terrain: regionTerrain(targetRegion) as typeof battles.$inferInsert.terrain,
					startedBy: input.orderedBy,
					amphibious: true
				})
				.returning({ id: battles.id });
			damage.battleId = battle.id;
			// The marines go ashore as the attacking side.
			for (const marine of marines.filter((u) => u.health >= AMPHIBIOUS.MIN_HEALTH)) {
				await tx.insert(battleParticipants).values({
					battleId: battle.id,
					unitId: marine.id,
					side: "attacker",
					currentStrength: marine.health,
					currentOrganization: marine.organization,
					maxStrength: 100
				});
			}
			const penalty = Math.round((1 - amphibiousPenalty(forts)) * 100);
			message = `Marines ashore: battle opened in the region (assault penalty ${penalty}%).`;
		} else if (input.kind === "sea_lane_raid" && targetStateId) {
			const [targetTreasury] = await tx
				.select({ balance: stateTreasury.balance })
				.from(stateTreasury)
				.where(eq(stateTreasury.stateId, targetStateId))
				.for("update");
			const haul = raidHaul(Number(targetTreasury?.balance ?? 0), strength / 100);
			if (haul > 0) {
				await tx
					.update(stateTreasury)
					.set({ balance: sql`${stateTreasury.balance} - ${haul}`, updatedAt: now })
					.where(eq(stateTreasury.stateId, targetStateId));
				await tx
					.update(stateTreasury)
					.set({ balance: sql`${stateTreasury.balance} + ${haul}`, updatedAt: now })
					.where(eq(stateTreasury.stateId, input.stateId));
				damage.haul = haul;
				message = `Sea-lane raid: ${haul.toLocaleString()} seized from enemy shipping.`;
			} else {
				message = "Sea-lane raid found nothing worth taking.";
			}
		} else if (input.kind === "minelaying" && targetRegion) {
			message = "Mines laid: enemy naval operations off this coast are denied for a day.";
		}

		const [operation] = await tx
			.insert(navalOperations)
			.values({
				stateId: input.stateId,
				targetStateId,
				regionId: input.regionId ?? null,
				orderedBy: input.orderedBy,
				kind: input.kind,
				outcome: succeeded ? "success" : "failed",
				cost: spec.cost,
				seaControl: Math.min(100, strength),
				strength: succeeded ? strength : 0,
				damage,
				message
			})
			.returning({ id: navalOperations.id });

		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "naval_operation",
			amount: spec.cost,
			balanceAfter: Number(treasury.balance) - spec.cost,
			description: `${NAVAL_OPS[input.kind].label}${targetStateId ? ` against state ${targetStateId}` : ""}`,
			authorizedBy: input.orderedBy
		});

		return { operationId: operation.id, kind: input.kind, succeeded, message, damage, strength };
	});
}

/** The operations ledger for a state (most recent first). */
export async function navalLedger(db: Db, stateId: number, limit = 30) {
	return db
		.select()
		.from(navalOperations)
		.where(eq(navalOperations.stateId, stateId))
		.orderBy(desc(navalOperations.createdAt))
		.limit(limit);
}

/** Active blockades on a state, for the overview. */
export async function blockadesOn(db: Db, stateId: number, now = new Date()) {
	return db
		.select()
		.from(navalBlockades)
		.where(
			and(eq(navalBlockades.targetStateId, stateId), lte(navalBlockades.startsAt, now), gt(navalBlockades.expiresAt, now))
		)
		.orderBy(desc(navalBlockades.strength));
}
