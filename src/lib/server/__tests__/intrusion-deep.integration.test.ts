// The deep intrusion against a real (in-memory) Postgres: exploit tiers feed
// the trace meter, hosts open with keys, loot pays into the treasury, cover
// tracks buys trace back, and a full meter cuts the session.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { infiltrationAssets, intrusionSessions, stateTreasury, states } from "../schema";
import {
	browseSystem,
	crackCode,
	expireIfLate,
	isPivoted,
	readSystemRecord,
	plantAsset,
	runDeepMove,
	runIntrusion,
	sessionFor
} from "../services/military/infiltration";
import {
	CLOCK,
	CRACK,
	EXPLOIT_TIERS,
	TRACE,
	coverTracks,
	effectiveHeat,
	fileLock,
	locksFor,
	networkFor,
	readDeep,
	siteRecords,
	sitesForTarget,
	windowSeconds
} from "#lib/config/index.js";

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
/** Rewrite the session's deep state (the hour-long test steps would otherwise run the clock out). */
const patchDeep = async (patch: Partial<ReturnType<typeof readDeep>>) => {
	const session = await sessionFor(handle.db, assetId, siteId);
	await handle.db
		.update(intrusionSessions)
		.set({ deep: { ...readDeep(session!.deep), ...patch } })
		.where(eq(intrusionSessions.id, session!.id));
};
/** Get back inside after a reset, with the gateway's password in hand. */
const breakIn = async () => {
	for (const step of ["scan", "access", "escalate", "pivot"] as const)
		await runIntrusion(handle.db, "user-1", {
			assetId,
			siteId,
			step,
			port: step === "access" ? 22 : undefined,
			now: now(),
			rng: always
		});
};
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
		const at = now();
		await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "pivot", now: at, rng: always });
		const deep = await deepOf();
		expect(deep.owned).toEqual(["gw"]);
		expect(deep.at).toBe("gw");
		// The countdown starts with the pivot, sized by the site's security.
		const site = sitesForTarget(sylvania).find((s) => s.id === siteId)!;
		expect(Date.parse(deep.deadline!) - at.getTime()).toBe(windowSeconds(site.security) * 1000);
		await patchDeep({ deadline: null });
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

describe("the countdown inside", () => {
	it("cuts the line once the deadline passes, like a full trace", async () => {
		await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "reset", now: now() });
		await breakIn();
		const at = now();
		await patchDeep({ deadline: new Date(at.getTime() + 30_000).toISOString() });
		// Still time on the clock: nothing happens.
		expect(await expireIfLate(handle.db, assetId, siteId, new Date(at.getTime() + 29_000))).toBe(false);
		const [before] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, assetId));
		const late = new Date(at.getTime() + 31_000);
		await expect(runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hosts", now: late })).rejects.toThrow(
			/traced/
		);
		const deep = await deepOf();
		expect(deep.traced).toBe(true);
		const session = await sessionFor(handle.db, assetId, siteId);
		expect(session!.log!.some((l) => l.line.includes("TIME'S UP"))).toBe(true);
		const [after] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, assetId));
		expect(after!.heat).toBe(Math.round(effectiveHeat(before!, late)) + TRACE.BURN_HEAT);
		// Expiring twice does nothing more.
		expect(await expireIfLate(handle.db, assetId, siteId, new Date(late.getTime() + 1000))).toBe(false);
	});

	it("buys time back by covering tracks and loses it on a forced hop", async () => {
		await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "reset", now: now() });
		await breakIn();
		const at = now();
		const start = new Date(at.getTime() + 60_000).toISOString();
		await patchDeep({ deadline: start });
		const cover = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "cover", now: at });
		expect(Date.parse(cover.deep.deadline!) - Date.parse(start)).toBe(CLOCK.COVER * 1000);
		expect(cover.lines.some((l) => l.line.includes(`clock +${CLOCK.COVER}s`))).toBe(true);
		const files = await runDeepMove(handle.db, "user-1", {
			assetId,
			siteId,
			move: "hop",
			host: "files",
			now: at,
			rng: always
		});
		expect(files.success).toBe(true);
		expect(Date.parse(cover.deep.deadline!) - Date.parse(files.deep.deadline!)).toBe(CLOCK.FORCE * 1000);
	});
});

