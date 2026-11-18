// War and battle records against the demo world.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { battles, wars } from "../schema";
import { battlesInRegion, warsOfBloc, warsOfState } from "../services/military/history";

let handle: MockDbHandle;

beforeAll(async () => {
	handle = await createMockDb();
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("war history", () => {
	it("lists a state's wars from its own side, with a result once ended", async () => {
		const [war] = await handle.db.select().from(wars).limit(1);
		const before = await warsOfState(handle.db, war!.attackerId);
		const record = before.find((w) => w.id === war!.id)!;
		expect(record.side).toBe("attacker");
		expect(record.result).toBeNull();

		await handle.db
			.update(wars)
			.set({ status: "ended", endedReason: "surrender", surrenderedBy: war!.defenderId, endedAt: new Date() })
			.where(eq(wars.id, war!.id));
		const attackerView = (await warsOfState(handle.db, war!.attackerId)).find((w) => w.id === war!.id)!;
		const defenderView = (await warsOfState(handle.db, war!.defenderId)).find((w) => w.id === war!.id)!;
		expect(attackerView.result).toBe("won");
		expect(defenderView.result).toBe("lost");
		expect(defenderView.side).toBe("defender");
	});

	it("lists a bloc's coalition wars", async () => {
		const [war] = await handle.db.select().from(wars).limit(1);
		if (!war!.attackerBlocId) return;
		const list = await warsOfBloc(handle.db, war!.attackerBlocId);
		expect(list.some((w) => w.id === war!.id && w.side === "attacker")).toBe(true);
	});
});

describe("battle history", () => {
	it("lists the battles fought over a region", async () => {
		const [battle] = await handle.db.select().from(battles).limit(1);
		const list = await battlesInRegion(handle.db, battle!.regionId);
		expect(list.map((b) => b.id)).toContain(battle!.id);
		expect(list[0]!.attacker.name).toBeTruthy();
	});
});
