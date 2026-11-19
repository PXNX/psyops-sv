// The combat engine against a real (in-memory) Postgres with the demo world.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { battleParticipants, battleRounds, battles, regions } from "../schema";
import { processCombatRound, fortificationReduction } from "../services/military/battle-engine";

let handle: MockDbHandle;
let activeBattle: typeof battles.$inferSelect;
let preparingBattle: typeof battles.$inferSelect;

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(battles);
	activeBattle = all.find((b) => b.phase === "active")!;
	preparingBattle = all.find((b) => b.phase === "preparation")!;
}, 60_000);

afterAll(async () => {
	await handle?.close();
});

describe("processCombatRound", () => {
	it("does nothing for a battle that hasn't started fighting", async () => {
		expect(await processCombatRound(handle.db, preparingBattle.id)).toBeNull();
		expect(
			await handle.db.select().from(battleRounds).where(eq(battleRounds.battleId, preparingBattle.id))
		).toHaveLength(0);
	});

	it("records a round and credits the damage each unit dealt", async () => {
		const before = (await handle.db.select().from(battleRounds).where(eq(battleRounds.battleId, activeBattle.id)))
			.length;
		const dealtBefore = (
			await handle.db.select().from(battleParticipants).where(eq(battleParticipants.battleId, activeBattle.id))
		).reduce((s, p) => s + p.damageDealt, 0);
		const result = (await processCombatRound(handle.db, activeBattle.id))!;
		expect(result.roundNumber).toBe(before + 1);
		expect(result.attackerDamage + result.defenderDamage).toBeGreaterThan(0);

		const participants = await handle.db
			.select()
			.from(battleParticipants)
			.where(eq(battleParticipants.battleId, activeBattle.id));
		const dealt = (side: string) => participants.filter((p) => p.side === side).reduce((s, p) => s + p.damageDealt, 0);
		expect(dealt("attacker") + dealt("defender") - dealtBefore).toBe(result.attackerDamage + result.defenderDamage);
	});

	it("fights until one side is destroyed, then hands the region to a winning attacker", async () => {
		// Weaken the defence so the attackers take the region, and give it
		// something to wreck.
		await handle.db
			.update(battleParticipants)
			.set({ currentStrength: 1 })
			.where(and(eq(battleParticipants.battleId, activeBattle.id), eq(battleParticipants.side, "defender")));
		await handle.db
			.update(regions)
			.set({ infrastructure: 4, fortifications: 6, education: 0, hospitals: 0, economy: 0 })
			.where(eq(regions.id, activeBattle.regionId));
		let result = null;
		for (let i = 0; i < 200; i++) {
			result = await processCombatRound(handle.db, activeBattle.id);
			if (!result || result.battleEnded) break;
		}
		expect(result?.battleEnded).toBe(true);

		const [battle] = await handle.db.select().from(battles).where(eq(battles.id, activeBattle.id));
		expect(battle!.phase).toBe("ended");
		const [region] = await handle.db.select().from(regions).where(eq(regions.id, activeBattle.regionId));
		expect(region!.stateId).toBe(
			result!.winner === "attacker" ? activeBattle.attackerStateId : activeBattle.defenderStateId
		);

		// Conquest wrecks part of the region's buildings and records it.
		expect(result!.winner).toBe("attacker");
		expect(region!.fortifications).toBe(3);
		expect(region!.infrastructure).toBe(3);
		expect(battle!.buildingsDestroyed).toEqual({ fortifications: 3, infrastructure: 1, radar: 1 });

		const participants = await handle.db
			.select()
			.from(battleParticipants)
			.where(eq(battleParticipants.battleId, activeBattle.id));
		const loserSide = result!.winner === "attacker" ? "defender" : "attacker";
		expect(participants.filter((p) => p.side === loserSide).every((p) => p.currentStrength === 0)).toBe(true);
	});

	it("runs no further rounds once the battle has ended", async () => {
		expect(await processCombatRound(handle.db, activeBattle.id)).toBeNull();
	});
});

describe("fortificationReduction", () => {
	it("is 2% per level, capped at 50%", () => {
		expect(fortificationReduction(0)).toBe(0);
		expect(fortificationReduction(3)).toBe(6);
		expect(fortificationReduction(40)).toBe(50);
	});
});
