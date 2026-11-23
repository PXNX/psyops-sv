// src/lib/server/services/military/fleet.ts
// The spatial naval layer: ships that steam across a hex sea, ports that
// refuel and transship, docks that build and repair through a queue, minefields
// that blockade a port, and the combat that decides who actually controls the
// water. Rules and numbers live in config/game/fleet.config.ts; the pure hex
// maths there is shared with the client's map.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	accounts,
	fleetDockQueue,
	fleetHexes,
	fleets,
	militaryUnits,
	fleetEvents,
	fleetShips,
	governmentBudgetTransactions,
	navalMines,
	presidents,
	regions,
	seaDocks,
	seaPorts,
	stateEnergy,
	stateResourceInventory,
	stateTreasury
} from "../../schema";
import {
	MINEFIELD,
	SHIP_CLASSES,
	AIRCRAFT,
	AIRCRAFT_IDS,
	aircraft,
	FLEET_WEAPONS,
	FACILITY,
	EXERCISE_CONFIG,
	GNSS,
	buildCost,
	constructionHours,
	dockUpgradeCost,
	gainCombatExperience,
	findPath,
	gnssSpeedFactor,
	hexDistance,
	hexFromLatLon,
	hexKey,
	hexToLatLon,
	seaSpeedAt,
	hitChance,
	isCoastal,
	portHexForRegion,
	portUpgradeCost,
	inBounds,
	mineDamage,
	shipRepairCost,
	repairHours,
	roleStrength,
	shipClass,
	targetKind,
	weaponCanTarget,
	type CargoKind,
	type Hex,
	type ShipClassDef,
	type ShipClassId,
	type WeaponId
} from "#lib/config/index.js";
import { navalAuthority } from "./naval";
import {
	commanderFactors,
	commanderIdsFor,
	awardCommanderExperience,
	woundCommander
} from "./commanders";
import { resolveSeaIntelMissions } from "./sea-intel";
import { resolveAirMissions } from "./air-missions";
import { enemiesOf, sideOf } from "./recon";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3_600_000;

/** A player-facing reason the fleet refused an order. */
export class FleetError extends Error {}

export type FleetAuthority = { stateId: number; role: string };

/** Only presidents and defence ministers command the fleet (same as naval ops). */
export async function fleetAuthority(db: Db, userId: string): Promise<FleetAuthority> {
	const authority = await navalAuthority(db, userId);
	if (!authority) throw new FleetError("Only the president or defence minister can command the fleet.");
	return authority;
}

// ── Paying for things ───────────────────────────────────────────────────────

/** Debit the treasury and (optionally) steel from the state stockpile. */
async function pay(db: Db, authority: FleetAuthority, userId: string, money: number, steel: number, description: string): Promise<void> {
	const [treasury] = await db
		.select({ balance: stateTreasury.balance })
		.from(stateTreasury)
		.where(eq(stateTreasury.stateId, authority.stateId))
		.for("update");
	if (!treasury || Number(treasury.balance) < money)
		throw new FleetError(`The treasury needs ${money.toLocaleString()} for ${description}.`);
	if (steel > 0) {
		const [stock] = await db
			.select({ quantity: stateResourceInventory.quantity })
			.from(stateResourceInventory)
			.where(and(eq(stateResourceInventory.stateId, authority.stateId), eq(stateResourceInventory.resourceType, "steel")))
			.for("update");
		if ((stock?.quantity ?? 0) < steel) throw new FleetError(`${description} needs ${steel} steel in the state stockpile.`);
	}

	await db
		.update(stateTreasury)
		.set({
			balance: sql`${stateTreasury.balance} - ${money}`,
			totalSpent: sql`${stateTreasury.totalSpent} + ${money}`,
			updatedAt: new Date()
		})
		.where(eq(stateTreasury.stateId, authority.stateId));
	if (steel > 0) {
		await db
			.update(stateResourceInventory)
			.set({ quantity: sql`${stateResourceInventory.quantity} - ${steel}`, updatedAt: new Date() })
			.where(and(eq(stateResourceInventory.stateId, authority.stateId), eq(stateResourceInventory.resourceType, "steel")));
	}
	await db.insert(governmentBudgetTransactions).values({
		stateId: authority.stateId,
		transactionType: "naval_operation",
		amount: money,
		balanceAfter: Number(treasury.balance) - money,
		description,
		authorizedBy: userId
	});
}

async function log(db: Db, stateId: number | null, kind: string, hex: Hex | null, message: string, data?: Record<string, unknown>): Promise<void> {
	await db.insert(fleetEvents).values({
		stateId,
		kind,
		q: hex?.q ?? null,
		r: hex?.r ?? null,
		message,
		data
	});
}

// ── Facilities ──────────────────────────────────────────────────────────────

export interface BuildPortInput {
	name: string;
	/** A port belongs to exactly one coastal region. */
	regionId: number;
}

/**
 * Establish a port on the sea hex offshore of one of your coastal regions.
 * A region gets at most one port; its coordinates decide which hex that is.
 */
export async function buildPort(db: Database, userId: string, input: BuildPortInput) {
	const authority = await fleetAuthority(db, userId);
	const name = input.name?.trim();
	if (!name || name.length > 100) throw new FleetError("Give the port a name (up to 100 characters).");
	const [region] = await db.select().from(regions).where(eq(regions.id, input.regionId));
	if (!region || region.stateId !== authority.stateId) throw new FleetError("The home region must be one of yours.");
	if (!isCoastal(region)) throw new FleetError("Only a region with maritime access can hold a port.");
	const allRegions = await db.select({ id: regions.id, latitude: regions.latitude, longitude: regions.longitude }).from(regions);
	const occupied = await db.select({ q: seaPorts.q, r: seaPorts.r }).from(seaPorts);
	const hex = portHexForRegion(region, allRegions, new Set(occupied.map((p) => hexKey(p))));
	if (!hex) throw new FleetError("That region's EEZ has no free sea hex for a port.");
	return db.transaction(async (tx) => {
		const [byRegion] = await tx.select({ id: seaPorts.id }).from(seaPorts).where(eq(seaPorts.regionId, region.id));
		if (byRegion) throw new FleetError("That region already has a port.");
		const [existing] = await tx.select({ id: seaPorts.id }).from(seaPorts).where(and(eq(seaPorts.q, hex.q), eq(seaPorts.r, hex.r)));
		if (existing) throw new FleetError("There is already a port on that hex.");
		await pay(tx, authority, userId, FACILITY.port.money, FACILITY.port.steel, `Port ${name}`);
		const [port] = await tx
			.insert(seaPorts)
			.values({
				stateId: authority.stateId,
				regionId: region.id,
				q: hex.q,
				r: hex.r,
				name,
				level: 1,
				fuelStock: FACILITY.portFuelBase,
				builtBy: userId
			})
			.returning();
		await log(tx, authority.stateId, "port_built", hex, `Built port ${name}.`);
		return port;
	});
}

/** Coastal regions of a state that do not have a port yet. */
export async function portCandidates(db: Db, stateId: number) {
	const rows = await db
		.select({ id: regions.id, latitude: regions.latitude, longitude: regions.longitude, terrain: regions.terrain })
		.from(regions)
		.where(eq(regions.stateId, stateId));
	const ports = await db.select({ regionId: seaPorts.regionId }).from(seaPorts);
	const taken = new Set(ports.map((p) => p.regionId));
	return rows
		.filter((r) => isCoastal(r) && !taken.has(r.id))
		.map((r) => ({ id: r.id, label: `Region #${r.id} (${r.latitude}, ${r.longitude})`, hex: hexToLatLon(hexFromLatLon(Number(r.latitude), Number(r.longitude))) }));
}

