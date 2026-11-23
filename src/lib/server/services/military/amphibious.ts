// src/lib/server/services/military/amphibious.ts
// Beach landings and paradrops on coastal regions. Both require local sea or
// air dominance; coastal AA and fortifications raise the chance of failure.
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	fleetEvents,
	fleetShips,
	militaryUnits,
	regions,
	regionEffects,
	states
} from "../../schema";
import { AIRCRAFT_IDS, BEACH_OPS } from "#lib/config/index.js";
import { enemiesOf, sideOf } from "./recon";
import { navalAuthority } from "./naval";
import { fleetAuthority } from "./fleet";
import { commanderIdsFor, woundCommander, awardCommanderExperience } from "./commanders";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export class AmphibiousError extends Error {}

async function log(db: Db, stateId: number, kind: string, message: string) {
	await db.insert(fleetEvents).values({ stateId, kind, message });
}

/** Dominance and risk for a beach on a coastal region. */
export async function beachOdds(db: Db, regionId: number) {
	const [region] = await db.select().from(regions).where(eq(regions.id, regionId));
	if (!region) throw new AmphibiousError("That region does not exist.");
	const coastal = region.terrain === "shore";
	const side = await sideOf(db, region.stateId ?? 0);
	const enemies = await enemiesOf(db, side);
	// Nearby shipping is the sea balance; ready aircraft based in the region
	// (or anywhere in the state) are the air balance.
	const ships = await db.select().from(fleetShips).where(ne(fleetShips.status, "sunk"));
	const friendlySea = ships.filter((s) => side?.stateIds.includes(s.stateId)).length;
	const hostileSea = ships.filter((s) => enemies.has(s.stateId)).length;
	const aircraft = await db.select().from(militaryUnits).where(inArray(militaryUnits.unitType, AIRCRAFT_IDS));
	const readyAir = aircraft.filter((u) => !u.isTraining && u.fuel > 0 && u.health > 0);
	const friendlyAir = readyAir.filter((u) => side?.stateIds.includes(u.stateId)).length;
	const hostileAir = readyAir.filter((u) => enemies.has(u.stateId)).length;
	const seaRatio = hostileSea ? friendlySea / hostileSea : friendlySea ? 99 : 0;
	const airRatio = hostileAir ? friendlyAir / hostileAir : friendlyAir ? 99 : 0;
	const defenders = await db
		.select({ unitType: militaryUnits.unitType })
		.from(militaryUnits)
		.where(and(eq(militaryUnits.regionId, regionId), eq(militaryUnits.unitType, "air_defence" as never)));
	const aa = defenders.length + (region.radar ?? 0);
	const failure = Math.min(
		0.9,
		BEACH_OPS.baseFailure + aa * BEACH_OPS.aaFailure + (region.fortifications ?? 0) * BEACH_OPS.fortFailure
	);
	return {
		coastal,
		seaRatio,
		airRatio,
		failure,
		seaReady: coastal && seaRatio >= BEACH_OPS.seaDominance,
		airReady: airRatio >= BEACH_OPS.airDominance
	};
}

