// Fleet at sea against a real (in-memory) Postgres: hex maths, ports and docks
// with a build/repair queue, hex-by-hex movement, refuelling and cargo, mine
// blockades, and combat between hostile fleets.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	fleetDockQueue,
	fleetEvents,
	fleetShips,
	navalMines,
	militaryUnits,
	regions,
	seaDocks,
	seaPorts,
	stateEnergy,
	stateResourceInventory,
	stateTreasury
} from "../schema";
import {
	FleetError,
	buildDock,
	buildPort,
	portCandidates,
	gnssJammingAt,
	layMines,
	loadFleetWorld,
	moveShip,
	orderShip,
	processFleetTick,
	refuelShip,
	repairShip,
	transportCargo,
	upgradePort
} from "../services/military/fleet";
import {
	GNSS,
	findPath,
	gnssAccuracyPenalty,
	gnssSpeedFactor,
	hexDistance,
	hexFromLatLon,
	hexKey,
	hexNeighbors,
	inBounds,
	type Hex
} from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
const alice = "user-1";
const sylvanCommander = "user-3";
const NOW = new Date();

beforeAll(async () => {
	handle = await createMockDb();
	const states = await handle.db.select().from(stateTreasury);
	// Freedonia is state 1 in the seed; Sylvania is state 2.
	freedonia = Math.min(...states.map((s) => s.stateId));
	sylvania = states.map((s) => s.stateId).sort((a, b) => a - b)[1]!;
	for (const id of [freedonia, sylvania]) {
		await handle.db.update(stateTreasury).set({ balance: 100_000_000 }).where(eq(stateTreasury.stateId, id));
		await handle.db
			.insert(stateResourceInventory)
			.values({ stateId: id, resourceType: "steel", quantity: 100_000 })
			.onConflictDoUpdate({
				target: [stateResourceInventory.stateId, stateResourceInventory.resourceType],
				set: { quantity: 100_000 }
			});
		await handle.db
			.insert(stateEnergy)
			.values({ stateId: id, totalProduction: 1000, usedProduction: 0, militaryFuel: 100_000 })
			.onConflictDoNothing();
	}
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

async function reset() {
	await handle.db.delete(fleetEvents);
	await handle.db.delete(fleetDockQueue);
	await handle.db.delete(fleetShips);
	await handle.db.delete(seaDocks);
	await handle.db.delete(seaPorts);
	await handle.db.delete(navalMines);
}

beforeEach(reset);

async function coastalRegion(stateId: number, terrain: "shore" | "plains" = "shore") {
	const [row] = await handle.db
		.insert(regions)
		.values({ latitude: "45.0", longitude: "10.0", stateId, terrain })
		.returning();
	return row!;
}

async function port(stateId: number, q: number, r: number, fuel = 500, stock: Record<string, number> = {}) {
	const [row] = await handle.db
		.insert(seaPorts)
		.values({ stateId, q, r, name: `Port ${q}-${r}`, fuelStock: fuel, stock })
		.returning();
	return row!;
}
async function dock(portId: number, stateId: number, q: number, r: number, level = 1) {
	const [row] = await handle.db.insert(seaDocks).values({ portId, stateId, q, r, level }).returning();
	return row!;
}
async function ship(
	stateId: number,
	shipClass: (typeof fleetShips.$inferInsert)["shipClass"],
	q: number,
	r: number,
	extra: Partial<typeof fleetShips.$inferInsert> = {}
) {
	const [row] = await handle.db
		.insert(fleetShips)
		.values({
			stateId,
			ownerId: alice,
			name: `${shipClass} ${q}-${r}`,
			shipClass,
			q,
			r,
			health: 100,
			fuel: 100,
			status: "idle",
			...extra
		})
		.returning();
	return row!;
}
const balance = async (stateId: number) =>
	Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance);

describe("hex geometry", () => {
	it("has six in-bounds neighbours and symmetric distance", () => {
		const neighbours = hexNeighbors({ q: 3, r: 4 });
		expect(neighbours).toHaveLength(6);
		expect(neighbours.every(inBounds)).toBe(true);
		expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 1 })).toBe(hexDistance({ q: 3, r: 1 }, { q: 0, r: 0 }));
	});

	it("routes around an obstacle when a route exists", () => {
		const blocked = new Set([hexKey({ q: 1, r: 0 })]);
		const path = findPath({ q: 0, r: 0 }, { q: 2, r: 0 }, blocked);
		expect(path).not.toBeNull();
		expect(path![0]).toEqual({ q: 0, r: 0 });
		expect(path!.at(-1)).toEqual({ q: 2, r: 0 });
		expect(path!.some((h: Hex) => hexKey(h) === hexKey({ q: 1, r: 0 }))).toBe(false);
	});

	it("maps region coordinates and degrades navigation under GNSS jamming", () => {
		const hex = hexFromLatLon(45, 10);
		expect(inBounds(hex)).toBe(true);
		expect(gnssSpeedFactor(0)).toBe(1);
		expect(gnssSpeedFactor(GNSS.shipStrength)).toBeLessThan(1);
		expect(gnssAccuracyPenalty(GNSS.shipStrength)).toBeGreaterThan(0);
		expect(gnssAccuracyPenalty(999)).toBe(GNSS.maxAccuracyPenalty);
	});
});