/** Expand a port by one level: larger fuel tanks and a bigger cargo yard. */
export async function upgradePort(db: Database, userId: string, portId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [port] = await tx.select().from(seaPorts).where(eq(seaPorts.id, portId));
		if (!port || port.stateId !== authority.stateId) throw new FleetError("You can only expand one of your own ports.");
		if (port.level >= FACILITY.maxPortLevel) throw new FleetError(`That port is already at level ${FACILITY.maxPortLevel}.`);
		const next = port.level + 1;
		const cost = portUpgradeCost(port.level);
		await pay(tx, authority, userId, cost.money, cost.steel, `Expanding port ${port.name} to level ${next}`);
		const [updated] = await tx.update(seaPorts).set({ level: next }).where(eq(seaPorts.id, portId)).returning();
		await log(
			tx,
			authority.stateId,
			"port_expanded",
			{ q: port.q, r: port.r },
			`${port.name} expanded to level ${next}.`,
			{ level: next }
		);
		return updated;
	});
}

/** Build a dock at one of your ports, or upgrade an existing one. */
export async function buildDock(db: Database, userId: string, portId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [port] = await tx.select().from(seaPorts).where(eq(seaPorts.id, portId));
		if (!port || port.stateId !== authority.stateId) throw new FleetError("You can only build at one of your own ports.");
		const [dock] = await tx.select().from(seaDocks).where(eq(seaDocks.portId, portId));
		if (dock && dock.level >= FACILITY.maxDockLevel) throw new FleetError("That dock is already at the maximum level.");
		const level = dock ? dock.level + 1 : 1;
		const { money, steel } = dockUpgradeCost(level);
		await pay(tx, authority, userId, money, steel, `${dock ? "Upgrading" : "Building"} dock at ${port.name}`);
		const [result] = dock
			? await tx.update(seaDocks).set({ level }).where(eq(seaDocks.id, dock.id)).returning()
			: await tx
					.insert(seaDocks)
					.values({ portId, stateId: authority.stateId, q: port.q, r: port.r, level, builtBy: userId })
					.returning();
		await log(tx, authority.stateId, "dock_built", { q: port.q, r: port.r }, `Dock at ${port.name} is now level ${level}.`);
		return result;
	});
}

// ── Construction and repair queues ─────────────────────────────────────────

/** Order a new hull. Its slot opens as soon as a dock bay is free. */
export async function orderShip(db: Database, userId: string, dockId: number, classId: ShipClassId) {
	const authority = await fleetAuthority(db, userId);
	const def = shipClass(classId);
	if (!def) throw new FleetError("Unknown ship class.");
	return db.transaction(async (tx) => {
		const [dock] = await tx.select().from(seaDocks).where(eq(seaDocks.id, dockId));
		if (!dock || dock.stateId !== authority.stateId) throw new FleetError("You can only order ships at your own docks.");
		const cost = buildCost(classId);
		await pay(tx, authority, userId, cost.money, cost.steel, `Building ${def.label}`);
		const [item] = await tx
			.insert(fleetDockQueue)
			.values({
				dockId,
				stateId: authority.stateId,
				kind: "construct",
				shipClass: classId,
				orderedBy: userId,
				cost: cost.money
			})
			.returning();
		await log(tx, authority.stateId, "ship_ordered", { q: dock.q, r: dock.r }, `Ordered a ${def.label}.`, { shipClass: classId });
		return item;
	});
}

/** Queue a repair for a ship sitting in one of your dock hexes. */
export async function repairShip(db: Database, userId: string, shipId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [ship] = await tx.select().from(fleetShips).where(eq(fleetShips.id, shipId));
		if (!ship || ship.stateId !== authority.stateId) throw new FleetError("That is not one of your ships.");
		const def = shipClass(ship.shipClass);
		if (!def) throw new FleetError("Unknown ship class.");
		if (ship.status === "sunk") throw new FleetError("A sunk ship cannot be repaired.");
		if (ship.health >= def.hp) throw new FleetError("That ship is already at full health.");
		const [dock] = await tx
			.select()
			.from(seaDocks)
			.where(and(eq(seaDocks.q, ship.q), eq(seaDocks.r, ship.r), eq(seaDocks.stateId, authority.stateId)));
		if (!dock) throw new FleetError("The ship must be sitting at one of your docks to be repaired.");
		const [pending] = await tx
			.select({ id: fleetDockQueue.id })
			.from(fleetDockQueue)
			.where(and(eq(fleetDockQueue.shipId, shipId), eq(fleetDockQueue.kind, "repair"), inArray(fleetDockQueue.status, ["queued", "building"])));
		if (pending) throw new FleetError("That ship already has a repair queued.");
		const cost = shipRepairCost(ship.shipClass, def.hp - ship.health);
		await pay(tx, authority, userId, cost, 0, `Repairing ${ship.name}`);
		await tx.update(fleetShips).set({ status: "repairing", updatedAt: new Date() }).where(eq(fleetShips.id, shipId));
		const [item] = await tx
			.insert(fleetDockQueue)
			.values({
				dockId: dock.id,
				stateId: authority.stateId,
				kind: "repair",
				shipId,
				orderedBy: userId,
				cost
			})
			.returning();
		await log(tx, authority.stateId, "repair_queued", { q: ship.q, r: ship.r }, `Queued repairs for ${ship.name}.`);
		return item;
	});
}

/** Cancel a queued (not yet started) dock job and refund its money. */
export async function cancelDockJob(db: Database, userId: string, itemId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [item] = await tx.select().from(fleetDockQueue).where(eq(fleetDockQueue.id, itemId));
		if (!item || item.stateId !== authority.stateId) throw new FleetError("That queue entry is not yours.");
		if (item.status !== "queued") throw new FleetError("Work has already started; it can no longer be cancelled.");
		await tx.update(fleetDockQueue).set({ status: "cancelled" }).where(eq(fleetDockQueue.id, itemId));
		await tx
			.update(stateTreasury)
			.set({ balance: sql`${stateTreasury.balance} + ${item.cost}`, updatedAt: new Date() })
			.where(eq(stateTreasury.stateId, authority.stateId));
		if (item.shipId) await tx.update(fleetShips).set({ status: "idle", updatedAt: new Date() }).where(eq(fleetShips.id, item.shipId));
		await log(tx, authority.stateId, "queue_cancelled", null, "Cancelled a dock order and refunded it.");
		return item;
	});
}

// ── Movement ────────────────────────────────────────────────────────────────

/** Hexes with mines belonging to states outside the ship's side. */
async function dangerousMines(db: Db, stateId: number): Promise<Set<string>> {
	const side = await sideOf(db, stateId);
	const mines = await db.select({ q: navalMines.q, r: navalMines.r, stateId: navalMines.stateId }).from(navalMines);
	const blocked = new Set<string>();
	for (const mine of mines) if (!side.stateIds.includes(mine.stateId)) blocked.add(hexKey({ q: mine.q, r: mine.r }));
	return blocked;
}

