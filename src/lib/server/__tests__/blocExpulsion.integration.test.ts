// Bloc expulsion votes against a real (in-memory) Postgres with the demo world.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { blocs, presidents, states } from "../schema";
import { ExpulsionError, decideExpulsion, proposeExpulsion, voteOnExpulsion } from "../service/blocExpulsion";

let handle: MockDbHandle;
let blocId: number;
const ids: number[] = [];

beforeAll(async () => {
	handle = await createMockDb();
	// Put three states with presidents into one bloc.
	const [bloc] = await handle.db.select().from(blocs).limit(1);
	blocId = bloc!.id;
	const all = await handle.db.select().from(states).limit(3);
	for (const [i, s] of all.entries()) {
		ids.push(s.id);
		await handle.db.update(states).set({ blocId }).where(eq(states.id, s.id));
		await handle.db
			.insert(presidents)
			.values({ userId: `user-${i + 1}`, stateId: s.id })
			.onConflictDoUpdate({ target: presidents.stateId, set: { userId: `user-${i + 1}` } });
	}
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("decideExpulsion", () => {
	it("needs a majority of the voting states, ties keep the state", () => {
		expect(decideExpulsion({ pro: 2, contra: 0, voters: 3, expired: false })).toBe("expelled");
		expect(decideExpulsion({ pro: 1, contra: 0, voters: 3, expired: false })).toBeNull();
		expect(decideExpulsion({ pro: 1, contra: 1, voters: 2, expired: false })).toBe("rejected");
		expect(decideExpulsion({ pro: 1, contra: 1, voters: 4, expired: true })).toBe("rejected");
	});
});

describe("expulsion votes", () => {
	it("the targeted state can't vote, the others decide", async () => {
		// user-1's state proposes expelling the third state (user-3's).
		const outcome = await proposeExpulsion(handle.db, { blocId, targetStateId: ids[2]!, userId: "user-1" });
		expect(outcome).toBe("pending"); // 1 of 2 voters so far

		const [{ id }] = await handle.db.query.blocExpulsions.findMany({ limit: 1 });
		await expect(
			voteOnExpulsion(handle.db, { blocId, expulsionId: id, userId: "user-3", inFavor: false })
		).rejects.toBeInstanceOf(ExpulsionError);

		expect(await voteOnExpulsion(handle.db, { blocId, expulsionId: id, userId: "user-2", inFavor: true })).toBe(
			"expelled"
		);
		const [target] = await handle.db.select().from(states).where(eq(states.id, ids[2]!));
		expect(target!.blocId).toBeNull();
	});

	it("presidents can't put their own state up for expulsion", async () => {
		await expect(proposeExpulsion(handle.db, { blocId, targetStateId: ids[0]!, userId: "user-1" })).rejects.toThrow(
			"own state"
		);
	});
});