describe("fleet service", () => {
	it("refuses orders from anyone but the president or defence minister", async () => {
		const region = await coastalRegion(freedonia);
		await expect(buildPort(handle.db, "user-2", { name: "Wrong", regionId: region.id })).rejects.toBeInstanceOf(
			FleetError
		);
		const before = await balance(freedonia);
		await buildPort(handle.db, alice, { name: "Right", regionId: region.id });
		expect(await balance(freedonia)).toBeLessThan(before);
	});

	it("allows one port per coastal region, never inland", async () => {
		const inland = await coastalRegion(freedonia, "plains");
		await expect(buildPort(handle.db, alice, { name: "Inland", regionId: inland.id })).rejects.toThrow("maritime");
		const coast = await coastalRegion(freedonia);
		await buildPort(handle.db, alice, { name: "Only port", regionId: coast.id });
		await expect(buildPort(handle.db, alice, { name: "Second", regionId: coast.id })).rejects.toThrow(
			"already has a port"
		);
		const candidates = await portCandidates(handle.db, freedonia);
		expect(candidates.some((c) => c.id === coast.id)).toBe(false);
		expect(candidates.some((c) => c.id === inland.id)).toBe(false);
	});

	it("builds a port and dock, then constructs and repairs through the queue", async () => {
		const region = await coastalRegion(freedonia);
		const built = await buildPort(handle.db, alice, { name: "New Port", regionId: region.id });
		expect(built.name).toBe("New Port");
		const builtDock = await buildDock(handle.db, alice, built.id);
		expect(builtDock.level).toBe(1);
		await orderShip(handle.db, alice, builtDock.id, "corvette");

		let summary = await processFleetTick(handle.db, NOW);
		expect(summary.constructed).toBe(0); // just activated, not finished
		const [job] = await handle.db.select().from(fleetDockQueue);
		expect(job!.status).toBe("building");

		await handle.db.update(fleetDockQueue).set({ completesAt: new Date(NOW.getTime() - 1) });
		summary = await processFleetTick(handle.db, NOW);
		expect(summary.constructed).toBe(1);
		const ships = await handle.db.select().from(fleetShips);
		expect(ships).toHaveLength(1);
		expect(ships[0]!.shipClass).toBe("corvette");
		expect(ships[0]!.q).toBe(built.q);
		expect(ships[0]!.r).toBe(built.r);
		expect(ships[0]!.health).toBe(90);

		await handle.db.update(fleetShips).set({ health: 30 });
		await repairShip(handle.db, alice, ships[0]!.id);
		await processFleetTick(handle.db, NOW); // activates the repair job
		await handle.db
			.update(fleetDockQueue)
			.set({ completesAt: new Date(NOW.getTime() - 1) })
			.where(eq(fleetDockQueue.kind, "repair"));
		summary = await processFleetTick(handle.db, NOW);
		expect(summary.repaired).toBe(1);
		expect((await handle.db.select().from(fleetShips))[0]!.health).toBe(90);
	});

	it("expands ports and docks by level", async () => {
		const region = await coastalRegion(freedonia);
		const p = await buildPort(handle.db, alice, { name: "Growth Port", regionId: region.id });
		expect(p.level).toBe(1);
		const upgraded = await upgradePort(handle.db, alice, p.id);
		expect(upgraded.level).toBe(2);
		const d1 = await buildDock(handle.db, alice, p.id);
		const d2 = await buildDock(handle.db, alice, p.id);
		expect([d1.level, d2.level]).toEqual([1, 2]);
		await expect(upgradePort(handle.db, "user-2", p.id)).rejects.toBeInstanceOf(FleetError);
	});

	it("moves a ship one hex per leg and burns fuel", async () => {
		const s = await ship(freedonia, "corvette", 0, 0, { fuel: 50 });
		await moveShip(handle.db, alice, s.id, { q: 2, r: 0 });
		let fresh = (await handle.db.select().from(fleetShips).where(eq(fleetShips.id, s.id)))[0]!;
		expect(fresh.status).toBe("moving");
		expect(fresh.orderPath).toHaveLength(2);

		await handle.db
			.update(fleetShips)
			.set({ legArrivesAt: new Date(NOW.getTime() - 1) })
			.where(eq(fleetShips.id, s.id));
		await processFleetTick(handle.db, NOW);
		fresh = (await handle.db.select().from(fleetShips).where(eq(fleetShips.id, s.id)))[0]!;
		expect({ q: fresh.q, r: fresh.r }).toEqual({ q: 1, r: 0 });
		expect(fresh.fuel).toBe(47); // 50 - one corvette leg (3)

		await handle.db
			.update(fleetShips)
			.set({ legArrivesAt: new Date(NOW.getTime() - 1) })
			.where(eq(fleetShips.id, s.id));
		await processFleetTick(handle.db, NOW);
		fresh = (await handle.db.select().from(fleetShips).where(eq(fleetShips.id, s.id)))[0]!;
		expect({ q: fresh.q, r: fresh.r }).toEqual({ q: 2, r: 0 });
		expect(fresh.status).toBe("idle");
	});

	it("refuses a route longer than the fuel aboard carries", async () => {
		// A corvette burns 3 fuel a hex: 7 fuel is two hexes of range.
		const s = await ship(freedonia, "corvette", 0, 3, { fuel: 7 });
		await expect(moveShip(handle.db, alice, s.id, { q: 3, r: 3 })).rejects.toThrow(/Out of range/);
		await moveShip(handle.db, alice, s.id, { q: 2, r: 3 });
	});

	it("lays mines that turn merchant ships back and damage warships", async () => {
		// Freedonia's minelayer sits beside a Sylvania minefield.
		const friendlyMiner = await ship(freedonia, "frigate", 0, 0, { health: 100 });
		await layMines(handle.db, alice, friendlyMiner.id);
		const ownMines = await handle.db.select().from(navalMines);
		expect(ownMines).toHaveLength(1);

		// The mine belongs to Freedonia, so Sylvania's tanker is blocked by it.
		const enemyTanker = await ship(sylvania, "tanker", 0, 1, { fuel: 50 });
		await moveShip(handle.db, sylvanCommander, enemyTanker.id, { q: 0, r: 0 });
		await handle.db
			.update(fleetShips)
			.set({ legArrivesAt: new Date(NOW.getTime() - 1) })
			.where(eq(fleetShips.id, enemyTanker.id));
		const summary = await processFleetTick(handle.db, NOW);
		expect(summary.blocked).toBe(1);
		const still = (await handle.db.select().from(fleetShips).where(eq(fleetShips.id, enemyTanker.id)))[0]!;
		expect({ q: still.q, r: still.r }).toEqual({ q: 0, r: 1 });
		expect(still.status).toBe("idle");
	});

	it("refuels at a port and loads/unloads cargo", async () => {
		const p = await port(freedonia, 1, 1, 200, { steel: 300 });
		const s = await ship(freedonia, "container_ship", 1, 1, { fuel: 10 });
		const refuel = await refuelShip(handle.db, alice, s.id);
		expect(refuel.amount).toBe(130); // 140 capacity - 10 already aboard
		expect((await handle.db.select().from(fleetShips).where(eq(fleetShips.id, s.id)))[0]!.fuel).toBe(140);
		await transportCargo(handle.db, alice, {
			shipId: s.id,
			portId: p.id,
			resource: "steel",
			amount: 200,
			direction: "load"
		});
		let fresh = (await handle.db.select().from(fleetShips).where(eq(fleetShips.id, s.id)))[0]!;
		expect(fresh.cargoType).toBe("steel");
		expect(fresh.cargoAmount).toBe(200);
		await transportCargo(handle.db, alice, {
			shipId: s.id,
			portId: p.id,
			resource: "steel",
			amount: 200,
			direction: "unload"
		});
		fresh = (await handle.db.select().from(fleetShips).where(eq(fleetShips.id, s.id)))[0]!;
		expect(fresh.cargoAmount).toBe(0);
		expect((await handle.db.select().from(seaPorts).where(eq(seaPorts.id, p.id)))[0]!.stock!.steel).toBe(300);
	});

	it("sums GNSS jamming from sea, land and air and slows jammed ships", async () => {
		// The victim sits where a shore region and an air base project onto the sea.
		const target = hexFromLatLon(45, 10);
		const victim = await ship(freedonia, "frigate", target.q, target.r, { fuel: 100 });
		await ship(sylvania, "gnss_jammer", target.q + 1, target.r, { fuel: 100 });

		const [landRegion] = await handle.db
			.insert(regions)
			.values({ latitude: "45.0", longitude: "10.0", stateId: sylvania })
			.returning();
		const [airRegion] = await handle.db
			.insert(regions)
			.values({ latitude: "46.0", longitude: "11.0", stateId: sylvania })
			.returning();
		await handle.db.insert(militaryUnits).values([
			{
				name: "Enemy EW battalion",
				ownerId: "user-3",
				stateId: sylvania,
				regionId: landRegion!.id,
				unitType: "air_defence",
				isTraining: false,
				health: 100
			},
			{
				name: "Enemy EW fighters",
				ownerId: "user-3",
				stateId: sylvania,
				regionId: airRegion!.id,
				unitType: "fighter_squadron",
				isTraining: false,
				health: 100
			}
		]);

		const jam = await gnssJammingAt(handle.db, target, freedonia);
		expect(jam.sources.map((s) => s.domain).sort()).toEqual(["air", "land", "sea"]);
		expect(jam.strength).toBe(GNSS.shipStrength + GNSS.landStrength + GNSS.airStrength);

		const leg = await moveShip(handle.db, alice, victim.id, { q: target.q, r: target.r + 1 });
		const clearHours = 1.5; // a frigate's unjammed leg
		expect(leg.hours).toBeCloseTo(clearHours * gnssSpeedFactor(jam.strength), 2);
		expect(leg.jamming).toBe(jam.strength);
	});

	it("resolves combat between hostile fleets in range", async () => {
		await ship(freedonia, "frigate", 0, 0, { health: 140 });
		await ship(sylvania, "corvette", 1, 0, { health: 90 });
		const summary = await processFleetTick(handle.db, NOW, () => 0); // every shot hits
		expect(summary.engagements).toBeGreaterThan(0);
		expect(summary.hits).toBeGreaterThan(0);
		const enemy = (await handle.db.select().from(fleetShips).where(eq(fleetShips.stateId, sylvania)))[0]!;
		expect(enemy.health).toBeLessThan(90);
		const hits = await handle.db.select().from(fleetEvents).where(eq(fleetEvents.kind, "fleet_fire"));
		expect(hits.length).toBeGreaterThan(0);
	});

	it("reports blockaded ports in the map snapshot", async () => {
		const p = await port(freedonia, 2, 3);
		await handle.db.insert(navalMines).values({
			stateId: sylvania,
			q: 3,
			r: 3,
			strength: 100,
			expiresAt: new Date(NOW.getTime() + 3_600_000)
		});
		const world = await loadFleetWorld(handle.db, freedonia);
		expect(world.blockedPorts[p.id]).toBe(true);
	});
});