export interface JamSource {
	domain: "sea" | "land" | "air";
	id: number;
	stateId: number;
	strength: number;
}

/**
 * GNSS jamming at a hex, summed from every hostile emitter in range. A ship
 * with a jammer array, an air-defence battalion ashore and fighter squadrons
 * with EW pods all degrade the same satellite-navigation fix.
 */
export async function gnssJammingAt(db: Db, hex: Hex, victimStateId: number): Promise<{ strength: number; sources: JamSource[] }> {
	const side = await sideOf(db, victimStateId);
	const sources: JamSource[] = [];

	const ships = await db
		.select({ id: fleetShips.id, stateId: fleetShips.stateId, shipClass: fleetShips.shipClass, q: fleetShips.q, r: fleetShips.r })
		.from(fleetShips)
		.where(ne(fleetShips.status, "sunk"));
	for (const ship of ships) {
		if (side.stateIds.includes(ship.stateId)) continue;
		if (!shipClass(ship.shipClass)?.weapons.includes("gnss_jam")) continue;
		if (hexDistance(ship, hex) <= GNSS.shipRange) sources.push({ domain: "sea", id: ship.id, stateId: ship.stateId, strength: GNSS.shipStrength });
	}

	const units = await db
		.select({
			id: militaryUnits.id,
			stateId: militaryUnits.stateId,
			regionId: militaryUnits.regionId,
			unitType: militaryUnits.unitType,
			health: militaryUnits.health,
			isTraining: militaryUnits.isTraining
		})
		.from(militaryUnits);
	const regionCoords = await db.select({ id: regions.id, latitude: regions.latitude, longitude: regions.longitude }).from(regions);
	const coords = new Map(regionCoords.map((r) => [r.id, r]));
	for (const unit of units) {
		if (side.stateIds.includes(unit.stateId) || unit.isTraining || unit.health < 40) continue;
		const domain = unit.unitType === GNSS.landUnitType ? "land" : unit.unitType === GNSS.airUnitType ? "air" : null;
		if (!domain) continue;
		const region = coords.get(unit.regionId);
		if (!region) continue;
		const sourceHex = hexFromLatLon(Number(region.latitude), Number(region.longitude));
		const range = domain === "land" ? GNSS.landRange : GNSS.airRange;
		if (hexDistance(sourceHex, hex) > range) continue;
		sources.push({
			domain,
			id: unit.id,
			stateId: unit.stateId,
			strength: domain === "land" ? GNSS.landStrength : GNSS.airStrength
		});
	}

	return { strength: Math.min(GNSS.maxStrength, sources.reduce((sum, s) => sum + s.strength, 0)), sources };
}

/** Plot and start a move. Civilian ships route around foreign minefields. */
export async function moveShip(db: Database, userId: string, shipId: number, target: Hex) {
	const authority = await fleetAuthority(db, userId);
	const [ship] = await db.select().from(fleetShips).where(eq(fleetShips.id, shipId));
	if (!ship || ship.stateId !== authority.stateId) throw new FleetError("That is not one of your ships.");
	const def = shipClass(ship.shipClass);
	if (!def) throw new FleetError("Unknown ship class.");
	if (ship.status === "sunk") throw new FleetError("A sunk ship cannot move.");
	if (ship.status === "repairing") throw new FleetError("A ship under repair cannot sail.");
	if (!inBounds(target)) throw new FleetError("That hex is outside the naval theatre.");
	if (hexKey({ q: ship.q, r: ship.r }) === hexKey(target)) throw new FleetError("The ship is already there.");
	if (ship.fuel < def.fuelPerHex) throw new FleetError("The ship does not have enough fuel to sail.");

	const blocked = await dangerousMines(db, ship.stateId);
	const civilian = def.category === "civilian";
	let path = findPath({ q: ship.q, r: ship.r }, target, blocked);
	if (!path && !civilian) path = findPath({ q: ship.q, r: ship.r }, target);
	if (!path) throw new FleetError("No safe route: foreign minefields blockade the way.");

	const now = new Date();
	const jam = await gnssJammingAt(db, { q: ship.q, r: ship.r }, ship.stateId);
	const legHours =
		def.moveHours * gnssSpeedFactor(jam.strength) * seaSpeedAt(target.q, target.r, hexToLatLon(target).lat, now);
	await db
		.update(fleetShips)
		.set({
			orderPath: path.slice(1),
			legStartsAt: now,
			legArrivesAt: new Date(now.getTime() + legHours * HOUR),
			status: "moving",
			updatedAt: now
		})
		.where(eq(fleetShips.id, shipId));
	await log(db, authority.stateId, "ship_sailing", target, `${ship.name} set course for ${target.q},${target.r} (${path.length - 1} hexes).`);
	if (jam.strength > 0)
		await log(db, authority.stateId, "gnss_jam", { q: ship.q, r: ship.r }, `${ship.name} is navigating without GNSS (jamming ${jam.strength}).`);
	return { path, hours: (path.length - 1) * legHours, jamming: jam.strength };
}

/** Stop a ship where it is and drop its movement order. */
export async function stopShip(db: Database, userId: string, shipId: number) {
	const authority = await fleetAuthority(db, userId);
	const [ship] = await db.select().from(fleetShips).where(eq(fleetShips.id, shipId));
	if (!ship || ship.stateId !== authority.stateId) throw new FleetError("That is not one of your ships.");
	await db
		.update(fleetShips)
		.set({ orderPath: [], legStartsAt: null, legArrivesAt: null, status: "idle", updatedAt: new Date() })
		.where(eq(fleetShips.id, shipId));
	return ship;
}

// ── Ports: refuelling and cargo ────────────────────────────────────────────

/** Fill a ship's tanks from a port of the same side. */
export async function refuelShip(db: Database, userId: string, shipId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [ship] = await tx.select().from(fleetShips).where(eq(fleetShips.id, shipId));
		if (!ship || ship.stateId !== authority.stateId) throw new FleetError("That is not one of your ships.");
		const def = shipClass(ship.shipClass);
		if (!def) throw new FleetError("Unknown ship class.");
		const port = await portAt(tx, ship.q, ship.r, authority.stateId);
		if (!port) throw new FleetError("The ship must be at one of your ports to refuel.");
		const needed = Math.min(def.fuelCapacity - ship.fuel, port.fuelStock);
		if (needed <= 0) throw new FleetError("Nothing to take on: the ship is full or the port's tanks are empty.");
		await tx.update(fleetShips).set({ fuel: ship.fuel + needed, updatedAt: new Date() }).where(eq(fleetShips.id, shipId));
		await tx.update(seaPorts).set({ fuelStock: port.fuelStock - needed }).where(eq(seaPorts.id, port.id));
		await log(tx, authority.stateId, "refuel", { q: ship.q, r: ship.r }, `${ship.name} took on ${needed} fuel at ${port.name}.`);
		return { amount: needed, portId: port.id };
	});
}

async function portAt(db: Db, q: number, r: number, stateId: number) {
	const [port] = await db
		.select()
		.from(seaPorts)
		.where(and(eq(seaPorts.q, q), eq(seaPorts.r, r), eq(seaPorts.stateId, stateId)));
	return port ?? null;
}

