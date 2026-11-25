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
	dedicateCivicProject,
	patronage,
	regionOpinion,
	startCivicProject,
	upgradeCivicProject
} from "../services/politics/civic.service";

const DAY = 86_400_000;
const t0 = new Date("2026-04-06T08:00:00Z");
let handle: MockDbHandle;
let regionId: number;
let firstId: number;
const at = (days: number) => new Date(t0.getTime() + days * DAY);

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

		firstId = project.id;
		const p = await patronage(handle.db, "user-1");
		expect(p.completed).toBeGreaterThanOrEqual(1);
		expect(p.goodwill).toBeGreaterThanOrEqual(6);
	});

	it("expands a finished building, keeping its goodwill while the work goes on", async () => {
		const opinion = await regionOpinion(handle.db, regionId, at(6));
		const before = await wallet();
		await expect(upgradeCivicProject(handle.db, { userId: "user-2", projectId: firstId, now: at(6) })).rejects.toThrow(
			/not yours/
		);
		const { toTier, cost } = await upgradeCivicProject(handle.db, { userId: "user-1", projectId: firstId, now: at(6) });
		expect(toTier).toBe(2);
		expect(await wallet()).toBe(before - cost);
		await expect(upgradeCivicProject(handle.db, { userId: "user-1", projectId: firstId, now: at(6) })).rejects.toThrow(
			/under way/
		);
		expect(await regionOpinion(handle.db, regionId, at(7))).toBe(opinion);

		await completeCivicProjects(handle.db, at(10));
		const [row] = await handle.db.select().from(civicProjects).where(eq(civicProjects.id, firstId));
		expect(row!.tier).toBe(2);
		expect(row!.upgradeCompletesAt).toBeNull();
		expect(await regionOpinion(handle.db, regionId, at(10))).toBe(opinion + 3); // 6 → 9
	});

	it("sells naming rights for a plaque that adds a point", async () => {
		const opinion = await regionOpinion(handle.db, regionId, at(10));
		await expect(
			dedicateCivicProject(handle.db, { userId: "user-1", projectId: firstId, plaque: "<b>", now: at(10) })
		).rejects.toThrow(CivicError);
		const before = await wallet();
		const row = await dedicateCivicProject(handle.db, {
			userId: "user-1",
			projectId: firstId,
			plaque: "  The Founders'   Well ",
			now: at(10)
		});
		expect(row.plaque).toBe("The Founders' Well");
		expect(await wallet()).toBe(before - 5_000);
		expect(await regionOpinion(handle.db, regionId, at(10))).toBe(opinion + 1);
	});

	it("counts a second building in the same region for less", async () => {
		await handle.db.update(userWallets).set({ balance: 200_000 }).where(eq(userWallets.userId, "user-1"));
		const opinion = await regionOpinion(handle.db, regionId, at(10));
		await startCivicProject(handle.db, { userId: "user-1", regionId, type: "clinic", now: at(10) });
		await completeCivicProjects(handle.db, at(21));
		// A clinic is worth 9 alone, but as the region's second building only 75%.
		expect(await regionOpinion(handle.db, regionId, at(21))).toBe(opinion + 7);
		const p = await patronage(handle.db, "user-1", at(21));
		const clinic = p.projects.find((x) => x.buildingType === "clinic")!;
		expect(clinic.multiplier).toBe(0.75);
		expect(clinic.goodwill).toBeCloseTo(6.75);
	});
});
