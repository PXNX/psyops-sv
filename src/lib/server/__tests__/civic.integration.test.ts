// Civic patronage: a player's wallet buys buildings, the buildings finish on
// their own schedule, and completed ones move the region's civilian opinion.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { regions, userWallets } from "../schema";
import { civicProjects } from "../schema-investments";
import {
	CivicError,
	completeCivicProjects,
	patronage,
	regionOpinion,
	startCivicProject
} from "../services/politics/civic.service";

const DAY = 86_400_000;
const t0 = new Date("2026-04-06T08:00:00Z");
let handle: MockDbHandle;
let regionId: number;

const wallet = async () =>
	Number((await handle.db.select().from(userWallets).where(eq(userWallets.userId, "user-1")))[0]!.balance);

describe("civic patronage", () => {
	beforeAll(async () => {
		handle = await createMockDb();
		const [region] = await handle.db.select({ id: regions.id }).from(regions).limit(1);
		regionId = region!.id;
	}, 900_000);

	afterAll(async () => {
		await handle?.close();
	});

	it("rejects unknown buildings", async () => {
		await expect(
			startCivicProject(handle.db, { userId: "user-1", regionId, type: "nonsense", now: t0 })
		).rejects.toThrow(CivicError);
	});

	it("pays from the wallet and grants opinion only when the building finishes", async () => {
		const before = await wallet();
		const opinionBefore = await regionOpinion(handle.db, regionId, t0);
		const project = await startCivicProject(handle.db, {
			userId: "user-1",
			regionId,
			type: "water_works",
			now: t0
		});
		expect(await wallet()).toBe(before - 25_000);
		expect(await regionOpinion(handle.db, regionId, new Date(t0.getTime() + DAY))).toBe(opinionBefore);

		await expect(
			startCivicProject(handle.db, { userId: "user-1", regionId, type: "water_works", now: t0 })
		).rejects.toThrow(/already have/);

		await completeCivicProjects(handle.db, new Date(t0.getTime() + 6 * DAY));
		const [done] = await handle.db.select().from(civicProjects).where(eq(civicProjects.id, project.id));
		expect(done!.completed).toBe(true);
		expect(await regionOpinion(handle.db, regionId, new Date(t0.getTime() + 6 * DAY))).toBe(opinionBefore + 6);

		const p = await patronage(handle.db, "user-1");
		expect(p.completed).toBeGreaterThanOrEqual(1);
		expect(p.goodwill).toBeGreaterThanOrEqual(6);
	});
});
