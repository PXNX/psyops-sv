// Cyber operations and psyops against a real (in-memory) Postgres with the
// demo world: who may order them, paying and cooldowns, the outcome with a
// seeded rng, the effects (grid, recon, battle morale, planted intel, war
// exhaustion), treasury breaches, casus belli and who gets to know what.
//
// Demo world: Freedonia (user-1 president) is at war with Sylvania (user-3
// president) and with Borduria (user-4 lives there).
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { and, eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import {
	covertOperations,
	governmentBudgetTransactions,
	inboxMessages,
	militaryUnits,
	ministers,
	stateCyberDefence,
	stateEffects,
	stateTreasury,
	states,
	wars
} from "../schema";
import {
	CovertOpError,
	knownEffects,
	launchOperation,
	opsAuthority,
	targetsFor,
	upgradeCyberDefence
} from "../services/military/covert-ops";
import {
	activeLeaflets,
	battlePsyops,
	deceptionFor,
	effectiveEnergy,
	reconDelayFactor,
	warPsyopsExhaustion
} from "../services/military/state-effects";
import { COVERT_OPS, CYBER, CYBER_DEFENCE, PSYOPS, covertOdds } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let borduria: number;
let sylvanianRegion: number;

const HOUR = 3600_000;
/** rng returning these draws in order: [success, detection, attribution]. */
const draws = (...xs: number[]) => {
	let i = 0;
	return () => xs[Math.min(i++, xs.length - 1)]!;
};
const WIN_UNSEEN = () => draws(0, 0.99, 0.99);
const WIN_TRACED = () => draws(0, 0.99, 0);
const LOSE_CLEAN = () => draws(0.99, 0.99, 0.99);

const treasury = async (stateId: number) =>
	(await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance;

// Each test runs at its own hour so cooldowns and heat don't leak between them.
let clock = Date.now();
const tick = (hours = 100) => new Date((clock += hours * HOUR));

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	borduria = all.find((s) => s.name === "Kingdom of Borduria")!.id;
	const [artillery] = await handle.db
		.select()
		.from(militaryUnits)
		.where(eq(militaryUnits.name, "3rd Artillery Regiment"));
	sylvanianRegion = artillery!.regionId;
	// Diana becomes Borduria's foreign minister.
	await handle.db.insert(ministers).values({ userId: "user-4", stateId: borduria, ministry: "foreign_affairs" });
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("authority", () => {
	it("presidents and defence/foreign ministers may order operations, nobody else", async () => {
		expect(await opsAuthority(handle.db, "user-1")).toEqual({ stateId: freedonia, role: "president" });
		expect(await opsAuthority(handle.db, "user-4")).toEqual({ stateId: borduria, role: "foreign_affairs" });
		expect(await opsAuthority(handle.db, "user-2")).toBeNull();
		await expect(
			launchOperation(handle.db, { userId: "user-2", kind: "grid_attack", targetStateId: sylvania, notify: false })
		).rejects.toThrow(CovertOpError);
	});

	it("only the president or defence minister funds cyber defence", async () => {
		await expect(upgradeCyberDefence(handle.db, "user-4")).rejects.toThrow(/defence minister/);
	});
});

describe("a grid attack", () => {
	it("costs treasury money, lands, and takes grid capacity and output offline", async () => {
		const now = tick();
		const before = await treasury(freedonia);
		const r = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "grid_attack",
			targetStateId: sylvania,
			now,
			rng: WIN_UNSEEN(),
			notify: false
		});
		expect(await treasury(freedonia)).toBe(before - COVERT_OPS.grid_attack.cost);
		expect(r.operation.succeeded).toBe(true);
		expect(r.operation.detected).toBe(true); // the lights went out
		expect(r.operation.attributed).toBe(false);
		expect(r.operation.successChance).toBe(60);
		expect(r.effect?.kind).toBe("grid_degraded");
		expect(r.effect?.expiresAt.getTime()).toBe(now.getTime() + COVERT_OPS.grid_attack.durationHours * HOUR);

		const energy = await effectiveEnergy(handle.db, sylvania, { totalProduction: 1000, usedProduction: 0 }, now);
		expect(energy.totalProduction).toBe(750);
		expect(energy.gridDegraded).toBe(25);
		const later = new Date(now.getTime() + 13 * HOUR);
		expect(
			(await effectiveEnergy(handle.db, sylvania, { totalProduction: 1000, usedProduction: 0 }, later)).gridDegraded
		).toBe(0);

		const [ledger] = await handle.db
			.select()
			.from(governmentBudgetTransactions)
			.where(
				and(
					eq(governmentBudgetTransactions.stateId, freedonia),
					eq(governmentBudgetTransactions.transactionType, "covert_operation")
				)
			);
		expect(ledger?.amount).toBe(-COVERT_OPS.grid_attack.cost);
	});

	it("can't be repeated within its cooldown, and charges nothing then", async () => {
		const now = new Date(clock + HOUR);
		const before = await treasury(freedonia);
		await expect(
			launchOperation(handle.db, { userId: "user-1", kind: "grid_attack", targetStateId: sylvania, now, notify: false })
		).rejects.toThrow(/ready again/);
		expect(await treasury(freedonia)).toBe(before);
	});

	it("a failure leaves no effect but still costs", async () => {
		const now = tick();
		const before = await treasury(freedonia);
		const r = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "c2_disruption",
			targetStateId: sylvania,
			now,
			rng: LOSE_CLEAN(),
			notify: false
		});
		expect(r.operation.succeeded).toBe(false);
		expect(r.operation.detected).toBe(false);
		expect(r.effect).toBeNull();
		expect(await treasury(freedonia)).toBe(before - COVERT_OPS.c2_disruption.cost);
	});

	it("refuses a state that can't pay, without charging", async () => {
		await handle.db.update(stateTreasury).set({ balance: 100 }).where(eq(stateTreasury.stateId, borduria));
		await expect(
			launchOperation(handle.db, {
				userId: "user-4",
				kind: "grid_attack",
				targetStateId: freedonia,
				now: tick(),
				notify: false
			})
		).rejects.toThrow(/costs/);
		expect(await treasury(borduria)).toBe(100);
		await handle.db.update(stateTreasury).set({ balance: 500_000 }).where(eq(stateTreasury.stateId, borduria));
	});
});

