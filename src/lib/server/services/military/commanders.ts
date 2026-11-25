// src/lib/server/services/military/commanders.ts
// Officers, the academy that graduates them, and the airgroups/divisions they
// command. Grouped units feed their commander's trait modifiers into combat
// and missions; the academy is paid from the state treasury and takes a day.
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	commanders,
	commanderTrainings,
	fleetShips,
	fleets,
	governmentBudgetTransactions,
	militaryUnits,
	regions,
	stateResourceInventory,
	stateTreasury,
	unitGroups
} from "../../schema";
import {
	ACADEMY,
	AIRCRAFT_IDS,
	COMMANDER_TRAITS,
	DOMAIN_UNITS,
	airSupportFactor,
	commanderModifiers,
	hexDistance,
	hexFromLatLon,
	rollCommanderName,
	rollPortrait,
	rollTraits,
	type CommanderModifiers
} from "#lib/config/index.js";
import { navalAuthority } from "./naval";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export class CommanderError extends Error {}

const HOUR = 3_600_000;

/** Only presidents and defence ministers run state military programmes. */
async function commandAuthority(db: Db, userId: string) {
	const authority = await navalAuthority(db, userId);
	if (!authority) throw new CommanderError("Only the president or defence minister can manage officers.");
	return authority;
}

// ── Officer academy ─────────────────────────────────────────────────────────

/** Start a 24-hour course. Charges the treasury once, up front. */
export async function startCommanderTraining(db: Database, userId: string) {
	const authority = await commandAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, authority.stateId))
			.for("update");
		if (!treasury || treasury.balance < ACADEMY.money)
			throw new CommanderError("The treasury cannot cover the academy fee.");
		const [steel] = await tx
			.select({ quantity: stateResourceInventory.quantity })
			.from(stateResourceInventory)
			.where(
				and(eq(stateResourceInventory.stateId, authority.stateId), eq(stateResourceInventory.resourceType, "steel"))
			)
			.for("update");
		if (!steel || steel.quantity < ACADEMY.steel)
			throw new CommanderError("The state needs 250 steel for the academy.");
		await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${ACADEMY.money}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${ACADEMY.money}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, authority.stateId));
		await tx
			.update(stateResourceInventory)
			.set({ quantity: sql`${stateResourceInventory.quantity} - ${ACADEMY.steel}`, updatedAt: new Date() })
			.where(
				and(eq(stateResourceInventory.stateId, authority.stateId), eq(stateResourceInventory.resourceType, "steel"))
			);
		const [row] = await tx
			.insert(commanderTrainings)
			.values({
				stateId: authority.stateId,
				ownerId: userId,
				completesAt: new Date(Date.now() + ACADEMY.durationHours * HOUR)
			})
			.returning();
		await tx.insert(governmentBudgetTransactions).values({
			stateId: authority.stateId,
			transactionType: "military",
			amount: ACADEMY.money,
			balanceAfter: treasury.balance - ACADEMY.money,
			description: "Officer academy course",
			authorizedBy: userId
		});
		return row!;
	});
}

/** Graduates every due course. Safe to call repeatedly from cron or a page. */
export async function resolveCommanderTrainings(db: Database, now = new Date()) {
	const due = await db
		.select()
		.from(commanderTrainings)
		.where(and(isNull(commanderTrainings.completedAt), lte(commanderTrainings.completesAt, now)));
	let graduated = 0;
	for (const course of due) {
		await db.transaction(async (tx) => {
			const [claimed] = await tx
				.update(commanderTrainings)
				.set({ completedAt: now })
				.where(and(eq(commanderTrainings.id, course.id), isNull(commanderTrainings.completedAt)))
				.returning({ id: commanderTrainings.id });
			if (!claimed) return;
			const traits = rollTraits();
			await tx.insert(commanders).values({
				stateId: course.stateId,
				ownerId: course.ownerId,
				name: rollCommanderName(),
				traitIds: traits,
				portrait: rollPortrait()
			});
			graduated++;
		});
	}
	return { graduated };
}

// ── Groups ──────────────────────────────────────────────────────────────────

