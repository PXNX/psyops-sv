// Supply autonomy against a real (in-memory) Postgres: domestic stock vs bloc
// partners vs paid trade lanes, and how a blockade throttles a reliant line.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	navalBlockades,
	stateProductInventory,
	stateResourceInventory,
	states,
	tradeLanes
} from "../schema";
import { factorySourcing, stateAutonomy, stateStockOf } from "../services/economy/autonomy";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
const HOUR = 3600_000;
const T = new Date();

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	// Domestic steel, no domestic silicon.
	await handle.db
		.insert(stateResourceInventory)
		.values({ stateId: freedonia, resourceType: "steel", quantity: 500 })
		.onConflictDoUpdate({ target: [stateResourceInventory.stateId, stateResourceInventory.resourceType], set: { quantity: 500 } });
	// Sylvania has silicon and a lane connects the two.
	await handle.db
		.insert(stateResourceInventory)
		.values({ stateId: sylvania, resourceType: "silicon", quantity: 500 })
		.onConflictDoUpdate({ target: [stateResourceInventory.stateId, stateResourceInventory.resourceType], set: { quantity: 500 } });
	await handle.db.insert(tradeLanes).values({
		stateId: freedonia,
		partnerStateId: sylvania,
		kind: "sea",
		capacity: 100,
		openedBy: "user-1"
	});
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("factory input sourcing", () => {
	it("reads strategic stockpiles", async () => {
		expect(await stateStockOf(handle.db, freedonia, "steel")).toBe(500);
		expect(await stateStockOf(handle.db, freedonia, "chips")).toBe(0);
	});

	it("labels domestic and trade-tier inputs differently", async () => {
		const sourcing = await factorySourcing(handle.db, freedonia, ["steel", "silicon"], T);
		const steel = sourcing.sources.find((s) => s.input === "steel")!;
		const silicon = sourcing.sources.find((s) => s.input === "silicon")!;
		expect(steel.tier).toBe("domestic");
		expect(silicon.tier).toBe("trade");
		expect(sourcing.factor).toBeLessThan(1);
		expect(sourcing.missing).toEqual([]);
	});

	it("a blockade throttles trade-tier sourcing but not domestic", async () => {
		const before = await factorySourcing(handle.db, freedonia, ["steel", "silicon"], T);
		await handle.db.insert(navalBlockades).values({
			blockaderStateId: sylvania,
			targetStateId: freedonia,
			strength: 100,
			startsAt: new Date(T.getTime() - HOUR),
			expiresAt: new Date(T.getTime() + 10 * HOUR)
		});
		const after = await factorySourcing(handle.db, freedonia, ["steel", "silicon"], T);
		expect(after.factor).toBeLessThan(before.factor);
		expect(after.sources.find((s) => s.input === "steel")!.factor).toBe(1);
		await handle.db.delete(navalBlockades);
	});

	it("flags inputs nobody can supply", async () => {
		const sourcing = await factorySourcing(handle.db, freedonia, ["unobtainium"], T);
		expect(sourcing.sources[0]!.tier).toBe("shortage");
		expect(sourcing.missing).toContain("unobtainium");
	});
});

describe("autonomy score", () => {
	it("rises as strategic inputs become available at home", async () => {
		const before = await stateAutonomy(handle.db, freedonia);
		await handle.db
			.insert(stateProductInventory)
			.values({ stateId: freedonia, productType: "machine_tools", quantity: 50 })
			.onConflictDoUpdate({ target: [stateProductInventory.stateId, stateProductInventory.productType], set: { quantity: 50 } });
		const after = await stateAutonomy(handle.db, freedonia);
		expect(after.score).toBeGreaterThan(before.score);
		expect(after.domestic).toBeGreaterThan(before.domestic);
	});
});
