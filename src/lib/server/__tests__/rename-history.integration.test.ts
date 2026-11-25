// Rename entries appear in the unified timelines, oldest-first when asked.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { politicalParties } from "../schema";
import { recordRename, renamesFor } from "../services/history/renames";
import { historyFor } from "../services/military/history";

let handle: MockDbHandle;
let partyId: number;

beforeAll(async () => {
	handle = await createMockDb();
	const [party] = await handle.db.select().from(politicalParties).limit(1);
	partyId = party!.id;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("rename history", () => {
	it("records only actual name changes and lists them per entity", async () => {
		expect(await recordRename(handle.db, {
			entityType: "party", entityId: partyId, oldName: "Old", newName: "Old", changedBy: "user-1"
		})).toBe(false);
		expect(await recordRename(handle.db, {
			entityType: "party", entityId: partyId, oldName: "Old", newName: "New", changedBy: "user-1"
		})).toBe(true);
		const renames = await renamesFor(handle.db, "party", partyId);
		expect(renames).toHaveLength(1);
		expect(renames[0]!.newName).toBe("New");
	});

	it("puts a party's founding before its leader and rename in its history", async () => {
		const entries = await historyFor(handle.db, "party", partyId, { oldestFirst: true });
		const founded = entries.find((e) => e.kind === "founded");
		const rename = entries.find((e) => e.kind === "rename");
		expect(founded).toBeDefined();
		expect(rename).toBeDefined();
		expect(founded!.at.getTime()).toBeLessThanOrEqual(rename!.at.getTime());
	});
});
