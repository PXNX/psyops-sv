// src/lib/server/services/military/air-missions.ts
// Player-directed air tasks: strategic bombing, logistic strikes, naval
// bombing, airlift, reconnaissance, tanker runs and battlefield support.
// A squadron is assigned a mission and a target; the resolver applies the
// effect when the sortie returns and pays the crew in experience.
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	airMissions,
	fleetEvents,
	fleetShips,
	militaryUnits,
	navalMines,
	regions,
	regionEffects,
	seaIntelMissions,
	seaPorts,
	type AirMissionResult
} from "../../schema";
import {
	AIR_MISSIONS,
	AIR_MISSION_IDS,
	SHIP_CLASSES,
	aircraft,
	hexKey,
	hexesInRange,
	inBounds,
	type AirMissionKind,
	type Hex
} from "#lib/config/index.js";
import { awardCommanderExperience, commanderFactors, commanderIdsFor } from "./commanders.js";
import { enemiesOf, sideOf } from "./recon";
import { navalAuthority } from "./naval";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3_600_000;

export class AirMissionError extends Error {}

async function authority(db: Db, userId: string) {
	const leader = await navalAuthority(db, userId);
	if (!leader) throw new AirMissionError("Only the president or defence minister can direct air missions.");
	return leader;
}

export interface LaunchAirMissionInput {
	userId: string;
	unitId: number;
	kind: AirMissionKind;
	targetRegionId?: number | null;
	q?: number;
	r?: number;
	sourceRegionId?: number | null;
	now?: Date;
}

/** Assign a ready squadron to a mission. */
export async function launchAirMission(db: Database, input: LaunchAirMissionInput) {
	const leader = await authority(db, input.userId);
	const def = AIR_MISSIONS[input.kind];
	if (!def || !AIR_MISSION_IDS.includes(input.kind)) throw new AirMissionError("Unknown air mission.");
	return db.transaction(async (tx) => {
		const [unit] = await tx.select().from(militaryUnits).where(eq(militaryUnits.id, input.unitId));
		if (!unit || unit.stateId !== leader.stateId) throw new AirMissionError("That squadron is not yours.");
		if (unit.isTraining || unit.health <= 0) throw new AirMissionError("That squadron is not ready to fly.");
		if (unit.ownerId !== input.userId && leader.role !== "president")
			throw new AirMissionError("Only its commander or the president may task this squadron.");
		const spec = aircraft(unit.unitType);
		if (!spec?.roles.includes(def.role)) throw new AirMissionError(`${spec?.label ?? "That unit"} cannot fly ${def.label}.`);
		const [active] = await tx
			.select({ id: airMissions.id })
			.from(airMissions)
			.where(and(eq(airMissions.unitId, unit.id), eq(airMissions.status, "in_progress")));
		if (active) throw new AirMissionError("That squadron already has a mission in the air.");
		if (unit.fuel < def.fuelCost) throw new AirMissionError(`${spec.label} needs ${def.fuelCost} fuel for this mission.`);

		const now = input.now ?? new Date();
		let region: { id: number; stateId: number | null } | null = null;
		if (def.target === "hex") {
			if (!inBounds({ q: input.q ?? -1, r: input.r ?? -1 })) throw new AirMissionError("Choose a sea hex in the theatre.");
		} else {
			const [row] = await tx.select().from(regions).where(eq(regions.id, input.targetRegionId ?? -1));
			if (!row) throw new AirMissionError("Choose a target region.");
			if (def.target === "friendly_region" && row.stateId !== leader.stateId)
				throw new AirMissionError("That mission can only target one of your own regions.");
			region = row;
		}

		await tx
			.update(militaryUnits)
			.set({ fuel: unit.fuel - def.fuelCost })
			.where(eq(militaryUnits.id, unit.id));
		const [mission] = await tx
			.insert(airMissions)
			.values({
				stateId: leader.stateId,
				unitId: unit.id,
				orderedBy: input.userId,
				kind: input.kind,
				sourceRegionId: input.sourceRegionId ?? unit.regionId,
				targetRegionId: region?.id ?? null,
				q: def.target === "hex" ? input.q! : null,
				r: def.target === "hex" ? input.r! : null,
				fuelCost: def.fuelCost,
				completesAt: new Date(now.getTime() + def.durationHours * HOUR)
			})
			.returning();
		await tx.insert(fleetEvents).values({
			stateId: leader.stateId,
			kind: "air_mission_launched",
			q: def.target === "hex" ? input.q! : null,
			r: def.target === "hex" ? input.r! : null,
			message: `${spec.label} tasked with ${def.label}.`
		});
		return mission;
	});
}

