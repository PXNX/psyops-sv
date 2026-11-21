// Regime stability and the population tick against a real (in-memory) Postgres.
// Stability is derived from records other systems already write, so these tests
// change one record at a time and watch the score move.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { regions, states, stateEffects } from "../schema";
import { POPULATION_FLOOR } from "#lib/config/index.js";
import { populationTick, stateStability, stateStabilities } from "../services/stability";

const DAY = 86_400_000;
let handle: MockDbHandle;
let stateId: number;
const now = new Date();

beforeAll(async () => {
	handle = await createMockDb();
	// Any owned region will do; take the first one that belongs to a state.
	const owned = (await handle.db.select().from(regions)).find((row) => row.stateId != null)!;
	stateId = owned.stateId!;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("regime stability", () => {
	it("returns a bounded score with a full breakdown for a real state", async () => {
		const result = await stateStability(handle.db, stateId, now);
		expect(result).not.toBeNull();
		expect(result!.score).toBeGreaterThanOrEqual(0);
		expect(result!.score).toBeLessThanOrEqual(100);
		expect(result!.breakdown).toHaveLength(11);
	});

	it("computes many states at once", async () => {
		const all = await handle.db.select({ id: states.id }).from(states);
		const map = await stateStabilities(
			handle.db,
			all.map((s) => s.id),
			now
		);
		expect(map.size).toBe(all.length);
	});

	it("drops when the state turns to unrestricted extraction", async () => {
		const [before] = await handle.db.select({ policy: states.exploitationPolicy }).from(states).where(eq(states.id, stateId));
		const base = (await stateStability(handle.db, stateId, now))!.score;
		await handle.db.update(states).set({ exploitationPolicy: "unrestricted" }).where(eq(states.id, stateId));
		const harsh = (await stateStability(handle.db, stateId, now))!.score;
		expect(harsh).toBeLessThan(base);
		await handle.db.update(states).set({ exploitationPolicy: before!.policy }).where(eq(states.id, stateId));
	});

	it("drops while an enemy propaganda campaign is active", async () => {
		const base = (await stateStability(handle.db, stateId, now))!.score;
		const [effect] = await handle.db
			.insert(stateEffects)
			.values({
				stateId,
				kind: "morale_shaken",
				magnitude: 20,
				startsAt: now,
				expiresAt: new Date(now.getTime() + DAY)
			})
			.returning();
		const shaken = (await stateStability(handle.db, stateId, now))!.score;
		expect(shaken).toBeLessThan(base);
		await handle.db.delete(stateEffects).where(eq(stateEffects.id, effect!.id));
	});

	it("returns null for a state that does not exist", async () => {
		expect(await stateStability(handle.db, 999_999, now)).toBeNull();
	});
});

describe("populationTick", () => {
	it("moves populations without ever crossing the floor", async () => {
		const before = (await handle.db.select().from(regions)).map((r) => ({ id: r.id, population: r.population }));
		const result = await populationTick(handle.db, now, 365);
		expect(result.days).toBe(365);
		expect(result.regionsChanged).toBeGreaterThan(0);
		const after = await handle.db.select({ id: regions.id, population: regions.population }).from(regions);
		for (const row of after) {
			expect(row.population!).toBeGreaterThanOrEqual(POPULATION_FLOOR);
		}
		expect(after.length).toBe(before.length);
	});
});
