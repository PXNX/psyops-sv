// Regional revolutions against a real (in-memory) Postgres: the low-support
// gate, three conspirators, and the single fight for freedom (win/draw = free).
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { regions, residences, revolutions, userWallets } from "../schema";
import { addUserItem } from "../services/economy/inventory";
import { InsufficientFundsError } from "../money";
import { fightForFreedom, joinRevolution, liveRevolution, startRevolution } from "../services/politics/revolution";
import { REVOLUTION_CONFIG } from "#lib/config/index.js";

let handle: MockDbHandle;
const regionIds: number[] = [];
const stateIds = new Map<number, number>();

const moveResidents = async (userIds: string[], regionId: number) => {
	for (const userId of userIds) {
		await handle.db.update(residences).set({ regionId }).where(eq(residences.userId, userId));
	}
};

const arm = async (userId: string) => {
	await addUserItem(handle.db, userId, "product", "rifles", REVOLUTION_CONFIG.RIFLE_COST);
	await handle.db
		.update(userWallets)
		.set({ balance: REVOLUTION_CONFIG.MONEY_COST + 50_000 })
		.where(eq(userWallets.userId, userId));
};

const startWith = async (regionId: number, users: string[], opinion: number) => {
	await moveResidents(users, regionId);
	await arm(users[0]!);
	const revolution = await startRevolution(handle.db, { userId: users[0]!, regionId, opinion });
	for (const userId of users.slice(1)) {
		await joinRevolution(handle.db, { userId, revolutionId: revolution.id });
	}
	return revolution;
};

const stateOf = async (regionId: number) =>
	(await handle.db.select({ stateId: regions.stateId }).from(regions).where(eq(regions.id, regionId)))[0]?.stateId ??
	null;

beforeAll(async () => {
	handle = await createMockDb();
	const rows = await handle.db.select({ id: regions.id, stateId: regions.stateId }).from(regions).limit(5);
	for (const r of rows) {
		regionIds.push(r.id);
		stateIds.set(r.id, r.stateId!);
	}
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("regional revolution", () => {
	it("refuses to start while civilians still support the state", async () => {
		const regionId = regionIds[0]!;
		await moveResidents(["user-1"], regionId);
		await expect(startRevolution(handle.db, { userId: "user-1", regionId, opinion: 31 })).rejects.toThrow(
			/support the state/
		);
		expect(await liveRevolution(handle.db, regionId)).toBeNull();
	});

	it("spends rifles and cash to arm the rising", async () => {
		const regionId = regionIds[3]!;
		await moveResidents(["user-5"], regionId);
		await expect(
			startRevolution(handle.db, { userId: "user-5", regionId, opinion: 20 })
		).rejects.toThrow(/need .* rifles/);
		expect(await liveRevolution(handle.db, regionId)).toBeNull();

		await arm("user-5");
		await handle.db.update(userWallets).set({ balance: REVOLUTION_CONFIG.MONEY_COST - 1 }).where(eq(userWallets.userId, "user-5"));
		await expect(
			startRevolution(handle.db, { userId: "user-5", regionId, opinion: 20 })
		).rejects.toThrow(InsufficientFundsError);
		expect(await liveRevolution(handle.db, regionId)).toBeNull();
	});

	it("needs three conspirators and frees the region on a victory", async () => {
		const regionId = regionIds[0]!;
		const originalState = stateIds.get(regionId)!;
		const revolution = await startWith(regionId, ["user-1", "user-2"], 20);

		await expect(
			fightForFreedom(handle.db, { userId: "user-2", revolutionId: revolution.id, opinion: 20 })
		).rejects.toThrow(/At least 3/);

		await moveResidents(["user-3"], regionId);
		await joinRevolution(handle.db, { userId: "user-3", revolutionId: revolution.id });
		await expect(joinRevolution(handle.db, { userId: "user-3", revolutionId: revolution.id })).rejects.toThrow(
			/already joined/
		);

		const result = await fightForFreedom(handle.db, { userId: "user-1", revolutionId: revolution.id, opinion: 20 });
		expect(result.memberCount).toBe(3);
		expect(result.outcome).toBe("victory");
		expect(result.independent).toBe(true);
		expect(await stateOf(regionId)).toBeNull();
		const [row] = await handle.db.select().from(revolutions).where(eq(revolutions.id, revolution.id));
		expect(row!.status).toBe("independent");
		expect(row!.rebelPower).toBeGreaterThan(row!.governmentPower!);
		// Region autonomy survives the revolution: original state is remembered only in history.
		expect(row!.stateId).toBe(originalState);
	});

	it("keeps the region in its state when the rising is defeated", async () => {
		const regionId = regionIds[4]!;
		const originalState = stateIds.get(regionId)!;
		// A well-fortified government garrison can crush even an angry rising.
		await handle.db.update(regions).set({ fortifications: 8 }).where(eq(regions.id, regionId));
		const revolution = await startWith(regionId, ["user-4", "user-5", "user-1"], 30);
		const result = await fightForFreedom(handle.db, { userId: "user-4", revolutionId: revolution.id, opinion: 30 });
		expect(result.outcome).toBe("defeat");
		expect(result.independent).toBe(false);
		expect(await stateOf(regionId)).toBe(originalState);
		const [row] = await handle.db.select().from(revolutions).where(eq(revolutions.id, revolution.id));
		expect(row!.status).toBe("crushed");
	});

	it("frees the region on a draw as well", async () => {
		const regionId = regionIds[1]!;
		const revolution = await startWith(regionId, ["user-2", "user-3", "user-5"], 29);
		const result = await fightForFreedom(handle.db, { userId: "user-2", revolutionId: revolution.id, opinion: 29 });
		expect(result.outcome).toBe("draw");
		expect(result.independent).toBe(true);
		expect(await stateOf(regionId)).toBeNull();
	});

	it("does not allow two live uprisings in one region", async () => {
		const regionId = regionIds[2]!;
		await moveResidents(["user-1", "user-2", "user-3"], regionId);
		await arm("user-1");
		await startRevolution(handle.db, { userId: "user-1", regionId, opinion: 20 });
		await expect(startRevolution(handle.db, { userId: "user-2", regionId, opinion: 20 })).rejects.toThrow(
			/already has a live revolution/
		);
		expect(await liveRevolution(handle.db, regionId)).not.toBeNull();
	});
});
