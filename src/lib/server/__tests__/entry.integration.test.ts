// Who may enter a state, against the seeded mock world: Alice (user-1) lives
// in Freedonia, which is at war with Sylvania and with Borduria. Borduria has
// not held its first election; Sylvania is given one here.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { parliamentaryElections, stateBorders, stateSanctions, states } from "../schema";
import { checkEntry } from "../services/politics/entry";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let borduria: number;

beforeAll(async () => {
	handle = await createMockDb();
	const rows = await handle.db.select({ id: states.id, name: states.name }).from(states);
	const id = (n: string) => rows.find((s) => s.name === n)!.id;
	freedonia = id("Republic of Freedonia");
	sylvania = id("Empire of Sylvania");
	borduria = id("Kingdom of Borduria");
	await handle.db
		.delete(parliamentaryElections)
		.where(and(eq(parliamentaryElections.stateId, borduria), eq(parliamentaryElections.isInaugural, true)));
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("entry", () => {
	it("is never refused before a state's first election, not even by war, sanctions or closed borders", async () => {
		await handle.db
			.insert(stateBorders)
			.values({ stateId: borduria, status: "closed" })
			.onConflictDoUpdate({ target: stateBorders.stateId, set: { status: "closed" } });
		await handle.db.insert(stateSanctions).values({
			sanctioningStateId: borduria,
			targetStateId: freedonia,
			sanctionedBy: "user-4",
			reason: "entry-test"
		});
		expect(await checkEntry(handle.db, "user-1", borduria)).toMatchObject({ allowed: true, reason: null });
		await handle.db.delete(stateSanctions).where(eq(stateSanctions.reason, "entry-test"));
		await handle.db.delete(stateBorders).where(eq(stateBorders.stateId, borduria));
	});

	it("refuses entry to a state at war with yours once it has held its first election", async () => {
		const day = 86_400_000;
		await handle.db.insert(parliamentaryElections).values({
			stateId: sylvania,
			startDate: new Date(Date.now() - 10 * day),
			endDate: new Date(Date.now() - 9 * day),
			isInaugural: true
		});
		const entry = await checkEntry(handle.db, "user-1", sylvania);
		expect(entry.allowed).toBe(false);
		expect(entry.reason).toMatch(/war/);
	});
});