describe("sensor and C2 disruption", () => {
	it("slows the target's recon and its battle coordination", async () => {
		const now = tick();
		await launchOperation(handle.db, {
			userId: "user-1",
			kind: "c2_disruption",
			targetStateId: sylvania,
			now,
			rng: WIN_UNSEEN(),
			notify: false
		});
		expect(await reconDelayFactor(handle.db, sylvania, now)).toBe(CYBER.C2_RECON_DELAY);
		expect(await reconDelayFactor(handle.db, freedonia, now)).toBe(1);
		const psy = await battlePsyops(handle.db, { attackerStateId: sylvania, defenderStateId: freedonia }, now);
		expect(psy.attacker.coordinationLoss).toBe(30 * CYBER.C2_BATTLE_SHARE);
		expect(psy.attacker.factor).toBeLessThan(1);
		expect(psy.defender.factor).toBe(1);
	});
});

describe("a treasury breach", () => {
	it("takes a slice of the target's treasury, half of it reaches the thief", async () => {
		const now = tick();
		const [vBefore, tBefore] = [await treasury(sylvania), await treasury(freedonia)];
		const r = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "financial_theft",
			targetStateId: sylvania,
			now,
			rng: WIN_TRACED(),
			notify: false
		});
		const taken = Math.min(CYBER.THEFT_MAX, Math.floor(vBefore * 0.04));
		expect(r.stolen).toEqual({ taken, kept: Math.floor(taken * CYBER.THEFT_KEPT) });
		expect(await treasury(sylvania)).toBe(vBefore - taken);
		expect(await treasury(freedonia)).toBe(tBefore - COVERT_OPS.financial_theft.cost + Math.floor(taken / 2));
		const [victimLedger] = await handle.db
			.select()
			.from(governmentBudgetTransactions)
			.where(
				and(
					eq(governmentBudgetTransactions.stateId, sylvania),
					eq(governmentBudgetTransactions.transactionType, "covert_theft")
				)
			);
		expect(victimLedger?.description).toMatch(/traced to Republic of Freedonia/);
	});
});

