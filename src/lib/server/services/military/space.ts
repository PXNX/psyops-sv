// src/lib/server/services/military/space.ts
// Satellites and anti-satellite operations against the database: launching a
// constellation, the bonuses it gives the other domains, space defence, and
// blinding a rival's satellites.
//
// Constellation bonuses are read on demand from the satellites table, so no
// cron is needed. A destroyed satellite stays in the ledger as history.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	governmentBudgetTransactions,
	ministers,
	presidents,
	satellites,
	spaceOperations,
	stateEffects,
	stateProductInventory,
	stateResourceInventory,
	stateSpaceDefence,
	stateTreasury,
	states,
	type Satellite
} from "../../schema";
import {
	SATELLITE_KINDS,
	SPACE_OPS,
	constellationUpkeep,
	earlyWarningMitigation,
	gpsFactor,
	satelliteCommsResilience,
	satelliteReconBonus,
	spaceDefenceUpgradeCost,
	spaceOpDamage,
	spaceOpOdds,
	type Constellation,
	type Orbit,
	type SatelliteKind,
	type SpaceOpKind
} from "#lib/config/index.js";
import { hasCasusBelli } from "./state-effects";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3600_000;

export class SpaceError extends Error {}

export type SpaceRole = "president" | "defense";
export const SPACE_ROLE_LABEL: Record<SpaceRole, string> = {
	president: "President",
	defense: "Minister of Defence"
};

export async function spaceAuthority(db: Db, userId: string): Promise<{ stateId: number; role: SpaceRole } | null> {
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

/** Healthy-satellite counts by kind (damaged ones count at their health share). */
export async function constellationOf(db: Db, stateId: number): Promise<Constellation> {
	const rows = await db
		.select({ kind: satellites.kind, health: satellites.health, status: satellites.status })
		.from(satellites)
		.where(and(eq(satellites.stateId, stateId), sql`${satellites.status} <> 'destroyed'`));
	const out: Constellation = { recon: 0, navigation: 0, comms: 0, early_warning: 0 };
	for (const row of rows) {
		out[row.kind as SatelliteKind] += Math.max(0, Math.min(1, row.health / 100));
	}
	for (const kind of Object.keys(out) as SatelliteKind[]) out[kind] = Math.round(out[kind] * 100) / 100;
	return out;
}

export interface SpaceBonuses {
	constellation: Constellation;
	/** GPS accuracy multiplier (1 = no constellation). */
	gps: number;
	/** Added intel confidence. */
	recon: number;
	/** Share of a C2 disruption the constellation cancels (0-1). */
	comms: number;
	/** Share of strike civilian harm avoided by early warning (0-1). */
	earlyWarning: number;
	/** Daily treasury upkeep. */
	upkeep: number;
}

export async function spaceBonuses(db: Db, stateId: number): Promise<SpaceBonuses> {
	const c = await constellationOf(db, stateId);
	return {
		constellation: c,
		gps: gpsFactor(c.navigation),
		recon: satelliteReconBonus(c.recon),
		comms: satelliteCommsResilience(c.comms),
		earlyWarning: earlyWarningMitigation(c.early_warning),
		upkeep: constellationUpkeep(c)
	};
}

/** Operational satellites, for the overview page. */
export async function satelliteFleet(db: Db, stateId: number): Promise<Satellite[]> {
	return db
		.select()
		.from(satellites)
		.where(and(eq(satellites.stateId, stateId), sql`${satellites.status} <> 'destroyed'`))
		.orderBy(desc(satellites.createdAt));
}

export async function spaceDefenceLevel(db: Db, stateId: number): Promise<number> {
	const [row] = await db
		.select({ level: stateSpaceDefence.level })
		.from(stateSpaceDefence)
		.where(eq(stateSpaceDefence.stateId, stateId));
	return row?.level ?? 0;
}

/** Treasury cost of the next space-defence level, or null at the cap. */
export async function nextSpaceDefenceCost(db: Db, stateId: number): Promise<number | null> {
	return spaceDefenceUpgradeCost(await spaceDefenceLevel(db, stateId));
}

// ── Launching ───────────────────────────────────────────────────────────────

export interface LaunchSatelliteInput {
	stateId: number;
	launchedBy: string;
	kind: SatelliteKind;
	name: string;
	now?: Date;
}

export interface LaunchSatelliteResult {
	satelliteId: number;
	operationalAt: Date;
	cost: number;
}

/**
 * Build and launch a satellite. Costs treasury, chips and rare earths from
 * the state stockpile; it becomes operational after its launch time.
 */
export async function launchSatellite(db: Database, input: LaunchSatelliteInput): Promise<LaunchSatelliteResult> {
	const now = input.now ?? new Date();
	const spec = SATELLITE_KINDS[input.kind];
	if (!spec) throw new SpaceError("Unknown satellite type.");
	const name = input.name.trim();
	if (name.length < 3) throw new SpaceError("Give the satellite a name (at least 3 characters).");

	return db.transaction(async (tx) => {
		const [state] = await tx.select({ id: states.id }).from(states).where(eq(states.id, input.stateId));
		if (!state) throw new SpaceError("That state doesn't exist.");

		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < spec.cost)
			throw new SpaceError(`The treasury needs ${spec.cost.toLocaleString()} to launch this satellite.`);

		// Chips and rare earths are the bottleneck (industry.config.ts).
		const [chips] = await tx
			.select({ quantity: stateProductInventory.quantity })
			.from(stateProductInventory)
			.where(and(eq(stateProductInventory.stateId, input.stateId), eq(stateProductInventory.productType, "chips")))
			.for("update");
		if ((chips?.quantity ?? 0) < 80)
			throw new SpaceError("The state needs at least 80 chips in its stockpile to build the satellite bus.");
		const [rare] = await tx
			.select({ quantity: stateResourceInventory.quantity })
			.from(stateResourceInventory)
			.where(and(eq(stateResourceInventory.stateId, input.stateId), eq(stateResourceInventory.resourceType, "rare_earth")))
			.for("update");
		if ((rare?.quantity ?? 0) < 20)
			throw new SpaceError("The state needs at least 20 rare earths in its stockpile for the sensors.");

		await tx
			.update(stateTreasury)
			.set({ balance: sql`${stateTreasury.balance} - ${spec.cost}`, totalSpent: sql`${stateTreasury.totalSpent} + ${spec.cost}`, updatedAt: now })
			.where(eq(stateTreasury.stateId, input.stateId));
		await tx
			.update(stateProductInventory)
			.set({ quantity: sql`${stateProductInventory.quantity} - 80`, updatedAt: now })
			.where(and(eq(stateProductInventory.stateId, input.stateId), eq(stateProductInventory.productType, "chips")));
		await tx
			.update(stateResourceInventory)
			.set({ quantity: sql`${stateResourceInventory.quantity} - 20`, updatedAt: now })
			.where(and(eq(stateResourceInventory.stateId, input.stateId), eq(stateResourceInventory.resourceType, "rare_earth")));

		const operationalAt = new Date(now.getTime() + spec.launchHours * HOUR);
		const [sat] = await tx
			.insert(satellites)
			.values({
				stateId: input.stateId,
				name,
				kind: input.kind,
				orbit: spec.orbit,
				health: spec.health,
				status: "operational",
				launchedBy: input.launchedBy,
				operationalAt
			})
			.returning({ id: satellites.id });

		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "satellite_launch",
			amount: spec.cost,
			balanceAfter: Number(treasury.balance) - spec.cost,
			description: `Launched ${spec.label.toLowerCase()} "${name}"`,
			authorizedBy: input.launchedBy
		});

		return { satelliteId: sat.id, operationalAt, cost: spec.cost };
	});
}