/** A cargo category accepts only its own kind of goods. */
export function cargoAccepts(kind: CargoKind | null, resource: string): boolean {
	if (!kind) return false;
	if (kind === "fuel") return resource === "fuel";
	if (kind === "vehicle") return resource === "vehicle";
	return resource !== "fuel" && resource !== "vehicle";
}

export interface CargoInput {
	shipId: number;
	portId: number;
	resource: string;
	amount: number;
	direction: "load" | "unload";
}

/** Load or unload a civilian ship at a port of the same side. */
export async function transportCargo(db: Database, userId: string, input: CargoInput) {
	const authority = await fleetAuthority(db, userId);
	const amount = Math.floor(input.amount);
	if (!Number.isInteger(amount) || amount <= 0) throw new FleetError("Choose a positive cargo amount.");
	return db.transaction(async (tx) => {
		const [ship] = await tx.select().from(fleetShips).where(eq(fleetShips.id, input.shipId));
		if (!ship || ship.stateId !== authority.stateId) throw new FleetError("That is not one of your ships.");
		const def = shipClass(ship.shipClass);
		if (!def || !def.cargo.kind) throw new FleetError("Only ships with a hold can carry cargo.");
		if (!cargoAccepts(def.cargo.kind, input.resource)) throw new FleetError(`A ${def.label} cannot carry ${input.resource}.`);
		const [port] = await tx.select().from(seaPorts).where(eq(seaPorts.id, input.portId));
		if (!port || port.stateId !== authority.stateId) throw new FleetError("Use one of your own ports for cargo.");
		if (port.q !== ship.q || port.r !== ship.r) throw new FleetError("The ship must be in the port's hex.");
		const stock = { ...(port.stock ?? {}) };
		const carried = ship.cargoType === input.resource ? ship.cargoAmount : 0;

		let newCarried = carried;
		if (input.direction === "load") {
			if (ship.cargoType && ship.cargoType !== input.resource && ship.cargoAmount > 0)
				throw new FleetError(`The hold already carries ${ship.cargoType}; unload it first.`);
			if (amount > def.cargo.capacity - carried) throw new FleetError(`The hold can only take ${def.cargo.capacity - carried} more.`);
			if (amount > (stock[input.resource] ?? 0)) throw new FleetError(`The port only holds ${stock[input.resource] ?? 0} ${input.resource}.`);
			newCarried = carried + amount;
			stock[input.resource] = (stock[input.resource] ?? 0) - amount;
		} else {
			if (amount > carried) throw new FleetError(`The ship only carries ${carried} ${input.resource}.`);
			newCarried = carried - amount;
			stock[input.resource] = (stock[input.resource] ?? 0) + amount;
		}
		await tx.update(seaPorts).set({ stock }).where(eq(seaPorts.id, port.id));
		await tx
			.update(fleetShips)
			.set({
				cargoType: newCarried > 0 ? input.resource : null,
				cargoAmount: newCarried,
				updatedAt: new Date()
			})
			.where(eq(fleetShips.id, input.shipId));
		await log(
			tx,
			authority.stateId,
			"cargo",
			{ q: ship.q, r: ship.r },
			`${ship.name} ${input.direction === "load" ? "loaded" : "unloaded"} ${amount} ${input.resource} at ${port.name}.`
		);
		return { cargoType: newCarried > 0 ? input.resource : null, cargoAmount: newCarried };
	});
}

/** A tanker or support ship tops up a friendly ship alongside (within one hex). */
export async function transferFuel(db: Database, userId: string, sourceId: number, targetId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [source] = await tx.select().from(fleetShips).where(eq(fleetShips.id, sourceId));
		const [target] = await tx.select().from(fleetShips).where(eq(fleetShips.id, targetId));
		if (!source || !target || source.stateId !== authority.stateId || target.stateId !== authority.stateId)
			throw new FleetError("Both ships must be yours.");
		const def = shipClass(source.shipClass);
		if (!def?.fuelTransfer) throw new FleetError("Only tankers and support ships can transfer fuel at sea.");
		if (hexDistance(source, target) > 1) throw new FleetError("The ships must be in the same or adjacent hexes.");
		const targetDef = shipClass(target.shipClass);
		if (!targetDef) throw new FleetError("Unknown ship class.");
		const amount = Math.min(targetDef.fuelCapacity - target.fuel, source.cargoAmount);
		if (amount <= 0) throw new FleetError("No fuel to transfer, or the target's tanks are full.");
		await tx.update(fleetShips).set({ cargoAmount: source.cargoAmount - amount, updatedAt: new Date() }).where(eq(fleetShips.id, sourceId));
		await tx.update(fleetShips).set({ fuel: target.fuel + amount, updatedAt: new Date() }).where(eq(fleetShips.id, targetId));
		await log(tx, authority.stateId, "fuel_transfer", { q: source.q, r: source.r }, `${source.name} passed ${amount} fuel to ${target.name}.`);
		return { amount };
	});
}

// ── Mines and blockade ─────────────────────────────────────────────────────

/** Lay (or reinforce) a minefield at the ship's current hex. */
export async function layMines(db: Database, userId: string, shipId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [ship] = await tx.select().from(fleetShips).where(eq(fleetShips.id, shipId));
		if (!ship || ship.stateId !== authority.stateId) throw new FleetError("That is not one of your ships.");
		const def = shipClass(ship.shipClass);
		if (!def?.minelayer) throw new FleetError("Only frigates and submarines can lay mines.");
		if (ship.status === "sunk" || ship.status === "moving" || ship.status === "repairing")
			throw new FleetError("The ship must be idle to lay mines.");
		if (ship.health < 50) throw new FleetError("The ship is too damaged to lay mines.");
		await pay(tx, authority, userId, FACILITY.mine.money, FACILITY.mine.steel, "Laying a minefield");
		const now = new Date();
		const [existing] = await tx
			.select()
			.from(navalMines)
			.where(and(eq(navalMines.q, ship.q), eq(navalMines.r, ship.r), eq(navalMines.stateId, authority.stateId)));
		let mine;
		if (existing) {
			[mine] = await tx
				.update(navalMines)
				.set({
					strength: Math.min(150, existing.strength + 50),
					expiresAt: new Date(now.getTime() + MINEFIELD.LIFETIME_HOURS * HOUR)
				})
				.where(eq(navalMines.id, existing.id))
				.returning();
		} else {
			[mine] = await tx
				.insert(navalMines)
				.values({
					stateId: authority.stateId,
					q: ship.q,
					r: ship.r,
					strength: 100,
					laidBy: userId,
					expiresAt: new Date(now.getTime() + MINEFIELD.LIFETIME_HOURS * HOUR)
				})
				.returning();
		}
		await log(tx, authority.stateId, "mines_laid", { q: ship.q, r: ship.r }, `${ship.name} laid mines at ${ship.q},${ship.r}.`);
		return mine;
	});
}

/** Enemy mines on or next to a port blockade it. */
export async function isPortBlockaded(db: Db, port: { q: number; r: number; stateId: number }): Promise<boolean> {
	const side = await sideOf(db, port.stateId);
	const mines = await db.select({ q: navalMines.q, r: navalMines.r, stateId: navalMines.stateId }).from(navalMines);
	return mines.some((m) => !side.stateIds.includes(m.stateId) && hexDistance(m, port) <= 1);
}

// ── Cron processing ────────────────────────────────────────────────────────