/** Sail selected hulls onto a beach and storm it. */
export async function navalLanding(db: Database, userId: string, regionId: number, shipIds: number[]) {
	const authority = await fleetAuthority(db, userId);
	const odds = await beachOdds(db, regionId);
	if (!odds.coastal) throw new AmphibiousError("Landings need a coastal region.");
	if (!odds.seaReady) throw new AmphibiousError("You need sea dominance before a landing.");
	const ids = [...new Set(shipIds)].filter((id) => Number.isInteger(id));
	if (!ids.length) throw new AmphibiousError("Select the ships for the landing.");
	const ships = await db.select().from(fleetShips).where(inArray(fleetShips.id, ids));
	for (const ship of ships) {
		if (ship.stateId !== authority.stateId) throw new AmphibiousError("One of those ships is not yours.");
		if (ship.status === "sunk" || ship.status === "repairing") throw new AmphibiousError("Only ready ships can land troops.");
	}
	const success = Math.random() >= odds.failure;
	return db.transaction(async (tx) => {
		const endsAt = new Date(Date.now() + BEACH_OPS.beachheadHours * 3_600_000);
		if (success) {
			await tx.insert(regionEffects).values({
				regionId,
				stateId: authority.stateId,
				kind: "supply_boost",
				magnitude: -20,
				startsAt: new Date(),
				expiresAt: endsAt
			});
			const idsForCommanders = await commanderIdsFor(tx, ships.map((s) => s.fleetId ?? 0), true);
			for (const id of idsForCommanders.values()) await awardCommanderExperience(tx, id, 10);
			await log(tx, authority.stateId, "naval_landing", `Beachhead established in region ${regionId}.`);
		} else {
			for (const ship of ships) {
				const health = Math.max(0, ship.health - BEACH_OPS.failedLandingDamage);
				await tx
					.update(fleetShips)
					.set({ health, status: health <= 0 ? "sunk" : ship.status, updatedAt: new Date() })
					.where(eq(fleetShips.id, ship.id));
				const fleetId = ship.fleetId;
				if (fleetId) {
					const commanders = await commanderIdsFor(tx, [fleetId], true);
					await woundCommander(tx, commanders.get(fleetId), 20);
				}
			}
			await log(tx, authority.stateId, "naval_landing_failed", `Landing at region ${regionId} was repulsed.`);
		}
		return { success, failure: odds.failure };
	});
}

/** Drop ready airborne units behind a beach. */
export async function paradrop(db: Database, userId: string, regionId: number, unitIds: number[]) {
	const authority = await navalAuthority(db, userId);
	if (!authority) throw new AmphibiousError("Only the president or defence minister can order a paradrop.");
	const odds = await beachOdds(db, regionId);
	if (!odds.airReady) throw new AmphibiousError("You need air dominance before a paradrop.");
	const ids = [...new Set(unitIds)].filter((id) => Number.isInteger(id));
	if (!ids.length) throw new AmphibiousError("Select the airborne units.");
	const units = await db.select().from(militaryUnits).where(inArray(militaryUnits.id, ids));
	for (const unit of units) {
		if (unit.stateId !== authority.stateId || unit.ownerId !== userId) throw new AmphibiousError("One of those units is not yours.");
		if (unit.isTraining || unit.health <= 0 || unit.fuel <= 0) throw new AmphibiousError("Only ready aircraft can drop.");
	}
	const success = Math.random() >= odds.failure;
	return db.transaction(async (tx) => {
		if (success) {
			await tx.update(militaryUnits).set({ regionId }).where(inArray(militaryUnits.id, ids));
			await tx.insert(regionEffects).values({
				regionId,
				stateId: authority.stateId,
				kind: "supply_boost",
				magnitude: -10,
				startsAt: new Date(),
				expiresAt: new Date(Date.now() + BEACH_OPS.beachheadHours * 3_600_000)
			});
			const groups = [...new Set(units.map((u) => u.groupId ?? 0))];
			const idsForCommanders = await commanderIdsFor(tx, groups);
			for (const id of idsForCommanders.values()) await awardCommanderExperience(tx, id, 10);
			await log(tx, authority.stateId, "paradrop", `Paradrop into region ${regionId} succeeded.`);
		} else {
			for (const unit of units) {
				const health = Math.max(0, unit.health - 35);
				await tx.update(militaryUnits).set({ health, fuel: 0 }).where(eq(militaryUnits.id, unit.id));
				const groups = unit.groupId ? await commanderIdsFor(tx, [unit.groupId]) : new Map();
				for (const id of groups.values()) await woundCommander(tx, id, 15);
			}
			await log(tx, authority.stateId, "paradrop_failed", `Paradrop into region ${regionId} was shot down.`);
		}
		return { success, failure: odds.failure };
	});
}

/** Coastal regions still belong to the map; this keeps the label accurate. */
export async function coastalRegions(db: Database) {
	return db
		.select({ id: regions.id, terrain: regions.terrain, fortifications: regions.fortifications, radar: regions.radar })
		.from(regions)
		.where(eq(regions.terrain, "shore"));
}

/** Used by the UI to show who owns a beach. */
export async function stateName(db: Db, stateId: number) {
	const [row] = await db.select({ name: states.name }).from(states).where(eq(states.id, stateId));
	return row?.name ?? `State ${stateId}`;
}