async function log(db: Db, stateId: number, kind: string, message: string, hex: Hex | null = null) {
	await db.insert(fleetEvents).values({
		stateId,
		kind,
		q: hex?.q ?? null,
		r: hex?.r ?? null,
		message
	});
}

/** Region damage helper, clamped at zero. */
async function damageRegion(db: Db, regionId: number, field: "infrastructure" | "economy", amount: number) {
	const [row] = await db.select().from(regions).where(eq(regions.id, regionId));
	if (!row) return 0;
	const current = row[field] ?? 0;
	const value = Math.max(0, current - amount);
	await db.update(regions).set({ [field]: value }).where(eq(regions.id, regionId));
	return current - value;
}

/** Apply one completed sortie. */
async function applyMission(db: Db, mission: typeof airMissions.$inferSelect, now: Date, rng: () => number): Promise<AirMissionResult> {
	const def = AIR_MISSIONS[mission.kind as AirMissionKind]!;
	const hex: Hex | null = mission.q != null && mission.r != null ? { q: mission.q, r: mission.r } : null;
	// An airgroup commander's traits scale the effect of every sortie.
	const [flyer] = await db.select().from(militaryUnits).where(eq(militaryUnits.id, mission.unitId));
	const groupId = flyer?.groupId ?? 0;
	const factors = groupId ? await commanderFactors(db, [groupId]) : new Map();
	const factor = factors.get(groupId);
	const magnitude = Math.max(1, Math.round(def.magnitude * (factor?.attack ?? 1)));
	const [commanderId] = groupId ? [...(await commanderIdsFor(db, [groupId])).values()] : [];

	switch (mission.kind as AirMissionKind) {
		case "strategic_bombing": {
			const infra = await damageRegion(db, mission.targetRegionId!, "infrastructure", magnitude);
			const economy = await damageRegion(db, mission.targetRegionId!, "economy", Math.max(1, magnitude - 1));
			const message = `Strategic bombing: infrastructure -${infra}, economy -${economy} in region ${mission.targetRegionId}.`;
			await log(db, mission.stateId, "strategic_bombing", message);
			return { message, damage: infra + economy };
		}
		case "logistic_strike": {
			await db.insert(regionEffects).values({
				regionId: mission.targetRegionId!,
				stateId: mission.stateId,
				kind: "supply",
				magnitude,
				startsAt: now,
				expiresAt: new Date(now.getTime() + 12 * HOUR)
			});
			const message = `Logistic strike cut region ${mission.targetRegionId}'s supply for 12 h.`;
			await log(db, mission.stateId, "logistic_strike", message);
			return { message, damage: magnitude };
		}
		case "naval_bombing": {
			const enemyStates = await enemiesOf(db, await sideOf(db, mission.stateId));
			const ships = await db.select().from(fleetShips).where(eq(fleetShips.q, hex!.q));
			const targets = ships.filter((s) => s.r === hex!.r && s.status !== "sunk" && enemyStates.has(s.stateId));
			if (!targets.length) {
				const message = "Naval bombing found no enemy ships in the target hex.";
				await log(db, mission.stateId, "naval_bombing", message, hex);
				return { message };
			}
			const target = targets.sort((a, b) => a.health - b.health)[0]!;
			const damage = rng() < 0.8 ? magnitude : Math.floor(magnitude / 3);
			const health = Math.max(0, target.health - damage);
			await db
				.update(fleetShips)
				.set({
					health,
					status: health <= 0 ? "sunk" : target.status,
					orderPath: health <= 0 ? [] : target.orderPath,
					legArrivesAt: health <= 0 ? null : target.legArrivesAt
				})
				.where(eq(fleetShips.id, target.id));
			const message = `Naval bombing hit ${target.name} for ${damage}${health <= 0 ? " and sank it" : ""}.`;
			await log(db, mission.stateId, "naval_bombing", message, hex);
			return { message, damage };
		}
		case "recon": {
			const area = hexesInRange(hex!, 2);
			const keys = new Set(area.map(hexKey));
			const ships = await db.select().from(fleetShips);
			const mines = await db.select().from(navalMines);
			const contacts: Record<string, number> = {};
			for (const ship of ships) {
				if (ship.status === "sunk" || !keys.has(hexKey(ship))) continue;
				const key = ship.shipClass;
				contacts[key] = (contacts[key] ?? 0) + 1;
			}
			const seenMines = mines.filter((m) => keys.has(hexKey(m))).length;
			await db.insert(seaIntelMissions).values({
				stateId: mission.stateId,
				launchedBy: mission.orderedBy!,
				sensor: "air_recon",
				q: hex!.q,
				r: hex!.r,
				cost: 0,
				status: "completed",
				findings: { contacts, mines: seenMines, confidence: 100 },
				launchedAt: now,
				completesAt: now,
				observedAt: now
			});
			const message = `Air recon over ${hex!.q},${hex!.r}: ${Object.keys(contacts).length} hull types, ${seenMines} minefields.`;
			await log(db, mission.stateId, "air_recon", message, hex);
			return { message, contacts };
		}
		case "transport": {
			await db.insert(regionEffects).values({
				regionId: mission.targetRegionId!,
				stateId: mission.stateId,
				kind: "supply_boost",
				magnitude: -magnitude,
				startsAt: now,
				expiresAt: new Date(now.getTime() + 12 * HOUR)
			});
			const message = `Airlift delivered ${magnitude} supply units to region ${mission.targetRegionId}.`;
			await log(db, mission.stateId, "airlift", message);
			return { message, supply: magnitude };
		}
		case "refuel": {
			const ports = await db.select().from(seaPorts).where(eq(seaPorts.regionId, mission.targetRegionId!));
			let given = 0;
			for (const port of ports) {
				const ships = await db.select().from(fleetShips).where(eq(fleetShips.q, port.q));
				for (const ship of ships.filter((s) => s.r === port.r && s.stateId === mission.stateId)) {
					const room = (SHIP_CLASSES[ship.shipClass]?.fuelCapacity ?? 100) - ship.fuel;
					const amount = Math.min(room, magnitude);
					if (amount <= 0) continue;
					await db.update(fleetShips).set({ fuel: ship.fuel + amount }).where(eq(fleetShips.id, ship.id));
					given += amount;
				}
			}
			const message = `Tanker aircraft passed ${given} fuel to the fleet at region ${mission.targetRegionId}.`;
			await log(db, mission.stateId, "air_refuel", message);
			return { message, fuel: given };
		}
		case "battlefield_support": {
			await db.insert(regionEffects).values({
				regionId: mission.targetRegionId!,
				stateId: mission.stateId,
				kind: "supply_boost",
				magnitude: -magnitude,
				startsAt: now,
				expiresAt: new Date(now.getTime() + 6 * HOUR)
			});
			const message = `Close support eased supply pressure in region ${mission.targetRegionId}.`;
			await log(db, mission.stateId, "battlefield_support", message);
			return { message, supply: magnitude };
		}
	}
}

