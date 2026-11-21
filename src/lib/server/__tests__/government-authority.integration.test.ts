// Cabinet and bloc offices against a real in-memory Postgres: one person may
// hold several ministries (even within one portfolio), lead a state and speak
// for a bloc at the same time, and the helpers respect all of those roles.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { blocHighRepresentatives, blocLeaders, blocs, ministers, states } from "../schema";
import {
	canManagePortfolio,
	canSpeakForPortfolio,
	governmentRoles,
	stateRoles,
	blocRoles
} from "../services/government/authority";

let handle: MockDbHandle;
let freedonia: number;
let westernAlliance: number;

const president = "user-1";
const multiRole = "user-2";

beforeAll(async () => {
	handle = await createMockDb();
	freedonia = (await handle.db.select().from(states).where(eq(states.name, "Republic of Freedonia")))[0]!.id;
	westernAlliance = (await handle.db.select().from(blocs).where(eq(blocs.name, "Western Alliance")))[0]!.id;

	// Bob holds two ministries of the same portfolio plus one from another.
	await handle.db.insert(ministers).values([
		{ userId: multiRole, stateId: freedonia, ministry: "science" },
		{ userId: multiRole, stateId: freedonia, ministry: "health" },
		{ userId: multiRole, stateId: freedonia, ministry: "economy" }
	]);
	// And he leads a bloc while speaking for two of its portfolios.
	await handle.db.insert(blocLeaders).values({ userId: multiRole, blocId: westernAlliance });
	await handle.db.insert(blocHighRepresentatives).values([
		{ userId: multiRole, blocId: westernAlliance, portfolio: "science_health" },
		{ userId: multiRole, blocId: westernAlliance, portfolio: "foreign_trade" },
		// A representative without the leader's blanket authority.
		{ userId: "user-4", blocId: westernAlliance, portfolio: "economy_energy" }
	]);
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("state offices", () => {
	it("lists a president as president", async () => {
		expect(await stateRoles(handle.db, president)).toEqual([{ stateId: freedonia, role: "president" }]);
	});

	it("collapses ministries of one portfolio and keeps the other", async () => {
		const roles = await stateRoles(handle.db, multiRole);
		expect(roles.filter((r) => r.role === "science_health")).toHaveLength(1);
		expect(roles).toEqual(
			expect.arrayContaining([
				{ stateId: freedonia, role: "science_health" },
				{ stateId: freedonia, role: "economy_energy" }
			])
		);
	});

	it("returns nothing for somebody who holds no office", async () => {
		expect(await stateRoles(handle.db, "user-9")).toEqual([]);
	});

	it("lets the president or the matching minister manage a portfolio", async () => {
		const bob = await stateRoles(handle.db, multiRole);
		const alice = await stateRoles(handle.db, president);
		expect(canManagePortfolio(bob, freedonia, "science_health")).toBe(true);
		expect(canManagePortfolio(bob, freedonia, "defence_interior")).toBe(false);
		expect(canManagePortfolio(alice, freedonia, "defence_interior")).toBe(true);
	});
});

describe("bloc offices", () => {
	it("lists the leader and each high-representative portfolio", async () => {
		const roles = await blocRoles(handle.db, multiRole);
		expect(roles).toEqual(
			expect.arrayContaining([
				{ blocId: westernAlliance, role: "bloc_leader" },
				{ blocId: westernAlliance, role: "high_rep_science_health" },
				{ blocId: westernAlliance, role: "high_rep_foreign_trade" }
			])
		);
	});

	it("lets the leader speak for any portfolio, a representative only for their own", async () => {
		const leader = await blocRoles(handle.db, multiRole);
		expect(canSpeakForPortfolio(leader, westernAlliance, "defence_interior")).toBe(true);
		expect(canSpeakForPortfolio(leader, westernAlliance, "economy_energy")).toBe(true);

		const representative = await blocRoles(handle.db, "user-4");
		expect(canSpeakForPortfolio(representative, westernAlliance, "economy_energy")).toBe(true);
		expect(canSpeakForPortfolio(representative, westernAlliance, "defence_interior")).toBe(false);
	});

	it("combines state and bloc offices for one person", async () => {
		const all = await governmentRoles(handle.db, multiRole);
		expect(all.some((a) => a.role === "president")).toBe(false);
		expect(all.filter((a) => a.stateId === freedonia).map((a) => a.role)).toEqual(
			expect.arrayContaining(["science_health", "economy_energy"])
		);
		expect(all.filter((a) => a.blocId === westernAlliance).map((a) => a.role)).toEqual(
			expect.arrayContaining(["bloc_leader", "high_rep_science_health", "high_rep_foreign_trade"])
		);
	});
});
