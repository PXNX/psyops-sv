// Sea reconnaissance against the in-memory Postgres: sonar finds submarines,
// radar sees the surface but not subs, cooldowns hold, and reports feed the
// map's fog-of-war. The air arm's fuel and experience are checked here too.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { fleetShips, militaryUnits, navalMines, seaIntelMissions, stateEnergy, stateTreasury, userWallets } from "../schema";
import {
	SeaIntelError,
	launchSeaIntel,
	latestSeaIntel,
	resolveSeaIntelMissions,
	seaPicture
} from "../services/military/sea-intel";
import { airSupportOf, tickUnitFuel } from "../services/military/fleet";
import { hexKey } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
const alice = "user-1";
const NOW = new Date();

beforeAll(async () => {
	handle = await createMockDb();
	const treasuries = await handle.db.select().from(stateTreasury);
	freedonia = Math.min(...treasuries.map((t) => t.stateId));
	sylvania = treasuries.map((t) => t.stateId).sort((a, b) => a - b)[1]!;
	await handle.db.update(userWallets).set({ balance: 1_000_000 }).where(eq(userWallets.userId, alice));
	await handle.db
		.insert(stateEnergy)
		.values({ stateId: freedonia, totalProduction: 1000, usedProduction: 0, militaryFuel: 10_000 })
		.onConflictDoNothing();
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

beforeEach(async () => {
	await handle.db.delete(seaIntelMissions);
	await handle.db.delete(fleetShips);
	await handle.db.delete(navalMines);
	await handle.db.delete(militaryUnits).where(eq(militaryUnits.ownerId, alice));
});

describe("sea reconnaissance", () => {
	it("sonar finds a submarine, radar does not", async () => {
		await handle.db.insert(fleetShips).values({
			stateId: sylvania,
			ownerId: "user-3",
			name: "Enemy sub",
			shipClass: "torpedo_sub",
			q: 4,
			r: 4,
			health: 70,
			fuel: 70
		});
		await launchSeaIntel(handle.db, { userId: alice, q: 4, r: 4, sensor: "sonar", now: NOW });
		await handle.db.update(seaIntelMissions).set({ completesAt: new Date(NOW.getTime() - 1) });
		expect(await resolveSeaIntelMissions(handle.db, NOW, () => 0)).toBe(1);
		const report = await latestSeaIntel(handle.db, [freedonia], { q: 4, r: 4 }, NOW);
		expect(report?.findings?.contacts.sub).toBe(1);

		await handle.db.delete(seaIntelMissions);
		await launchSeaIntel(handle.db, { userId: alice, q: 4, r: 4, sensor: "naval_radar", now: NOW });
		await handle.db.update(seaIntelMissions).set({ completesAt: new Date(NOW.getTime() - 1) });
		await resolveSeaIntelMissions(handle.db, NOW, () => 0);
		const radar = await latestSeaIntel(handle.db, [freedonia], { q: 4, r: 4 }, NOW);
		expect(radar?.findings?.contacts.sub ?? 0).toBe(0);
	});

	it("enforces the per-player cooldown and feeds the fog-of-war picture", async () => {
		await launchSeaIntel(handle.db, { userId: alice, q: 6, r: 5, sensor: "sonar", now: NOW });
		await expect(launchSeaIntel(handle.db, { userId: alice, q: 6, r: 5, sensor: "sonar", now: NOW })).rejects.toBeInstanceOf(
			SeaIntelError
		);
		await handle.db.update(seaIntelMissions).set({
			completesAt: new Date(NOW.getTime() - 1),
			status: "completed",
			findings: { contacts: { surface: 2 }, mines: 1, confidence: 70 },
			observedAt: NOW
		});
		const picture = await seaPicture(handle.db, [freedonia], NOW);
		expect(picture[hexKey({ q: 6, r: 5 })]?.contacts.surface).toBe(2);
	});

	it("counts air roles and refuels units from the state reserve", async () => {
		const [bomber] = await handle.db
			.insert(militaryUnits)
			.values({
				name: "Test naval bomber",
				ownerId: alice,
				stateId: freedonia,
				regionId: 1,
				unitType: "naval_bomber",
				isTraining: false,
				health: 100,
				fuel: 40,
				experience: 0
			})
			.returning();
		const air = await airSupportOf(handle.db, freedonia);
		expect(air.byType.naval_bomber).toBe(1);
		expect(air.roles.naval_strike).toBeGreaterThan(0);

		const refuel = await tickUnitFuel(handle.db);
		expect(refuel.refilled).toBeGreaterThan(0);
		const after = (await handle.db.select().from(militaryUnits).where(eq(militaryUnits.id, bomber!.id)))[0]!;
		expect(after.fuel).toBeGreaterThan(40);
	});
});