/** Bundle ready aircraft or battalions into a named airgroup / division. */
export async function formUnitGroup(
	db: Database,
	userId: string,
	input: { kind: "airgroup" | "division"; name: string; unitIds: number[]; commanderId?: number | null }
) {
	const authority = await commandAuthority(db, userId);
	const name = input.name.trim();
	if (!name) throw new CommanderError("Give the group a name.");
	const ids = [...new Set(input.unitIds)].filter((id) => Number.isInteger(id));
	if (!ids.length) throw new CommanderError("Select at least one unit.");
	if (ids.length > 50) throw new CommanderError("A group can hold at most 50 units.");
	const allowed = input.kind === "airgroup" ? AIRCRAFT_IDS : DOMAIN_UNITS.land;
	return db.transaction(async (tx) => {
		const units = await tx.select().from(militaryUnits).where(inArray(militaryUnits.id, ids));
		for (const unit of units) {
			if (unit.stateId !== authority.stateId || unit.ownerId !== userId)
				throw new CommanderError("One of those units is not yours.");
			if (!allowed.includes(unit.unitType as never))
				throw new CommanderError("That unit cannot join this kind of group.");
			if (unit.isTraining || unit.health <= 0) throw new CommanderError("Only ready units can join a group.");
		}
		if (units.length !== ids.length) throw new CommanderError("One of those units does not exist.");
		let commanderId: number | null = null;
		if (input.commanderId != null) {
			const [officer] = await tx.select().from(commanders).where(eq(commanders.id, input.commanderId));
			if (!officer || officer.stateId !== authority.stateId) throw new CommanderError("That commander is not yours.");
			commanderId = officer.id;
		}
		const [group] = await tx
			.insert(unitGroups)
			.values({
				stateId: authority.stateId,
				ownerId: userId,
				kind: input.kind,
				name: name.slice(0, 100),
				commanderId
			})
			.returning();
		await tx.update(militaryUnits).set({ groupId: group!.id }).where(inArray(militaryUnits.id, ids));
		return group!;
	});
}

/** Move units into an existing group, or detach them with `groupId = null`. */
export async function setUnitGroup(db: Database, userId: string, unitIds: number[], groupId: number | null) {
	const authority = await commandAuthority(db, userId);
	const ids = [...new Set(unitIds)].filter((id) => Number.isInteger(id));
	if (!ids.length) throw new CommanderError("Select at least one unit.");
	await db.transaction(async (tx) => {
		const units = await tx.select().from(militaryUnits).where(inArray(militaryUnits.id, ids));
		for (const unit of units) {
			if (unit.stateId !== authority.stateId || unit.ownerId !== userId)
				throw new CommanderError("One of those units is not yours.");
		}
		if (groupId != null) {
			const [group] = await tx.select().from(unitGroups).where(eq(unitGroups.id, groupId));
			if (!group || group.stateId !== authority.stateId) throw new CommanderError("That group is not yours.");
		}
		await tx.update(militaryUnits).set({ groupId }).where(inArray(militaryUnits.id, ids));
	});
}

export async function disbandUnitGroup(db: Database, userId: string, groupId: number) {
	const authority = await commandAuthority(db, userId);
	await db.transaction(async (tx) => {
		const [group] = await tx.select().from(unitGroups).where(eq(unitGroups.id, groupId));
		if (!group || group.stateId !== authority.stateId) throw new CommanderError("That group is not yours.");
		await tx.update(militaryUnits).set({ groupId: null }).where(eq(militaryUnits.groupId, groupId));
		await tx.delete(unitGroups).where(eq(unitGroups.id, groupId));
	});
}

/** Attach an airgroup to a division it will fly support for, or detach it
 *  with `divisionId = null`. One wing supports one division; a division can
 *  be backed by several wings. */