describe("password locks", () => {
	const site = () => sitesForTarget(sylvania).find((s) => s.id === siteId)!;
	const locks = () => {
		const s = site();
		const ids = networkFor(s, "Empire of Sylvania").hosts.map((h) => h.id);
		return locksFor(s, ids, siteRecords(s, "Empire of Sylvania").files);
	};
	/** A code that is wrong in every place. */
	const wrongFor = (code: string) =>
		code
			.split("")
			.map((c) => CRACK.SYMBOLS[(CRACK.SYMBOLS.indexOf(c) + 1) % CRACK.SYMBOLS.length])
			.join("");

	it("keeps a password-locked host shut until it is cracked", async () => {
		await patchDeep({ deadline: null });
		const host = locks().hosts.find((h) => h === "cams");
		expect(host).toBe("cams"); // this site's video recorder wants a password
		await expect(
			runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hop", host: "cams", now: now(), rng: always })
		).rejects.toThrow(/password/);
		const puzzle = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "crack", item: "cams", now: now() });
		expect(puzzle.crack).toMatchObject({ kind: "host", left: CRACK.ATTEMPTS, open: false });
		expect(JSON.stringify(puzzle)).not.toContain(`"code"`);
		const code = crackCode(site(), "host:cams");
		const right = await runDeepMove(handle.db, "user-1", {
			assetId,
			siteId,
			move: "crack",
			item: "cams",
			guess: code.toLowerCase(),
			now: now()
		});
		expect(right.success).toBe(true);
		expect(right.crack?.open).toBe(true);
		expect(right.crack?.guesses.at(-1)).toEqual({ guess: code, exact: CRACK.LENGTH, near: 0 });
		const hop = await runDeepMove(handle.db, "user-1", { assetId, siteId, move: "hop", host: "cams", now: now() });
		expect(hop.success).toBe(true);
		expect(hop.deep.owned).toContain("cams");
	});

	it("charges trace and time per wrong guess and locks out after the last try", async () => {
		await patchDeep({ deadline: new Date(clock.getTime() + 3 * 3600_000).toISOString(), trace: 0 });
		const code = crackCode(site(), "host:badge");
		const wrong = wrongFor(code);
		const at = new Date(clock.getTime() + 1000);
		const before = await deepOf();
		const miss = await runDeepMove(handle.db, "user-1", {
			assetId,
			siteId,
			move: "crack",
			item: "badge",
			guess: wrong,
			now: at
		});
		expect(miss.success).toBe(false);
		expect(miss.crack?.guesses.at(-1)).toEqual({ guess: wrong, exact: 0, near: miss.crack!.guesses.at(-1)!.near });
		expect(miss.deep.trace).toBe(before.trace + CRACK.TRACE);
		expect(Date.parse(before.deadline!) - Date.parse(miss.deep.deadline!)).toBe(CLOCK.GUESS * 1000);
		expect(miss.crack?.left).toBe(CRACK.ATTEMPTS - 1);
		await expect(
			runDeepMove(handle.db, "user-1", { assetId, siteId, move: "crack", item: "badge", guess: "XYZ", now: at })
		).rejects.toThrow(/symbols/);
		let last = miss;
		for (let i = 1; i < CRACK.ATTEMPTS; i++)
			last = await runDeepMove(handle.db, "user-1", {
				assetId,
				siteId,
				move: "crack",
				item: "badge",
				guess: wrong,
				now: at
			});
		expect(last.crack).toMatchObject({ left: 0, jammed: true, open: false });
		await expect(
			runDeepMove(handle.db, "user-1", { assetId, siteId, move: "crack", item: "badge", guess: code, now: at })
		).rejects.toThrow(/locked you out/);
	});

	it("keeps an encrypted file sealed until its code is found", async () => {
		await patchDeep({ deadline: null, trace: 0 });
		const fileId = locks().files[0]!;
		const name = fileId.split("/").pop()!;
		const folder = "/" + fileId.slice(0, fileId.lastIndexOf("/"));
		const listing = await browseSystem(handle.db, "user-1", { assetId, siteId, path: folder, now: now() });
		const sealed = listing.files.find((f) => f.id === fileId)!;
		expect(sealed.locked).toBe(true);
		expect(listing.lines.some((l) => l.line.includes(name) && l.line.includes("ENCRYPTED"))).toBe(true);
		await expect(
			readSystemRecord(handle.db, "user-1", { assetId, siteId, recordId: fileId, now: now() })
		).rejects.toThrow(/encrypted/);
		await runDeepMove(handle.db, "user-1", {
			assetId,
			siteId,
			move: "crack",
			item: fileId,
			guess: crackCode(site(), fileLock(fileId)),
			now: now()
		});
		const read = await readSystemRecord(handle.db, "user-1", { assetId, siteId, recordId: fileId, now: now() });
		expect(read.record.body.length).toBeGreaterThan(0);
	});
});