/** Advance every ship one leg of its order when the leg timer expires. */
export async function advanceMovements(db: Database, now: Date, rng: () => number = Math.random) {
	let moved = 0;
	let blocked = 0;
	let sunk = 0;
	let stopped = 0;
	const due = await db
		.select()
		.from(fleetShips)
		.where(and(eq(fleetShips.status, "moving"), lte(fleetShips.legArrivesAt, now)));
	const mines = await db.select().from(navalMines);

	for (const ship of due) {
		const def = shipClass(ship.shipClass);
		if (!def) continue;
		const path = ship.orderPath ?? [];
		if (!path.length) {
			await db
				.update(fleetShips)
				.set({ status: "idle", legStartsAt: null, legArrivesAt: null, updatedAt: now })
				.where(eq(fleetShips.id, ship.id));
			continue;
		}
		const next = path[0]!;
		const side = await sideOf(db, ship.stateId);
		const hostileMine = mines.find((m) => m.q === next.q && m.r === next.r && !side.stateIds.includes(m.stateId));
		if (hostileMine && def.category === "civilian") {
			// Merchant hulls will not sail into a minefield: the port is blockaded.
			await db
				.update(fleetShips)
				.set({ status: "idle", orderPath: [], legStartsAt: null, legArrivesAt: null, updatedAt: now })
				.where(eq(fleetShips.id, ship.id));
			await log(db, ship.stateId, "blockaded", next, `${ship.name} stopped: a minefield blocks the way.`);
			blocked++;
			continue;
		}
		const fuelCost = def.fuelPerHex;
		if (ship.fuel < fuelCost) {
			await db
				.update(fleetShips)
				.set({ status: "idle", orderPath: [], legStartsAt: null, legArrivesAt: null, updatedAt: now })
				.where(eq(fleetShips.id, ship.id));
			await log(db, ship.stateId, "out_of_fuel", { q: ship.q, r: ship.r }, `${ship.name} ran out of fuel and stopped.`);
			stopped++;
			continue;
		}

		const rest = path.slice(1);
		const jam = await gnssJammingAt(db, { q: ship.q, r: ship.r }, ship.stateId);
		const nextHex = rest[0] ?? path[0];
		const legHours =
			def.moveHours * gnssSpeedFactor(jam.strength) * seaSpeedAt(nextHex.q, nextHex.r, hexToLatLon(nextHex).lat, now);
		let health = ship.health;
		let finalStatus: "moving" | "idle" | "sunk" = rest.length ? "moving" : "idle";
		if (hostileMine) {
			const damage = mineDamage(hostileMine.strength, def.category === "civilian");
			health = Math.max(0, health - damage);
			await db
				.update(navalMines)
				.set({ strength: hostileMine.strength - MINEFIELD.DETONATION_COST })
				.where(eq(navalMines.id, hostileMine.id));
			await log(db, ship.stateId, "mine_hit", next, `${ship.name} struck a mine for ${damage} damage.`, { damage });
		}
		if (health <= 0) {
			finalStatus = "sunk";
			sunk++;
			await log(db, ship.stateId, "ship_sunk", next, `${ship.name} was sunk at ${next.q},${next.r}.`);
		} else {
			moved++;
		}
		await db
			.update(fleetShips)
			.set({
				q: next.q,
				r: next.r,
				health,
				fuel: ship.fuel - fuelCost,
				orderPath: finalStatus === "sunk" ? [] : rest,
				status: finalStatus,
				legStartsAt: finalStatus === "moving" ? now : null,
				legArrivesAt: finalStatus === "moving" ? new Date(now.getTime() + legHours * HOUR) : null,
				updatedAt: now
			})
			.where(eq(fleetShips.id, ship.id));
	}
	// Remove spent minefields.
	await db.delete(navalMines).where(lte(navalMines.strength, 0));
	return { moved, blocked, sunk, stopped };
}

/** Bring queued jobs online and finish the ones whose timer elapsed. */
export async function processDockQueues(db: Database, now: Date) {
	let constructed = 0;
	let repaired = 0;
	const docks = await db.select().from(seaDocks);
	for (const dock of docks) {
		const jobs = await db
			.select()
			.from(fleetDockQueue)
			.where(and(eq(fleetDockQueue.dockId, dock.id), inArray(fleetDockQueue.status, ["queued", "building"])))
			.orderBy(fleetDockQueue.id);
		let active = jobs.filter((j) => j.status === "building").length;
		for (const job of jobs) {
			if (job.status === "queued" && active < dock.level) {
				const def = job.shipClass ? shipClass(job.shipClass) : undefined;
				const hours = def ? constructionHours(job.shipClass!, dock.level) : 6;
				await db
					.update(fleetDockQueue)
					.set({ status: "building", startsAt: now, completesAt: new Date(now.getTime() + hours * HOUR) })
					.where(eq(fleetDockQueue.id, job.id));
				active++;
			}
		}
		const finished = await db
			.select()
			.from(fleetDockQueue)
			.where(and(eq(fleetDockQueue.dockId, dock.id), eq(fleetDockQueue.status, "building"), lte(fleetDockQueue.completesAt, now)));
		for (const job of finished) {
			if (job.kind === "construct" && job.shipClass) {
				const def = SHIP_CLASSES[job.shipClass];
				const [port] = await db.select().from(seaPorts).where(eq(seaPorts.id, dock.portId));
				const fuel = Math.min(def.fuelCapacity, port?.fuelStock ?? 0);
				if (port && fuel > 0) await db.update(seaPorts).set({ fuelStock: port.fuelStock - fuel }).where(eq(seaPorts.id, port.id));
				const ownerId = job.orderedBy ?? (await defaultOwner(db, dock.stateId));
				await db.insert(fleetShips).values({
					stateId: dock.stateId,
					ownerId,
					dockId: dock.id,
					name: `${def.label} ${String(job.id).padStart(3, "0")}`,
					shipClass: job.shipClass,
					q: dock.q,
					r: dock.r,
					health: def.hp,
					fuel,
					status: "idle"
				});
				await log(db, dock.stateId, "ship_completed", { q: dock.q, r: dock.r }, `New ${def.label} commissioned at the dock.`, {
					shipClass: job.shipClass
				});
				constructed++;
			} else if (job.kind === "repair" && job.shipId) {
				const [ship] = await db.select().from(fleetShips).where(eq(fleetShips.id, job.shipId));
				const def = ship ? shipClass(ship.shipClass) : undefined;
				if (ship && def) {
					await db
						.update(fleetShips)
						.set({ health: def.hp, status: "idle", updatedAt: now })
						.where(eq(fleetShips.id, ship.id));
					await log(db, dock.stateId, "repair_done", { q: ship.q, r: ship.r }, `${ship.name} is seaworthy again.`);
					repaired++;
				}
			}
			await db.update(fleetDockQueue).set({ status: "done" }).where(eq(fleetDockQueue.id, job.id));
		}
	}
	return { constructed, repaired };
}

async function defaultOwner(db: Db, stateId: number): Promise<string> {
	const [row] = await db
		.select({ id: accounts.id })
		.from(accounts)
		.innerJoin(presidents, eq(presidents.userId, accounts.id))
		.where(eq(presidents.stateId, stateId))
		.limit(1);
	if (row) return row.id;
	const [any] = await db.select({ id: accounts.id }).from(accounts).limit(1);
	return any?.id ?? "system";
}