export async function assignAirSupport(db: Database, userId: string, wingId: number, divisionId: number | null) {
	const authority = await commandAuthority(db, userId);
	const [wing] = await db.select().from(unitGroups).where(eq(unitGroups.id, wingId));
	if (!wing || wing.stateId !== authority.stateId || wing.kind !== "airgroup")
		throw new CommanderError("That airgroup is not yours.");
	if (divisionId != null) {
		const [division] = await db.select().from(unitGroups).where(eq(unitGroups.id, divisionId));
		if (!division || division.stateId !== authority.stateId || division.kind !== "division")
			throw new CommanderError("That division is not yours.");
	}
	await db
		.update(unitGroups)
		.set({ supportsGroupId: divisionId, updatedAt: new Date() })
		.where(eq(unitGroups.id, wingId));
}

/** Attach or remove a commander on a fleet, airgroup or division. */
export async function assignCommander(
	db: Database,
	userId: string,
	target: { kind: "fleet" | "airgroup" | "division"; id: number; commanderId: number | null }
) {
	const authority = await commandAuthority(db, userId);
	if (target.commanderId != null) {
		const [officer] = await db.select().from(commanders).where(eq(commanders.id, target.commanderId));
		if (!officer || officer.stateId !== authority.stateId) throw new CommanderError("That commander is not yours.");
	}
	if (target.kind === "fleet") {
		const [fleet] = await db.select().from(fleets).where(eq(fleets.id, target.id));
		if (!fleet || fleet.stateId !== authority.stateId) throw new CommanderError("That fleet is not yours.");
		await db
			.update(fleets)
			.set({ commanderId: target.commanderId, updatedAt: new Date() })
			.where(eq(fleets.id, target.id));
	} else {
		const [group] = await db.select().from(unitGroups).where(eq(unitGroups.id, target.id));
		if (!group || group.stateId !== authority.stateId || group.kind !== target.kind)
			throw new CommanderError("That group is not yours.");
		await db
			.update(unitGroups)
			.set({ commanderId: target.commanderId, updatedAt: new Date() })
			.where(eq(unitGroups.id, target.id));
	}
}

// ── Read models / modifiers ────────────────────────────────────────────────

export async function loadCommanders(db: Database, stateId: number) {
	return db.select().from(commanders).where(eq(commanders.stateId, stateId)).orderBy(commanders.id);
}

export async function loadUnitGroups(db: Database, stateId: number) {
	return db.select().from(unitGroups).where(eq(unitGroups.stateId, stateId)).orderBy(unitGroups.id);
}

/** Trait multipliers for every group that has a commander. Missing groups get
 *  a neutral multiplier so callers can apply the map without special cases. */
export async function commanderFactors(
	db: Db,
	groupIds: number[],
	fromFleets = false
): Promise<Map<number, CommanderModifiers>> {
	const out = new Map<number, CommanderModifiers>();
	const ids = [...new Set(groupIds)].filter((id) => Number.isInteger(id) && id > 0);
	if (!ids.length) return out;
	const rows = fromFleets
		? await db.select({ id: fleets.id, commanderId: fleets.commanderId }).from(fleets).where(inArray(fleets.id, ids))
		: await db
				.select({ id: unitGroups.id, commanderId: unitGroups.commanderId })
				.from(unitGroups)
				.where(inArray(unitGroups.id, ids));
	const officerIds = rows.map((r) => r.commanderId).filter((id): id is number => id != null);
	const officers = officerIds.length
		? await db.select().from(commanders).where(inArray(commanders.id, officerIds))
		: [];
	const byId = new Map(officers.map((o) => [o.id, o]));
	for (const row of rows) {
		const officer = row.commanderId ? byId.get(row.commanderId) : null;
		out.set(
			row.id,
			commanderModifiers(
				officer?.traitIds ?? [],
				officer?.experience ?? 0,
				officer?.health ?? 100,
				officer?.alive ?? true
			)
		);
	}
	return out;
}

/** Battle multiplier per division from the airgroups attached to it. Each
 *  aircraft counts only if it can reach the battle region from its base.
 *  Divisions without support are absent (callers default to 1). */