/** Raise space defence by one level. */
export async function upgradeSpaceDefence(db: Database, userId: string): Promise<number> {
	const authority = await spaceAuthority(db, userId);
	if (!authority) throw new SpaceError("Only the president or defence minister can harden the space programme.");
	return db.transaction(async (tx) => {
		const level = await spaceDefenceLevel(tx, authority.stateId);
		const cost = spaceDefenceUpgradeCost(level);
		if (cost === null) throw new SpaceError("Space defence is already at its highest level.");
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, authority.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < cost)
			throw new SpaceError(`The treasury needs ${cost.toLocaleString()} for this upgrade.`);
		await tx
			.update(stateTreasury)
			.set({ balance: sql`${stateTreasury.balance} - ${cost}`, totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`, updatedAt: new Date() })
			.where(eq(stateTreasury.stateId, authority.stateId));
		if (level === 0) {
			await tx.insert(stateSpaceDefence).values({ stateId: authority.stateId, level: 1, upgradedBy: userId });
		} else {
			await tx
				.update(stateSpaceDefence)
				.set({ level: sql`${stateSpaceDefence.level} + 1`, upgradedBy: userId, upgradedAt: new Date() })
				.where(eq(stateSpaceDefence.stateId, authority.stateId));
		}
		await tx.insert(governmentBudgetTransactions).values({
			stateId: authority.stateId,
			transactionType: "space_operation",
			amount: cost,
			balanceAfter: Number(treasury.balance) - cost,
			description: `Space defence raised to level ${level + 1}`,
			authorizedBy: userId
		});
		return level + 1;
	});
}

// ── Space operations ────────────────────────────────────────────────────────

export interface SpaceOpInput {
	stateId: number;
	orderedBy: string;
	kind: SpaceOpKind;
	targetStateId: number;
	satelliteId?: number | null;
	rng?: () => number;
	now?: Date;
}

export interface SpaceOpResult {
	operationId: number;
	succeeded: boolean;
	attributed: boolean;
	damage: number;
	satelliteDestroyed: boolean;
	message: string;
}

export async function launchSpaceOperation(db: Database, input: SpaceOpInput): Promise<SpaceOpResult> {
	const now = input.now ?? new Date();
	const rng = input.rng ?? Math.random;
	const spec = SPACE_OPS[input.kind];
	if (!spec) throw new SpaceError("Unknown space operation.");
	if (input.targetStateId === input.stateId) throw new SpaceError("You can't target your own constellation.");

	return db.transaction(async (tx) => {
		const side = await hasCasusBelli(tx, input.stateId, input.targetStateId, now);
		if (spec.needsWar && !side)
			throw new SpaceError("You must be at war with that state (or hold a casus belli) to do this.");

		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId))
			.for("update");
		if (!treasury || Number(treasury.balance) < spec.cost)
			throw new SpaceError(`The treasury needs ${spec.cost.toLocaleString()} for this operation.`);
		await tx
			.update(stateTreasury)
			.set({ balance: sql`${stateTreasury.balance} - ${spec.cost}`, totalSpent: sql`${stateTreasury.totalSpent} + ${spec.cost}`, updatedAt: now })
			.where(eq(stateTreasury.stateId, input.stateId));

		// Pick the target satellite: the one asked for, else a random healthy one.
		let target: Satellite | undefined;
		if (input.satelliteId) {
			[target] = await tx
				.select()
				.from(satellites)
				.where(and(eq(satellites.id, input.satelliteId), eq(satellites.stateId, input.targetStateId)))
				.for("update");
		} else {
			const rows = await tx
				.select()
				.from(satellites)
				.where(and(eq(satellites.stateId, input.targetStateId), sql`${satellites.status} <> 'destroyed'`))
				.for("update");
			target = rows[Math.floor(rng() * rows.length)];
		}
		if (!target) throw new SpaceError("That state has no satellite in reach.");

		const defence = await spaceDefenceLevel(tx, input.targetStateId);
		const odds = spaceOpOdds(input.kind, target.orbit as Orbit, defence, side);
		const succeeded = rng() < odds.success;
		const attributed = rng() < odds.attribution;
		const damage = succeeded ? spaceOpDamage(input.kind) : 0;
		const health = Math.max(0, target.health - damage);
		const destroyed = health <= 0;
		if (damage > 0) {
			await tx
				.update(satellites)
				.set({ health, status: destroyed ? "destroyed" : health < 60 ? "damaged" : "operational" })
				.where(eq(satellites.id, target.id));
		}
		// Attribution gives the victim a casus belli for a week.
		if (attributed) {
			await tx.insert(stateEffects).values({
				stateId: input.targetStateId,
				kind: "casus_belli",
				magnitude: 1,
				sourceStateId: input.stateId,
				expiresAt: new Date(now.getTime() + 168 * HOUR)
			});
		}

		const [op] = await tx
			.insert(spaceOperations)
			.values({
				stateId: input.stateId,
				targetStateId: input.targetStateId,
				satelliteId: target.id,
				orderedBy: input.orderedBy,
				kind: input.kind,
				outcome: succeeded ? "success" : "failed",
				cost: spec.cost,
				successChance: Math.round(odds.success * 100),
				attributionChance: Math.round(odds.attribution * 100),
				attributed,
				damage
			})
			.returning({ id: spaceOperations.id });

		await tx.insert(governmentBudgetTransactions).values({
			stateId: input.stateId,
			transactionType: "space_operation",
			amount: spec.cost,
			balanceAfter: Number(treasury.balance) - spec.cost,
			description: `${SPACE_OPS[input.kind].label} against ${target.name}`,
			authorizedBy: input.orderedBy
		});

		const message = succeeded
			? destroyed
				? `${target.name} destroyed.`
				: `${target.name} hit: health down to ${health}.`
			: `${SPACE_OPS[input.kind].label} failed.`;
		return { operationId: op.id, succeeded, attributed, damage, satelliteDestroyed: destroyed, message };
	});
}

/** Space operations ledger for a state. */
export async function spaceLedger(db: Db, stateId: number, limit = 30) {
	return db
		.select()
		.from(spaceOperations)
		.where(eq(spaceOperations.stateId, stateId))
		.orderBy(desc(spaceOperations.createdAt))
		.limit(limit);
}

/** Satellites belonging to a state that are still being launched. */
export async function satellitesInOrbitCount(db: Db, stateId: number): Promise<number> {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(satellites)
		.where(and(eq(satellites.stateId, stateId), sql`${satellites.status} <> 'destroyed'`, gt(satellites.health, 0)));
	return row?.n ?? 0;
}
