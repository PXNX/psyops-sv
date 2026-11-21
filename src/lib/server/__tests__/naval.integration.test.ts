// Sea power against a real (in-memory) Postgres: who may launch, fleet and
// coast requirements, paying and logging, blockades and their effect on the
// target's grid, shore bombardment damage, sea-lane raids and amphibious
// assaults that open a battle without a land border.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	battleParticipants,
	battles,
	governmentBudgetTransactions,
	militaryUnits,
	ministers,
	navalBlockades,
	navalOperations,
	regions,
	states,
	stateEnergy,
	stateTreasury,
	wars
} from "../schema";
import {
	NavalOpError,
	blockadesOn,
	isBlockaded,
	launchNavalOperation,
	navalAuthority,
	navalLedger,
	seaControlOf
} from "../services/military/naval";
import { effectiveEnergy } from "../services/military/state-effects";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let homePort: number;
let enemyCoast: number;
const userId = "user-1";

const HOUR = 3600_000;
const T = new Date();
const at = (h: number) => new Date(T.getTime() + h * HOUR);
/** [success, secondary roll]. */
const draws = (...xs: number[]) => {
	let i = 0;
	return () => xs[Math.min(i++, xs.length - 1)]!;
};
const WIN = () => draws(0, 0);
const LOSE = () => draws(0.99, 0.99);

