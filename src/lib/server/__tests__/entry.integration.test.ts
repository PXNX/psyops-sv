// Who may enter a state, against the seeded mock world: Alice (user-1) lives
// in Freedonia, which is at war with Sylvania. Its war with Borduria is ended
// here so Borduria is neutral.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { parliamentaryElections, stateBorders, stateSanctions, states, wars } from "../schema";
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
	// Start from states that have not held their inaugural election yet.
	for (const stateId of [sylvania, borduria]) {
		await handle.db
			.delete(parliamentaryElections)
			.where(and(eq(parliamentaryElections.stateId, stateId), eq(parliamentaryElections.isInaugural, true)));
	}
	await handle.db.delete(stateSanctions);
	await handle.db.update(wars).set({ status: "ended" }).where(eq(wars.defenderId, borduria));
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("entry before a state's inaugural election", () => {
	it("lets people move freely, even past closed borders", async () => {
		await handle.db
			.insert(stateBorders)
			.values({ stateId: borduria, status: "closed" })
			.onConflictDoUpdate({ target: stateBorders.stateId, set: { status: "closed" } });
		expect((await checkEntry(handle.db, "user-1", borduria)).allowed).toBe(true);
		await handle.db.delete(stateBorders).where(eq(stateBorders.stateId, borduria));
	});

	it("still refuses entry to a state that has sanctioned yours", async () => {
		await handle.db.insert(stateSanctions).values({
			sanctioningStateId: borduria,
			targetStateId: freedonia,
			sanctionedBy: "user-4",
			reason: "entry-test"
		});
		const entry = await checkEntry(handle.db, "user-1", borduria);
		expect(entry.allowed).toBe(false);
		expect(entry.reason).toMatch(/sanctioned/);
		await handle.db.delete(stateSanctions).where(eq(stateSanctions.reason, "entry-test"));
	});

	it("still refuses entry to a state at war with yours", async () => {
		const entry = await checkEntry(handle.db, "user-1", sylvania);
		expect(entry.allowed).toBe(false);
		expect(entry.reason).toMatch(/war/);
	});
});
