// The deep intrusion against a real (in-memory) Postgres: exploit tiers feed
// the trace meter, hosts open with keys, loot pays into the treasury, cover
// tracks buys trace back, and a full meter cuts the session.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { infiltrationAssets, intrusionSessions, stateTreasury, states } from "../schema";
import {
	browseSystem,
	isPivoted,
	plantAsset,
	runDeepMove,
	runIntrusion,
	sessionFor
} from "../services/military/infiltration";
import { EXPLOIT_TIERS, TRACE, coverTracks, effectiveHeat, readDeep } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let assetId: number;
let siteId: string;
const always = () => 0;
const never = () => 0.999;
let clock = new Date("2026-11-21T12:00:00Z");
const now = () => new Date((clock = new Date(clock.getTime() + 3600_000)));
const deepOf = async () => readDeep((await sessionFor(handle.db, assetId, siteId))?.deep);
const balance = async () =>
	(await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, freedonia)))[0]!.balance;

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	siteId = `telecom-${sylvania}-2`;
	assetId = (await plantAsset(handle.db, "user-1", { targetStateId: sylvania, kind: "insider", now: now() })).assetId;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("a deep intrusion", () => {
	it("adds trace for the scan and for a loud exploit through a chosen port", async () => {
		await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "scan", now: now(), rng: always });
		expect((await deepOf()).trace).toBe(TRACE.SCAN);
		const r = await runIntrusion(handle.db, "user-1", {
			assetId,
			siteId,
			step: "access",
			port: 22,
			tier: "loud",
			now: now(),
			rng: always
		});
		expect(r.success).toBe(true);
		expect(r.session?.vector).toBe("phished_operator");
		expect(r.lines.some((l) => l.line.includes("(loud) against :22"))).toBe(true);
		expect((await deepOf()).trace).toBe(TRACE.SCAN + EXPLOIT_TIERS.loud.noise.ok);
	});

	it("refuses a port without a way in", async () => {
		await expect(
			runIntrusion(handle.db, "user-1", { assetId, siteId, step: "access", port: 9999, now: now(), rng: always })
		).rejects.toThrow();
	});

	it("starts on the gateway after the pivot and maps the hosts for free", async () => {
		await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "escalate", now: now(), rng: always });
		await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "pivot", now: now(), rng: always });
		const deep = await deepOf();
		expect(deep.owned).toEqual(["gw"]);
		expect(deep.at).toBe("gw");
		const before = await balance();
		const map = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hosts", now: now() });
		expect(map.lines.filter((l) => /^(gw|cams|files|badge|core) /.test(l.line))).toHaveLength(5);
		expect(await balance()).toBe(before);
	});

	it("takes the gateway's key and walks into the file share with it", async () => {
		await expect(browseSystem(handle.db, "user-1", { assetId, siteId, path: "/", now: now() })).rejects.toThrow(
			/file share/
		);
		const took = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "loot", item: "1", now: now() });
		expect(took.deep.keys).toContain("svc-password");
		await expect(
			runDeepMove(handle.db, "user-1", { assetId, siteId, move: "loot", item: "1", now: now() })
		).rejects.toThrow(/already took/);
		const hop = await runDeepMove(handle.db, "user-1", {
			assetId,
			siteId,
			move: "hop",
			host: "files",
			now: now(),
			rng: never
		});
		expect(hop.success).toBe(true);
		expect(hop.deep.at).toBe("files");
		expect(hop.deep.owned).toContain("files");
		const root = await browseSystem(handle.db, "user-1", { assetId, siteId, path: "/", now: now() });
		expect(root.dirs.length).toBeGreaterThan(0);
	});

	it("skims cash loot into the treasury", async () => {
		const before = await balance();
		const r = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "loot", item: "cash", now: now() });
		expect(r.cost).toBeLessThan(0);
		expect(await balance()).toBe(before - r.cost);
	});

	it("moves freely between owned hosts and opens the core with keys", async () => {
		const before = (await deepOf()).trace;
		const r = await runDeepMove(handle.db, "user-1", {
			assetId,
			siteId,
			move: "hop",
			host: "gw",
			now: now(),
			rng: never
		});
		expect(r.success).toBe(true); // owned hosts are free to move between
		expect(r.deep.trace).toBe(before);
		await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hop", host: "files", now: now() });
		const badge = await runDeepMove(handle.db, "user-1", {
			assetId,
			siteId,
			move: "loot",
			item: "admin-token",
			now: now()
		}).then(() => runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hop", host: "badge", now: now() }));
		expect(badge.success).toBe(true);
		expect(badge.deep.owned).toContain("badge");
		const core = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hop", host: "core", now: now() });
		expect(core.deep.at).toBe("core");
	});

	it("covers tracks for more money and less effect each time", async () => {
		const first = coverTracks(0);
		const second = coverTracks(1);
		const before = (await deepOf()).trace;
		const a = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "cover", now: now() });
		expect(a.cost).toBe(first.cost);
		expect(a.deep.trace).toBe(Math.max(0, before - first.drop));
		const b = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "cover", now: now() });
		expect(b.cost).toBe(second.cost);
		expect(b.deep.covers).toBe(2);
	});

	it("cuts the session when the trace fills, and only a reset revives it", async () => {
		const session = await sessionFor(handle.db, assetId, siteId);
		await handle.db
			.update(intrusionSessions)
			.set({ deep: { ...readDeep(session!.deep), trace: 99 } })
			.where(eq(intrusionSessions.id, session!.id));
		const [beforeAsset] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, assetId));
		const at = now();
		const r = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "loot", item: "master", now: at });
		expect(r.deep.traced).toBe(true);
		expect(r.lines.some((l) => l.line.includes("TRACE COMPLETE"))).toBe(true);
		const [afterAsset] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, assetId));
		expect(afterAsset!.heat).toBe(Math.round(effectiveHeat(beforeAsset!, at)) + TRACE.BURN_HEAT);
		expect(await isPivoted(handle.db, assetId, siteId)).toBe(false);
		await expect(runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hosts", now: now() })).rejects.toThrow(
			/traced/
		);
		await expect(browseSystem(handle.db, "user-1", { assetId, siteId, path: "/", now: now() })).rejects.toThrow(
			/traced/
		);
		await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "reset", now: now() });
		const fresh = await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "scan", now: now() });
		expect(readDeep(fresh.session?.deep).trace).toBe(TRACE.SCAN);
	});
});