describe("attribution and casus belli", () => {
	it("an op caught in peacetime gives the victim a casus belli and tells its leaders", async () => {
		// Make peace between Freedonia and Borduria.
		await handle.db.update(wars).set({ status: "ended" }).where(eq(wars.defenderId, borduria));
		const now = tick();
		const r = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "leaflet_drop",
			targetStateId: borduria,
			message: "Your king   is lying to you.",
			now,
			rng: WIN_TRACED()
		});
		expect(r.operation.atWar).toBe(false);
		expect(r.operation.attributed).toBe(true);
		expect(r.operation.message).toBe("Your king is lying to you.");
		// Odds were worse in peacetime.
		expect(r.operation.attributionChance).toBe(Math.round((0.6 + CYBER.PEACETIME_ATTRIBUTION) * 100));

		const [cb] = await handle.db
			.select()
			.from(stateEffects)
			.where(and(eq(stateEffects.stateId, borduria), eq(stateEffects.kind, "casus_belli")));
		expect(cb?.sourceStateId).toBe(freedonia);

		const inbox = await handle.db.select().from(inboxMessages).where(eq(inboxMessages.recipientId, "user-4"));
		expect(inbox.at(-1)?.subject).toMatch(/leaflets/i);
		expect(inbox.at(-1)?.content).toMatch(/Republic of Freedonia/);

		const leaflets = await activeLeaflets(handle.db, borduria, now);
		expect(leaflets[0]?.message).toBe("Your king is lying to you.");
		expect(leaflets[0]?.attributed).toBe(true);
	});

	it("the casus belli lets the victim strike back with war-only operations", async () => {
		const now = tick(1);
		const targets = await targetsFor(handle.db, borduria, now);
		const f = targets.find((t) => t.id === freedonia)!;
		expect(f.atWar).toBe(false);
		expect(f.casusBelli).toBe(true);
		const r = await launchOperation(handle.db, {
			userId: "user-4",
			kind: "morale_campaign",
			targetStateId: freedonia,
			now,
			rng: WIN_UNSEEN(),
			notify: false
		});
		expect(r.operation.succeeded).toBe(true);
		expect(r.operation.atWar).toBe(true);
	});

	it("without war or casus belli, war-only operations are refused", async () => {
		await expect(
			launchOperation(handle.db, {
				userId: "user-1",
				kind: "morale_campaign",
				targetStateId: borduria,
				now: tick(),
				notify: false
			})
		).rejects.toThrow(/needs a war/);
	});

	it("leaflets need text that fits", async () => {
		await expect(
			launchOperation(handle.db, {
				userId: "user-1",
				kind: "leaflet_drop",
				targetStateId: sylvania,
				message: "x".repeat(PSYOPS.LEAFLET_MAX_CHARS + 1),
				now: tick(),
				notify: false
			})
		).rejects.toThrow(/fit/);
	});
});

describe("morale campaigns and counter-propaganda", () => {
	it("shake the enemy's battle output, stacking with diminishing returns, and add war exhaustion", async () => {
		const now = tick();
		const war = (await handle.db.select().from(wars).where(eq(wars.attackerId, sylvania)))[0]!;
		const exhaustionBefore = await warPsyopsExhaustion(handle.db, war, now);

		await launchOperation(handle.db, {
			userId: "user-1",
			kind: "morale_campaign",
			targetStateId: sylvania,
			now,
			rng: WIN_UNSEEN(),
			notify: false
		});
		const one = (await battlePsyops(handle.db, { attackerStateId: sylvania, defenderStateId: freedonia }, now))
			.attacker;
		expect(one.moraleLoss).toBeGreaterThan(0);

		const later = new Date(now.getTime() + 13 * HOUR); // past the cooldown, first still running
		await launchOperation(handle.db, {
			userId: "user-1",
			kind: "morale_campaign",
			targetStateId: sylvania,
			now: later,
			rng: WIN_UNSEEN(),
			notify: false
		});
		const two = (await battlePsyops(handle.db, { attackerStateId: sylvania, defenderStateId: freedonia }, later))
			.attacker;
		expect(two.moraleLoss).toBeGreaterThan(one.moraleLoss);
		expect(two.moraleLoss).toBeLessThan(2 * one.moraleLoss);

		expect(await warPsyopsExhaustion(handle.db, war, later)).toBe(
			exhaustionBefore + 2 * PSYOPS.EXHAUSTION.morale_campaign!
		);
		clock = later.getTime();
	});

	it("counter-propaganda boosts its own side and makes it harder to sway", async () => {
		const now = tick();
		const r = await launchOperation(handle.db, { userId: "user-3", kind: "counter_propaganda", now, notify: false });
		expect(r.operation.targetStateId).toBe(sylvania);
		expect(r.effect?.kind).toBe("morale_boost");
		const psy = await battlePsyops(handle.db, { attackerStateId: sylvania, defenderStateId: freedonia }, now);
		expect(psy.attacker.boost).toBe(COVERT_OPS.counter_propaganda.magnitude);

		const t = (await targetsFor(handle.db, freedonia, now)).find((x) => x.id === sylvania)!;
		expect(t.resilient).toBe(true);
		const camp = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "morale_campaign",
			targetStateId: sylvania,
			now,
			rng: WIN_UNSEEN(),
			notify: false
		});
		expect(camp.operation.successChance).toBe(
			Math.round(covertOdds("morale_campaign", { ...t, targetResilient: true }).success * 100)
		);
	});
});

