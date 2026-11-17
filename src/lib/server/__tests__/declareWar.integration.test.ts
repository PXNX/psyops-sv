// Declaring war (president button and parliament proposals share this).
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { states, wars } from "../schema";
import { declareWar, WarDeclarationError } from "../services/military/declare-war";

let handle: MockDbHandle;
let a: number;
let b: number;

beforeAll(async () => {
	handle = await createMockDb();
	await handle.db.update(wars).set({ status: "ended" });
	const [s1, s2] = await handle.db.select().from(states).limit(2);
	a = s1!.id;
	b = s2!.id;
	await handle.db.update(states).set({ blocId: null });
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("declareWar", () => {
	it("starts a war, then refuses a second one between the same states", async () => {
		const { warId } = await declareWar(handle.db, {
			attackerStateId: a,
			targetStateId: b,
			declaredBy: "user-1",
			notify: false
		});
		const [war] = await handle.db.select().from(wars).where(eq(wars.id, warId));
		expect(war).toMatchObject({ attackerId: a, defenderId: b, status: "active" });
		await expect(
			declareWar(handle.db, { attackerStateId: b, targetStateId: a, declaredBy: "user-2", notify: false })
		).rejects.toBeInstanceOf(WarDeclarationError);
	});

	it("refuses war on yourself", async () => {
		await expect(
			declareWar(handle.db, { attackerStateId: a, targetStateId: a, declaredBy: "user-1", notify: false })
		).rejects.toThrow("itself");
	});
});