/** Resolve every sortie that has returned. */
export async function resolveAirMissions(db: Database, now = new Date(), rng: () => number = Math.random) {
	let resolved = 0;
	const due = await db
		.select()
		.from(airMissions)
		.where(and(eq(airMissions.status, "in_progress"), sql`${airMissions.completesAt} <= ${now}`));
	for (const mission of due) {
		const result = await applyMission(db, mission, now, rng);
		const [unit] = await db.select().from(militaryUnits).where(eq(militaryUnits.id, mission.unitId));
		if (unit) {
			await db
				.update(militaryUnits)
				.set({ experience: Math.min(100, (unit.experience ?? 0) + 3) })
				.where(eq(militaryUnits.id, unit.id));
			if (unit.groupId) {
				const ids = await commanderIdsFor(db, [unit.groupId]);
				await awardCommanderExperience(db, ids.get(unit.groupId), 5);
			}
		}
		await db.update(airMissions).set({ status: "completed", result }).where(eq(airMissions.id, mission.id));
		resolved++;
	}
	return resolved;
}

/** Active and recent directed missions for the air panel. */
export async function airMissionLedger(db: Db, stateId: number, limit = 20) {
	return db
		.select()
		.from(airMissions)
		.where(eq(airMissions.stateId, stateId))
		.orderBy(sql`${airMissions.launchedAt} desc`)
		.limit(limit);
}