const balance = async (stateId: number) =>
	Number((await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance);

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	// A home port and an enemy coast with real terrain and defences.
	const [port] = await handle.db
		.insert(regions)
		.values({ latitude: "45.0", longitude: "10.0", stateId: freedonia, terrain: "shore", infrastructure: 3 })
		.returning({ id: regions.id });
	const [coast] = await handle.db
		.insert(regions)
		.values({
			latitude: "46.0",
			longitude: "11.0",
			stateId: sylvania,
			terrain: "shore",
			infrastructure: 4,
			fortifications: 2
		})
		.returning({ id: regions.id });
	homePort = port.id;
	enemyCoast = coast.id;
	// Keep the treasuries and the military fuel reserve solvent for every test.
	await handle.db.update(stateTreasury).set({ balance: 100_000_000 }).where(eq(stateTreasury.stateId, freedonia));
	await handle.db
		.insert(stateEnergy)
		.values({ stateId: freedonia, totalProduction: 1000, usedProduction: 0, militaryFuel: 100_000 })
		.onConflictDoNothing();
	await handle.db.delete(navalBlockades);
	await handle.db.delete(navalOperations);
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

/** Add ready hulls (and optionally marines) to Freedonia's home port. */
async function fleet(types: ("frigate" | "submarine" | "carrier" | "landing_ship" | "marine")[]) {
	const rows = await handle.db
		.insert(militaryUnits)
		.values(
			types.map((unitType, i) => ({
				name: `Test ${unitType} ${i}`,
				ownerId: userId,
				stateId: freedonia,
				regionId: homePort,
				unitType,
				isTraining: false,
				health: 100
			}))
		)
		.returning({ id: militaryUnits.id });
	return rows.map((r) => r.id);
}

describe("authority and fleet", () => {
	it("only presidents and defence ministers command the fleet", async () => {
		expect(await navalAuthority(handle.db, userId)).toEqual({ stateId: freedonia, role: "president" });
		expect(await navalAuthority(handle.db, "user-2")).toBeNull();
		await handle.db.insert(ministers).values({ userId: "user-2", stateId: freedonia, ministry: "defense" });
		expect(await navalAuthority(handle.db, "user-2")).toEqual({ stateId: freedonia, role: "defense" });
	});

	it("counts only healthy, trained hulls for sea control", async () => {
		const [frigate] = await fleet(["frigate"]);
		expect(await seaControlOf(handle.db, freedonia)).toBeGreaterThanOrEqual(3);
		await handle.db.update(militaryUnits).set({ health: 30 }).where(eq(militaryUnits.id, frigate!));
		expect(await seaControlOf(handle.db, freedonia)).toBeGreaterThanOrEqual(1);
	});
});

describe("launching naval operations", () => {
	it("refuses an operation without the right hull", async () => {
		await handle.db.delete(militaryUnits).where(eq(militaryUnits.stateId, freedonia));
		await expect(
			launchNavalOperation(handle.db, {
				stateId: freedonia,
				orderedBy: userId,
				kind: "blockade",
				targetStateId: sylvania,
				rng: WIN(),
				now: at(1)
			})
		).rejects.toThrow(NavalOpError);
	});

	it("pays, establishes a blockade and exposes it to the rest of the economy", async () => {
		await fleet(["frigate", "frigate"]);
		const before = await balance(freedonia);
		const result = await launchNavalOperation(handle.db, {
			stateId: freedonia,
			orderedBy: userId,
			kind: "blockade",
			targetStateId: sylvania,
			rng: WIN(),
			now: at(2)
		});
		expect(result.succeeded).toBe(true);
		expect(result.strength).toBeGreaterThan(0);
		expect(await balance(freedonia)).toBe(before - 120_000);
		expect((await handle.db.select().from(navalBlockades).where(eq(navalBlockades.targetStateId, sylvania))).length).toBe(1);
		expect(await isBlockaded(handle.db, sylvania, at(3))).toBe(true);
		expect(await isBlockaded(handle.db, sylvania, at(200))).toBe(false);
		expect((await blockadesOn(handle.db, sylvania, at(3))).length).toBe(1);
		const energy = await effectiveEnergy(handle.db, sylvania, { totalProduction: 1000, usedProduction: 0 }, at(3));
		expect(energy.totalProduction).toBeLessThan(1000);
		expect((await handle.db.select().from(governmentBudgetTransactions).where(eq(governmentBudgetTransactions.description, "Blockade against state " + sylvania))).length).toBe(1);
		expect((await navalLedger(handle.db, freedonia)).some((o) => o.kind === "blockade")).toBe(true);
	});

	it("bombards a coastal region: levels, defenders and civilians suffer", async () => {
		await fleet(["frigate"]);
		const [defender] = await handle.db
			.insert(militaryUnits)
			.values({
				name: "Coastal garrison",
				ownerId: "user-3",
				stateId: sylvania,
				regionId: enemyCoast,
				unitType: "infantry",
				isTraining: false,
				health: 100
			})
			.returning({ id: militaryUnits.id });
		const before = (await handle.db.select().from(regions).where(eq(regions.id, enemyCoast)))[0]!;
		const result = await launchNavalOperation(handle.db, {
			stateId: freedonia,
			orderedBy: userId,
			kind: "shore_bombardment",
			regionId: enemyCoast,
			rng: WIN(),
			now: at(10)
		});
		expect(result.succeeded).toBe(true);
		const after = (await handle.db.select().from(regions).where(eq(regions.id, enemyCoast)))[0]!;
		expect(after.infrastructure).toBeLessThan(before.infrastructure!);
		expect((await handle.db.select().from(militaryUnits).where(eq(militaryUnits.id, defender!.id)))[0]!.health).toBeLessThan(100);
		expect(result.damage?.levels?.fortifications).toBeGreaterThan(0);
	});

	it("raids sea lanes: the target loses money and the raider gains it", async () => {
		await fleet(["submarine"]);
		await handle.db.update(stateTreasury).set({ balance: 50_000_000 }).where(eq(stateTreasury.stateId, sylvania));
		const raiderBefore = await balance(freedonia);
		const targetBefore = await balance(sylvania);
		const result = await launchNavalOperation(handle.db, {
			stateId: freedonia,
			orderedBy: userId,
			kind: "sea_lane_raid",
			targetStateId: sylvania,
			rng: WIN(),
			now: at(20)
		});
		expect(result.succeeded).toBe(true);
		expect(result.damage?.haul).toBeGreaterThan(0);
		expect(await balance(sylvania)).toBe(targetBefore - result.damage!.haul!);
		expect(await balance(freedonia)).toBe(raiderBefore + result.damage!.haul! - 60_000);
	});

	it("lands marines in an amphibious assault and opens a battle", async () => {
		await fleet(["landing_ship"]);
		const marines = await fleet(["marine", "marine"]);
			// Make sure there is a direct war between the two states.
		await handle.db
			.insert(wars)
			.values({ attackerId: freedonia, defenderId: sylvania, declaredBy: userId, status: "active" });
		// Wipe the demo battle in this region so the landing can create one.
		await handle.db.delete(battles).where(eq(battles.regionId, enemyCoast));
		const before = (await handle.db.select().from(battles).where(eq(battles.regionId, enemyCoast))).length;
		const result = await launchNavalOperation(handle.db, {
			stateId: freedonia,
			orderedBy: userId,
			kind: "amphibious_assault",
			regionId: enemyCoast,
			rng: WIN(),
			now: at(30)
		});
		expect(before).toBe(0);
		expect(result.succeeded).toBe(true);
		expect(result.damage?.battleId).toBeTruthy();
		const battle = (await handle.db.select().from(battles).where(eq(battles.id, result.damage!.battleId!)))[0]!;
		expect(battle.amphibious).toBe(true);
		expect(battle.warId).toBeTruthy();
		const landed = await handle.db
			.select()
			.from(battleParticipants)
			.where(and(eq(battleParticipants.battleId, battle.id), eq(battleParticipants.side, "attacker")));
		expect(landed.length).toBe(marines.length);
	});

	it("a failed operation only costs money and is logged as failed", async () => {
		const before = await balance(freedonia);
		const result = await launchNavalOperation(handle.db, {
			stateId: freedonia,
			orderedBy: userId,
			kind: "minelaying",
			regionId: enemyCoast,
			rng: LOSE(),
			now: at(40)
		});
		expect(result.succeeded).toBe(false);
		expect(await balance(freedonia)).toBe(before - 40_000);
		expect((await navalLedger(handle.db, freedonia, 1))[0]!.outcome).toBe("failed");
	});

	it("refuses a landing without marines", async () => {
		await handle.db.delete(militaryUnits).where(eq(militaryUnits.unitType, "marine"));
		await handle.db.delete(battles).where(eq(battles.regionId, enemyCoast));
		await expect(
			launchNavalOperation(handle.db, {
				stateId: freedonia,
				orderedBy: userId,
				kind: "amphibious_assault",
				regionId: enemyCoast,
				rng: WIN(),
				now: at(50)
			})
		).rejects.toThrow(/marine/i);
	});
});