/** Submarines stay hidden unless the attacker has ASW (or is right alongside). */
function subDetected(attacker: ShipClassDef, target: ShipClassDef, distance: number): boolean {
	if (target.category !== "submarine") return true;
	if (attacker.asw <= 0) return false;
	return attacker.asw + attacker.spotting >= target.stealth || distance === 0;
}

/** Resolve a firing exchange for every hex holding two hostile sides. */
export async function resolveCombats(db: Database, now: Date, rng: () => number = Math.random) {
	let engagements = 0;
	let hits = 0;
	let sunk = 0;
	const ships = await db.select().from(fleetShips).where(and(ne(fleetShips.status, "sunk"), sql`${fleetShips.health} > 0`));
	if (ships.length < 2) return { engagements, hits, sunk };

	// A fleet commander's traits change how hard its ships hit and how well
	// they withstand fire. Unassigned ships stay neutral.
	const fleetIds = ships.map((s) => s.fleetId ?? 0);
	const factors = await commanderFactors(db, fleetIds, true);
	const commandersByFleet = await commanderIdsFor(db, fleetIds, true);
	// Cohesion: a battered formation fights worse than a fresh one.
	const cohesionTotals = new Map<number, { sum: number; n: number }>();
	for (const ship of ships) {
		const fid = ship.fleetId ?? 0;
		const entry = cohesionTotals.get(fid) ?? { sum: 0, n: 0 };
		entry.sum += Math.max(0, ship.health) / (shipClass(ship.shipClass)?.hp ?? 100);
		entry.n++;
		cohesionTotals.set(fid, entry);
	}
	const cohesionFor = (ship: (typeof ships)[number]) => {
		const entry = cohesionTotals.get(ship.fleetId ?? 0);
		return entry ? Math.max(0.6, Math.min(1.05, entry.sum / entry.n)) : 1;
	};
	const factorFor = (ship: (typeof ships)[number]) => {
		const base = factors.get(ship.fleetId ?? 0) ?? { attack: 1, defense: 1, speed: 1, intel: 1 };
		const cohesion = cohesionFor(ship);
		return { ...base, attack: base.attack * cohesion, defense: base.defense * cohesion };
	};
	const commanderFor = (ship: (typeof ships)[number]) => commandersByFleet.get(ship.fleetId ?? 0) ?? null;
	const stateIds = [...new Set(ships.map((s) => s.stateId))];
	const enemySets = new Map<number, Set<number>>();
	await Promise.all(
		stateIds.map(async (id) => {
			enemySets.set(id, await enemiesOf(db, await sideOf(db, id)));
		})
	);
	const hostile = (a: number, b: number) => a !== b && (enemySets.get(a)?.has(b) || enemySets.get(b)?.has(a));

	const byHex = new Map<string, typeof ships>();
	for (const ship of ships) {
		const key = hexKey(ship);
		const list = byHex.get(key) ?? [];
		list.push(ship);
		byHex.set(key, list);
	}

	// Accumulate damage so ships in the same tick cannot "double die" cleanly.
	const damage = new Map<number, number>();
	const attackers = [...ships];
	for (const attacker of attackers) {
		const attackerDef = shipClass(attacker.shipClass);
		if (!attackerDef?.weapons.length || attacker.health <= 0) continue;
		const jam = (await gnssJammingAt(db, { q: attacker.q, r: attacker.r }, attacker.stateId)).strength;
		let best: { target: (typeof ships)[number]; damage: number; weapon: WeaponId } | null = null;
		for (const target of ships) {
			if (target.id === attacker.id || (damage.get(target.id) ?? 0) >= target.health) continue;
			if (!hostile(attacker.stateId, target.stateId)) continue;
			const targetDef = shipClass(target.shipClass);
			if (!targetDef || target.health - (damage.get(target.id) ?? 0) <= 0) continue;
			const distance = hexDistance(attacker, target);
			const detected = subDetected(attackerDef, targetDef, distance);
			for (const weaponId of attackerDef.weapons) {
				const weapon = FLEET_WEAPONS[weaponId];
				if (!weapon || distance > weapon.range) continue;
				if (!weaponCanTarget(weaponId, targetKind(target.shipClass), detected)) continue;
				const offense = factorFor(attacker)?.attack ?? 1;
				const expected = weapon.damage * offense * hitChance(weaponId, distance, {
					shipClass: target.shipClass,
					aa: targetDef.aa,
					stealth: targetDef.stealth,
					detected
				}, jam);
				if (!best || expected > best.damage) best = { target, damage: expected, weapon: weaponId };
			}
		}
		if (!best) continue;
		engagements++;
		const targetDef = shipClass(best.target.shipClass)!;
		const distance = hexDistance(attacker, best.target);
		const detected = subDetected(attackerDef, targetDef, distance);
		const chance = hitChance(best.weapon, distance, {
			shipClass: best.target.shipClass,
			aa: targetDef.aa,
			stealth: targetDef.stealth,
			detected
		}, jam);
		if (rng() < chance) {
			const defense = factorFor(best.target)?.defense ?? 1;
			const dealt = Math.max(1, Math.round((FLEET_WEAPONS[best.weapon].damage * (factorFor(attacker)?.attack ?? 1)) / defense));
			damage.set(best.target.id, (damage.get(best.target.id) ?? 0) + dealt);
			await awardCommanderExperience(db, commanderFor(attacker), 4);
			hits++;
			await log(db, attacker.stateId, "fleet_fire", { q: best.target.q, r: best.target.r }, `${attacker.name} hit ${best.target.name} with ${best.weapon} for ${dealt}.`, {
				attackerId: attacker.id,
				targetId: best.target.id,
				damage: dealt
			});
		}
	}

	for (const [shipId, dealt] of damage) {
		const [ship] = await db.select().from(fleetShips).where(eq(fleetShips.id, shipId));
		if (!ship) continue;
		const health = Math.max(0, ship.health - dealt);
		if (health <= 0) {
			await db
				.update(fleetShips)
				.set({ health: 0, status: "sunk", orderPath: [], legArrivesAt: null, updatedAt: now })
				.where(eq(fleetShips.id, shipId));
			await log(db, ship.stateId, "ship_sunk", { q: ship.q, r: ship.r }, `${ship.name} was sunk in combat.`);
			await woundCommander(db, commandersByFleet.get(ship.fleetId ?? 0), 25);
			sunk++;
		} else {
			await db.update(fleetShips).set({ health, updatedAt: now }).where(eq(fleetShips.id, shipId));
		}
	}
	return { engagements, hits, sunk };
}

// ── Air arm ─────────────────────────────────────────────────────────────────

/** Ready aircraft of a state, grouped by type. */
export async function airUnitsOf(db: Db, stateId: number) {
	return db
		.select({
			id: militaryUnits.id,
			unitType: militaryUnits.unitType,
			regionId: militaryUnits.regionId,
			health: militaryUnits.health,
			fuel: militaryUnits.fuel,
			experience: militaryUnits.experience
		})
		.from(militaryUnits)
		.where(
			and(
				eq(militaryUnits.stateId, stateId),
				inArray(militaryUnits.unitType, [...AIRCRAFT_IDS] as never),
				eq(militaryUnits.isTraining, false),
				sql`${militaryUnits.health} > 0`,
				sql`${militaryUnits.fuel} > 0`
			)
		);
}