export async function airSupportFactors(
	db: Db,
	divisionIds: number[],
	battleRegion: { latitude: string | number; longitude: string | number }
): Promise<Map<number, number>> {
	const out = new Map<number, number>();
	const ids = [...new Set(divisionIds)].filter((id) => Number.isInteger(id) && id > 0);
	if (!ids.length) return out;
	const wings = await db
		.select({ id: unitGroups.id, divisionId: unitGroups.supportsGroupId })
		.from(unitGroups)
		.where(and(eq(unitGroups.kind, "airgroup"), inArray(unitGroups.supportsGroupId, ids)));
	if (!wings.length) return out;
	const aircraftRows = await db
		.select({
			groupId: militaryUnits.groupId,
			unitType: militaryUnits.unitType,
			health: militaryUnits.health,
			fuel: militaryUnits.fuel,
			isTraining: militaryUnits.isTraining,
			stateId: militaryUnits.stateId,
			regionStateId: regions.stateId,
			airbase: regions.airbase,
			latitude: regions.latitude,
			longitude: regions.longitude
		})
		.from(militaryUnits)
		.innerJoin(regions, eq(regions.id, militaryUnits.regionId))
		.where(
			inArray(
				militaryUnits.groupId,
				wings.map((w) => w.id)
			)
		);
	const target = hexFromLatLon(Number(battleRegion.latitude), Number(battleRegion.longitude));
	const divisionOf = new Map(wings.map((w) => [w.id, w.divisionId!]));
	const byDivision = new Map<number, Parameters<typeof airSupportFactor>[0]>();
	for (const a of aircraftRows) {
		const division = a.groupId != null ? divisionOf.get(a.groupId) : undefined;
		if (division == null) continue;
		const list = byDivision.get(division) ?? [];
		list.push({
			unitType: a.unitType,
			health: a.health,
			fuel: a.fuel,
			isTraining: a.isTraining,
			// Only squadrons stationed at one of their state's airbases fly.
			distanceHexes:
				(a.airbase ?? 0) > 0 && a.regionStateId === a.stateId
					? hexDistance(hexFromLatLon(Number(a.latitude), Number(a.longitude)), target)
					: Infinity
		});
		byDivision.set(division, list);
	}
	for (const [division, wing] of byDivision) out.set(division, airSupportFactor(wing));
	return out;
}

export function traitLabels(traitIds: string[]): string[] {
	return traitIds.map((id) => COMMANDER_TRAITS[id as keyof typeof COMMANDER_TRAITS]?.label ?? id);
}

/** Which ships a fleet commander influences. */
export async function fleetIdsForShips(db: Db, shipIds: number[]) {
	if (!shipIds.length) return new Map<number, number>();
	const rows = await db
		.select({ id: fleetShips.id, fleetId: fleetShips.fleetId })
		.from(fleetShips)
		.where(inArray(fleetShips.id, shipIds));
	return new Map(rows.map((r) => [r.id, r.fleetId ?? 0]));
}

/** Commander id by fleet / group, for applying wounds and experience. */
export async function commanderIdsFor(db: Db, ids: number[], fromFleets = false): Promise<Map<number, number>> {
	const unique = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
	if (!unique.length) return new Map();
	const rows = fromFleets
		? await db.select({ id: fleets.id, commanderId: fleets.commanderId }).from(fleets).where(inArray(fleets.id, unique))
		: await db
				.select({ id: unitGroups.id, commanderId: unitGroups.commanderId })
				.from(unitGroups)
				.where(inArray(unitGroups.id, unique));
	return new Map(rows.filter((r) => r.commanderId != null).map((r) => [r.id, r.commanderId!]));
}

/** A commander shares the danger when a unit under their command is lost. */
export async function woundCommander(db: Db, commanderId: number | null | undefined, damage: number) {
	if (!commanderId || damage <= 0) return;
	const [officer] = await db.select().from(commanders).where(eq(commanders.id, commanderId));
	if (!officer || !officer.alive) return;
	const health = Math.max(0, officer.health - damage);
	await db
		.update(commanders)
		.set({ health, alive: health > 0 })
		.where(eq(commanders.id, commanderId));
}

/** Experience accrues slowly; ten levels cap out at a tiny performance bonus. */
export async function awardCommanderExperience(db: Db, commanderId: number | null | undefined, xp: number) {
	if (!commanderId || xp <= 0) return;
	await db
		.update(commanders)
		.set({ experience: sql`${commanders.experience} + ${xp}` })
		.where(eq(commanders.id, commanderId));
}
