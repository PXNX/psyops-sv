// The interactive intrusion against a real (in-memory) Postgres: scan, take a
// service, escalate, pivot, use the pivot for a camera tap, deploy a payload,
// and reset. Uses a forced rng so the chain is deterministic.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { infiltrationAssets, states } from "../schema";
import {
	browseSystem,
	exfilRecord,
	filesFor,
	grepSystem,
	isPivoted,
	plantAsset,
	readSystemRecord,
	runAction,
	runDeepMove,
	runIntrusion,
	sessionFor
} from "../services/military/infiltration";
import { launchOperation } from "../services/military/covert-ops";
import { INFILTRATION, INTRUSION, actionChance, siteRecords, sitesForTarget } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let assetId: number;
let siteId: string;
const always = () => 0;
let clock = new Date("2026-11-21T12:00:00Z");
const now = () => new Date((clock = new Date(clock.getTime() + 3600_000)));
/** Skip past the recruitment cooldown so the next plant is allowed. */
const afterCooldown = () =>
	new Date((clock = new Date(clock.getTime() + INFILTRATION.PLANT_COOLDOWN_HOURS * 3600_000)));

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	siteId = `telecom-${sylvania}-2`;
	const planted = await plantAsset(handle.db, "user-1", { targetStateId: sylvania, kind: "insider", now: now() });
	assetId = planted.assetId;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("an intrusion chain", () => {
	it("scans the site and lists a way in", async () => {
		const r = await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "scan", now: now(), rng: always });
		expect(r.success).toBe(true);
		expect(r.lines.some((l) => l.line.includes("/tcp open"))).toBe(true);
		expect(r.session?.stage).toBe("scan");
		expect(r.session?.ports.some((p) => p.vector === "phished_operator")).toBe(true);
	});

	it("takes a service, escalates and pivots", async () => {
		const access = await runIntrusion(handle.db, "user-1", {
			assetId,
			siteId,
			step: "access",
			vector: "phished_operator",
			now: now(),
			rng: always
		});
		expect(access.success).toBe(true);
		expect(access.session?.privileges).toBe("user");
		const escalate = await runIntrusion(handle.db, "user-1", {
			assetId,
			siteId,
			step: "escalate",
			now: now(),
			rng: always
		});
		expect(escalate.session?.privileges).toBe("SYSTEM");
		const pivot = await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "pivot", now: now(), rng: always });
		expect(pivot.session?.stage).toBe("pivot");
		expect(await isPivoted(handle.db, assetId, siteId)).toBe(true);
		expect((await sessionFor(handle.db, assetId, siteId))?.log.length ?? 0).toBeGreaterThan(10);
	});

	it("uses the pivot to make a camera tap likelier", async () => {
		const site = sitesForTarget(sylvania).find((s) => s.id === siteId)!;
		const [asset] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, assetId));
		const base = actionChance("camera", { access: asset!.access, heat: asset!.heat }, site);
		const result = await runAction(handle.db, "user-1", { assetId, siteId, action: "camera", now: now(), rng: always });
		expect(result.chance).toBe(Math.min(98, Math.round((base + INTRUSION.PIVOT_ACTION_BONUS) * 100)));
	});

	it("deploys a payload with the intrusion's extra foothold", async () => {
		const r = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "comms_intercept",
			targetStateId: sylvania,
			now: now(),
			rng: always,
			notify: false,
			extraFootholds: INTRUSION.PAYLOAD_FOOTHOLDS
		});
		expect(r.operation.succeeded).toBe(true);
		expect(r.effect?.kind).toBe("comms_intercept");
	});

	it("resets the session", async () => {
		const r = await runIntrusion(handle.db, "user-1", { assetId, siteId, step: "reset", now: now(), rng: always });
		expect(r.session).toBeNull();
		expect(await sessionFor(handle.db, assetId, siteId)).toBeUndefined();
	});
});

describe("life inside the host", () => {
	let operator: number;
	/** Folders on this site's share that hold files (which ones exist varies per site). */
	let folders: string[];

	beforeAll(async () => {
		operator = (
			await plantAsset(handle.db, "user-1", { targetStateId: sylvania, kind: "insider", now: afterCooldown() })
		).assetId;
		for (const step of ["scan", "access", "escalate", "pivot"] as const) {
			await runIntrusion(handle.db, "user-1", {
				assetId: operator,
				siteId,
				step,
				vector: step === "access" ? "phished_operator" : undefined,
				now: now(),
				rng: always
			});
		}
		// The files live on the file share: take the gateway's password and walk in.
		await runDeepMove(handle.db, "user-1", {
			assetId: operator,
			siteId,
			move: "loot",
			item: "svc-password",
			now: now()
		});
		await runDeepMove(handle.db, "user-1", { assetId: operator, siteId, move: "hop", host: "files", now: now() });
		const fs = siteRecords(
			sitesForTarget(sylvania).find((s) => s.id === siteId)!,
			"Empire of Sylvania"
		);
		folders = [...new Set(fs.files.map((f) => f.path.slice(0, f.path.lastIndexOf("/"))))].sort();
	});

	it("walks directories without needing a new intrusion", async () => {
		const root = await browseSystem(handle.db, "user-1", { assetId: operator, siteId, path: "/", now: now() });
		expect(root.dirs.some((d) => d === "/srv")).toBe(true);
		expect(root.files.length).toBe(0);
		const finance = await browseSystem(handle.db, "user-1", {
			assetId: operator,
			siteId,
			path: folders.find((d) => d.startsWith("/srv/"))!,
			now: now()
		});
		expect(finance.files.length).toBeGreaterThan(0);
		expect(finance.lines.some((l) => l.line.startsWith("$ ls -la"))).toBe(true);
	});

	it("reads a partially redacted record", async () => {
		const listing = await browseSystem(handle.db, "user-1", {
			assetId: operator,
			siteId,
			path: folders[0]!,
			now: now()
		});
		const record = await readSystemRecord(handle.db, "user-1", {
			assetId: operator,
			siteId,
			recordId: listing.files[0]!.id,
			now: now()
		});
		expect(record.record.body.length).toBeGreaterThan(40);
		expect(record.lines.some((l) => l.line.startsWith("$ cat"))).toBe(true);
	});

	it("greps for a keyword across the host", async () => {
		const hits = await grepSystem(handle.db, "user-1", { assetId: operator, siteId, query: "REDACTED", now: now() });
		expect(hits.matches.length).toBeGreaterThan(0);
		expect(hits.lines.some((l) => l.line.startsWith("$ grep"))).toBe(true);
	});

	it("copies a record into the dossier once, with heat", async () => {
		const listing = await browseSystem(handle.db, "user-1", {
			assetId: operator,
			siteId,
			path: folders.at(-1)!,
			now: now()
		});
		const record = listing.files[0]!;
		const copied = await exfilRecord(handle.db, "user-1", {
			assetId: operator,
			siteId,
			recordId: record.id,
			now: now()
		});
		expect(copied.file.path).toBe(record.path);
		expect(copied.file.recordId).toBe(record.id);
		const dossier = await filesFor(handle.db, freedonia, sylvania);
		expect(dossier.some((f) => f.recordId === record.id)).toBe(true);
		await expect(
			exfilRecord(handle.db, "user-1", { assetId: operator, siteId, recordId: record.id, now: now() })
		).rejects.toThrow(/already in the dossier/);
	});
});