/** A state's air picture: counts by type and the strength of each role. */
export async function airSupportOf(db: Db, stateId: number) {
	const units = await airUnitsOf(db, stateId);
	const byType: Record<string, number> = {};
	for (const unit of units) byType[unit.unitType] = (byType[unit.unitType] ?? 0) + 1;
	const types = units.map((u) => u.unitType);
	const roles = Object.fromEntries(
		(["transport", "bombing", "refuel", "air_superiority", "close_support", "naval_strike", "utility"] as const).map((role) => [
			role,
			roleStrength(types, role)
		])
	);
	return { units, byType, roles };
}

/** Coastal airfields can strike enemy ships; helicopters and naval bombers hunt subs. */
export async function resolveAirAtSea(db: Database, now: Date, rng: () => number = Math.random) {
	let strikes = 0;
	let hits = 0;
	const regionsAll = await db.select({ id: regions.id, stateId: regions.stateId, latitude: regions.latitude, longitude: regions.longitude }).from(regions);
	const regionHex = new Map(regionsAll.map((r) => [r.id, hexFromLatLon(Number(r.latitude), Number(r.longitude))]));
	const ships = await db.select().from(fleetShips).where(and(ne(fleetShips.status, "sunk"), sql`${fleetShips.health} > 0`));
	if (!ships.length) return { strikes, hits };

	const stateIds = [...new Set(regionsAll.map((r) => r.stateId).filter((id): id is number => id != null))];
	const air = new Map<number, Awaited<ReturnType<typeof airSupportOf>>>();
	for (const id of stateIds) air.set(id, await airSupportOf(db, id));
	const enemySets = new Map<number, Set<number>>();
	for (const id of stateIds) enemySets.set(id, await enemiesOf(db, await sideOf(db, id)));

	for (const [stateId, picture] of air) {
		const strikePower = picture.roles.naval_strike;
		if (strikePower <= 0) continue;
		const enemies = enemySets.get(stateId) ?? new Set<number>();
		const bases = picture.units
			.filter((u) => aircraft(u.unitType)?.roles.includes("naval_strike"))
			.map((u) => ({ hex: regionHex.get(u.regionId), range: aircraft(u.unitType)!.rangeHexes }))
			.filter((b): b is { hex: Hex; range: number } => !!b.hex);
		const targets = ships.filter(
			(s) => enemies.has(s.stateId) && bases.some((b) => hexDistance(b.hex, s) <= b.range)
		);
		if (!targets.length) continue;
		const target = targets.sort((a, b) => a.health - b.health)[0]!;
		const targetDef = shipClass(target.shipClass);
		if (!targetDef) continue;
		const defenderAir = air.get(target.stateId)?.roles.air_superiority ?? 0;
		const attackerAir = picture.roles.air_superiority;
		const chance = Math.max(0.15, Math.min(0.95, 0.7 + attackerAir / 500 - defenderAir / 400 - targetDef.aa / 200));
		strikes++;
		if (rng() >= chance) continue;
		const damage = Math.max(5, Math.round(strikePower / 8));
		const health = Math.max(0, target.health - damage);
		await db
			.update(fleetShips)
			.set({
				health,
				status: health <= 0 ? "sunk" : target.status,
				orderPath: health <= 0 ? [] : target.orderPath,
				legArrivesAt: health <= 0 ? null : target.legArrivesAt,
				updatedAt: now
			})
			.where(eq(fleetShips.id, target.id));
		hits++;
		await log(
			db,
			stateId,
			"air_strike",
			{ q: target.q, r: target.r },
			`Air strike hit ${target.name} for ${damage}${health <= 0 ? " and sank it" : ""}.`,
			{ targetId: target.id, damage }
		);
		// Every aircraft in the strike burns fuel and learns from the sortie.
		for (const unit of picture.units) {
			const def = aircraft(unit.unitType);
			if (!def?.roles.includes("naval_strike")) continue;
			await db
				.update(militaryUnits)
				.set({
					fuel: sql`greatest(0, ${militaryUnits.fuel} - ${def.fuelPerSortie})`,
					experience: gainCombatExperience(unit.experience, damage)
				})
				.where(eq(militaryUnits.id, unit.id));
		}
	}
	return { strikes, hits };
}

/** Restore unit fuel from the state's military reserve, a little per tick. */
export async function tickUnitFuel(db: Database) {
	let refilled = 0;
	const units = await db.select().from(militaryUnits).where(sql`${militaryUnits.fuel} < 100`);
	const reserves = new Map<number, number>();
	for (const unit of units) {
		let available = reserves.get(unit.stateId);
		if (available === undefined) {
			const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, unit.stateId));
			available = Math.max(0, Math.floor(Number(energy?.militaryFuel ?? 0)));
		}
		const amount = Math.min(100 - unit.fuel, EXERCISE_CONFIG.REFUEL_PER_TICK, available);
		if (amount <= 0) {
			reserves.set(unit.stateId, available);
			continue;
		}
		await db.update(militaryUnits).set({ fuel: unit.fuel + amount }).where(eq(militaryUnits.id, unit.id));
		available -= amount;
		reserves.set(unit.stateId, available);
		refilled += amount;
	}
	for (const [stateId, left] of reserves) {
		await db.update(stateEnergy).set({ militaryFuel: left }).where(eq(stateEnergy.stateId, stateId));
	}
	return { refilled };
}

/** Slowly refill ports from the state's military fuel reserve. */
export async function tickPorts(db: Database, now: Date) {
	let refilled = 0;
	const ports = await db.select().from(seaPorts);
	for (const port of ports) {
		const cap = FACILITY.portFuelBase + port.level * FACILITY.portFuelPerLevel;
		if (port.fuelStock >= cap) continue;
		const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, port.stateId));
		const available = Math.max(0, Math.floor(Number(energy?.militaryFuel ?? 0)));
		const amount = Math.min(cap - port.fuelStock, FACILITY.portFuelRegenPerHour, available);
		if (amount <= 0) continue;
		await db.update(seaPorts).set({ fuelStock: port.fuelStock + amount }).where(eq(seaPorts.id, port.id));
		await db.update(stateEnergy).set({ militaryFuel: available - amount }).where(eq(stateEnergy.stateId, port.stateId));
		refilled += amount;
	}
	return { refilled };
}

export interface FleetTickSummary {
	moved: number;
	blocked: number;
	sunkAtSea: number;
	stopped: number;
	constructed: number;
	repaired: number;
	engagements: number;
	hits: number;
	sunkInCombat: number;
	fuelRefilled: number;
	minesExpired: number;
	seaIntelResolved: number;
	airStrikes: number;
	airHits: number;
	unitFuelRefilled: number;
	airMissionsResolved: number;
}