describe("disinformation", () => {
	it("falsifies the enemy's picture of the region, unnoticed unless traced", async () => {
		const now = tick();
		const r = await launchOperation(handle.db, {
			userId: "user-3",
			kind: "disinformation",
			targetStateId: freedonia,
			regionId: sylvanianRegion,
			posture: "conceal",
			now,
			rng: WIN_UNSEEN(),
			notify: false
		});
		expect(r.operation.succeeded).toBe(true);
		expect(r.operation.detected).toBe(false);
		expect(r.effect?.magnitude).toBe(PSYOPS.CONCEAL);
		expect(await deceptionFor(handle.db, [freedonia], sylvanianRegion, now)).toBe(PSYOPS.CONCEAL);
		expect(await deceptionFor(handle.db, [borduria], sylvanianRegion, now)).toBeNull();

		// Freedonia doesn't know; Sylvania does; Borduria hears nothing.
		const kinds = async (viewer: number[]) =>
			(await knownEffects(handle.db, freedonia, viewer, now)).map((e) => e.kind);
		expect(await kinds([freedonia])).not.toContain("deception");
		expect(await kinds([sylvania])).toContain("deception");
		expect(await kinds([borduria])).not.toContain("deception");
	});

	it("needs a region your side holds", async () => {
		await expect(
			launchOperation(handle.db, {
				userId: "user-1",
				kind: "disinformation",
				targetStateId: sylvania,
				regionId: sylvanianRegion,
				now: tick(),
				notify: false
			})
		).rejects.toThrow(/region your side holds/);
	});
});

describe("cyber defence", () => {
	it("costs more per level and makes cyber attacks on the state harder and riskier", async () => {
		const before = await treasury(sylvania);
		expect(await upgradeCyberDefence(handle.db, "user-3")).toBe(1);
		expect(await upgradeCyberDefence(handle.db, "user-3")).toBe(2);
		expect(await treasury(sylvania)).toBe(before - CYBER_DEFENCE.BASE_COST * 3);
		const [row] = await handle.db.select().from(stateCyberDefence).where(eq(stateCyberDefence.stateId, sylvania));
		expect(row?.level).toBe(2);

		const r = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "grid_attack",
			targetStateId: sylvania,
			now: tick(),
			rng: LOSE_CLEAN(),
			notify: false
		});
		expect(r.operation.successChance).toBe(Math.round((0.6 - 2 * CYBER_DEFENCE.SUCCESS_PER_LEVEL) * 100));
		expect(r.operation.attributionChance).toBe(Math.round((0.35 + 2 * CYBER_DEFENCE.ATTRIBUTION_PER_LEVEL) * 100));
	});

	it("third parties only learn about attributed operations", async () => {
		const now = new Date(clock);
		const ops = await handle.db.select().from(covertOperations).where(eq(covertOperations.targetStateId, sylvania));
		expect(ops.length).toBeGreaterThan(0);
		// Borduria sees only the attributed ones on Sylvania (none still running here).
		const seen = await knownEffects(handle.db, sylvania, [borduria], now);
		expect(seen.every((e) => e.kind === "morale_boost" || e.sourceStateId !== null)).toBe(true);
	});
});
