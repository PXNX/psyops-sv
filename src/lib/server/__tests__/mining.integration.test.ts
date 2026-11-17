// Mining against a real (in-memory) Postgres: deposits, laws and depletion.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { regionDeposits, regions, states } from "../schema";
import { extractFromDeposit } from "../services/economy/mining";

let handle: MockDbHandle;
let regionId: number;
let stateId: number;

const deposit = async (resource: "iron" | "copper" | "coal" | "wood") =>
	(
		await handle.db
			.select()
			.from(regionDeposits)
			.where(and(eq(regionDeposits.regionId, regionId), eq(regionDeposits.resourceType, resource)))
	)[0];

const setDeposit = (resource: "iron" | "copper" | "coal" | "wood", capacity: number, remaining: number) =>
	handle.db
		.insert(regionDeposits)
		.values({ regionId, resourceType: resource, capacity, remaining })
		.onConflictDoUpdate({
			target: [regionDeposits.regionId, regionDeposits.resourceType],
			set: { capacity, remaining }
		});

const setPolicy = (policy: "conservation" | "standard" | "industrial" | "unrestricted") =>
	handle.db.update(states).set({ exploitationPolicy: policy }).where(eq(states.id, stateId));

beforeAll(async () => {
	handle = await createMockDb();
	const [r] = await handle.db.select().from(regions).limit(1);
	regionId = r!.id;
	stateId = r!.stateId!;
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("extractFromDeposit", () => {
	it("mines a full deposit at full yield under the standard law and draws it down", async () => {
		await setPolicy("standard");
		await setDeposit("iron", 10_000, 10_000);
		const x = await handle.db.transaction((tx) => extractFromDeposit(tx, regionId, "iron", 10));
		expect(x).toMatchObject({ produced: 10, depleted: 10, remaining: 9990, policy: "standard" });
		expect((await deposit("iron"))!.remaining).toBe(9990);
	});

	it("yields more but drains faster under a harsher law", async () => {
		await setDeposit("iron", 10_000, 10_000);
		await setPolicy("unrestricted");
		const hard = await handle.db.transaction((tx) => extractFromDeposit(tx, regionId, "iron", 10));
		expect(hard.produced).toBeGreaterThan(10);
		expect(hard.depleted).toBeGreaterThan(hard.produced);
		await setPolicy("standard");
	});

	it("yields less from a nearly exhausted deposit", async () => {
		await setDeposit("copper", 10_000, 500);
		const x = await handle.db.transaction((tx) => extractFromDeposit(tx, regionId, "copper", 100));
		expect(x.produced).toBeLessThan(40);
		expect(x.produced).toBeGreaterThan(0);
	});

	it("produces nothing where the region has no deposit, and from an empty one", async () => {
		await handle.db
			.delete(regionDeposits)
			.where(and(eq(regionDeposits.regionId, regionId), eq(regionDeposits.resourceType, "wood")));
		expect((await handle.db.transaction((tx) => extractFromDeposit(tx, regionId, "wood", 10))).produced).toBe(0);
		await setDeposit("coal", 1000, 0);
		expect((await handle.db.transaction((tx) => extractFromDeposit(tx, regionId, "coal", 10))).produced).toBe(0);
	});

	it("never takes a deposit below zero, even when shifts pile up", async () => {
		await setDeposit("coal", 1000, 25);
		let total = 0;
		for (let i = 0; i < 100; i++)
			total += (await handle.db.transaction((tx) => extractFromDeposit(tx, regionId, "coal", 10))).produced;
		expect((await deposit("coal"))!.remaining).toBe(0);
		expect(total).toBeGreaterThan(0);
		expect(total).toBeLessThanOrEqual(25);
	});

	it("rejects a deposit that would hold more than its capacity", async () => {
		await expect(setDeposit("iron", 100, 200)).rejects.toThrow();
	});
});