/** One cron tick: expire mines, move ships, work the docks, fight, refuel. */
export async function processFleetTick(db: Database, now: Date = new Date(), rng: () => number = Math.random): Promise<FleetTickSummary> {
	const minesExpired = (await db.delete(navalMines).where(lte(navalMines.expiresAt, now)).returning({ id: navalMines.id })).length;
	const movement = await advanceMovements(db, now, rng);
	const docks = await processDockQueues(db, now);
	const combat = await resolveCombats(db, now, rng);
	const seaIntelResolved = await resolveSeaIntelMissions(db, now, rng);
	const air = await resolveAirAtSea(db, now, rng);
	const ports = await tickPorts(db, now);
	const unitFuel = await tickUnitFuel(db);
	const airMissionsResolved = await resolveAirMissions(db, now, rng);
	return {
		moved: movement.moved,
		blocked: movement.blocked,
		sunkAtSea: movement.sunk,
		stopped: movement.stopped,
		constructed: docks.constructed,
		repaired: docks.repaired,
		engagements: combat.engagements,
		hits: combat.hits,
		sunkInCombat: combat.sunk,
		fuelRefilled: ports.refilled,
		minesExpired,
		seaIntelResolved,
		airStrikes: air.strikes,
		airHits: air.hits,
		unitFuelRefilled: unitFuel.refilled,
		airMissionsResolved
	};
}

// ── Fleet groups ────────────────────────────────────────────────────────────

/** Bundle ready ships into a named fleet that can be ordered to hold an area. */
export async function formFleet(db: Database, userId: string, input: { name: string; shipIds: number[] }) {
	const authority = await fleetAuthority(db, userId);
	const name = input.name.trim();
	if (!name) throw new FleetError("Give the fleet a name.");
	const ids = [...new Set(input.shipIds)].filter((id) => Number.isInteger(id));
	if (!ids.length) throw new FleetError("Select at least one ship.");
	if (ids.length > 50) throw new FleetError("A fleet can hold at most 50 ships.");
	return db.transaction(async (tx) => {
		const rows = await tx.select().from(fleetShips).where(inArray(fleetShips.id, ids));
		const byId = new Map(rows.map((s) => [s.id, s]));
		for (const id of ids) {
			const ship = byId.get(id);
			if (!ship || ship.stateId !== authority.stateId) throw new FleetError("One of those ships is not yours.");
			if (ship.status === "sunk" || ship.status === "repairing") throw new FleetError("Only ready ships can join a fleet.");
		}
		const [fleet] = await tx
			.insert(fleets)
			.values({ stateId: authority.stateId, ownerId: userId, name: name.slice(0, 100) })
			.returning();
		await tx.update(fleetShips).set({ fleetId: fleet!.id }).where(inArray(fleetShips.id, ids));
		await log(tx, authority.stateId, "fleet_formed", null, `Fleet ${name} formed with ${ids.length} ship(s).`);
		return fleet!;
	});
}

/** Order a fleet to hold a set of hexes; each ready member steams to one of them. */
export async function assignFleet(db: Database, userId: string, fleetId: number, hexes: Hex[]) {
	const authority = await fleetAuthority(db, userId);
	if (!hexes.length) throw new FleetError("Select at least one hex to hold.");
	if (hexes.length > 60) throw new FleetError("A fleet can hold at most 60 hexes.");
	for (const h of hexes) if (!inBounds(h)) throw new FleetError("Some of those hexes are outside the sea grid.");
	return db.transaction(async (tx) => {
		const [fleet] = await tx.select().from(fleets).where(eq(fleets.id, fleetId));
		if (!fleet || fleet.stateId !== authority.stateId) throw new FleetError("That fleet is not yours.");
		await tx.delete(fleetHexes).where(eq(fleetHexes.fleetId, fleetId));
		await tx.insert(fleetHexes).values(hexes.map((h) => ({ fleetId, q: h.q, r: h.r })));
		const members = await tx
			.select()
			.from(fleetShips)
			.where(and(eq(fleetShips.fleetId, fleetId), eq(fleetShips.stateId, authority.stateId)));
		let sailing = 0;
		for (const [i, ship] of members.entries()) {
			if (ship.status === "sunk" || ship.status === "repairing") continue;
			await moveShip(tx, userId, ship.id, hexes[i % hexes.length]!);
			sailing++;
		}
		await log(
			tx,
			authority.stateId,
			"fleet_assigned",
			hexes[0]!,
			`Fleet ${fleet.name} ordered to hold ${hexes.length} hex(es); ${sailing} ship(s) under way.`
		);
		return { fleetId, hexes: hexes.length, sailing };
	});
}

/** Release every ship and held hex of a fleet. */
export async function disbandFleet(db: Database, userId: string, fleetId: number) {
	const authority = await fleetAuthority(db, userId);
	return db.transaction(async (tx) => {
		const [fleet] = await tx.select().from(fleets).where(eq(fleets.id, fleetId));
		if (!fleet || fleet.stateId !== authority.stateId) throw new FleetError("That fleet is not yours.");
		await tx
			.update(fleetShips)
			.set({ fleetId: null })
			.where(and(eq(fleetShips.fleetId, fleetId), eq(fleetShips.stateId, authority.stateId)));
		await tx.delete(fleetHexes).where(eq(fleetHexes.fleetId, fleetId));
		await tx.delete(fleets).where(eq(fleets.id, fleetId));
		await log(tx, authority.stateId, "fleet_disbanded", null, `Fleet ${fleet.name} disbanded.`);
	});
}

// ── Read models for the map UI ─────────────────────────────────────────────

/** Everything the navy page needs, in one place. */
export async function loadFleetWorld(db: Database, viewerStateId?: number) {
	const [ports, docks, ships, mines, queue, events, stateFleets] = await Promise.all([
		db.select().from(seaPorts),
		db.select().from(seaDocks),
		db.select().from(fleetShips),
		db.select().from(navalMines),
		db.select().from(fleetDockQueue).where(inArray(fleetDockQueue.status, ["queued", "building"])).orderBy(fleetDockQueue.id),
		db.select().from(fleetEvents).orderBy(desc(fleetEvents.createdAt)).limit(40),
		viewerStateId ? db.select().from(fleets).where(eq(fleets.stateId, viewerStateId)) : Promise.resolve([])
	]);
	const heldHexes = stateFleets.length
		? await db.select().from(fleetHexes).where(inArray(fleetHexes.fleetId, stateFleets.map((f) => f.id)))
		: [];
	const side = viewerStateId ? await sideOf(db, viewerStateId) : null;
	const enemies = side ? await enemiesOf(db, side) : new Set<number>();
	const blockedPorts: Record<number, boolean> = {};
	for (const port of ports) blockedPorts[port.id] = await isPortBlockaded(db, port);
	const jamming: Record<number, { strength: number; sources: JamSource[] }> = {};
	if (viewerStateId) {
		const own = ships.filter((s) => s.stateId === viewerStateId && s.status !== "sunk");
		const readings = await Promise.all(own.map((s) => gnssJammingAt(db, { q: s.q, r: s.r }, viewerStateId)));
		own.forEach((s, i) => (jamming[s.id] = readings[i]!));
	}
	return {
		ports,
		docks,
		ships,
		mines,
		queue,
		events,
		side,
		enemyStateIds: [...enemies],
		blockedPorts,
		jamming,
		fleets: stateFleets,
		fleetHexes: heldHexes
	};
}

/** Recent fleet log for a state (or everyone, for admins). */
export async function fleetLedger(db: Db, stateId?: number, limit = 30) {
	return stateId
		? db.select().from(fleetEvents).where(eq(fleetEvents.stateId, stateId)).orderBy(desc(fleetEvents.createdAt)).limit(limit)
		: db.select().from(fleetEvents).orderBy(desc(fleetEvents.createdAt)).limit(limit);
}
