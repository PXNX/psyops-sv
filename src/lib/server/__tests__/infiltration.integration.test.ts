// The infiltration network against a real (in-memory) Postgres: who may build
// it, what it costs, probing a site, watching a camera, copying a sensitive
// file, heat and burning an asset, and the foothold bonus on a covert op.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { infiltrationActions, infiltrationAssets, infiltrationFiles, stateTreasury, states } from "../schema";
import {
	InfiltrationError,
	assetsFor,
	filesFor,
	plantAsset,
	runAction,
	sitesFor
} from "../services/military/infiltration";
import { launchOperation, targetsFor } from "../services/military/covert-ops";
import { INFILTRATION, NETWORK_ASSET_BONUS, covertOdds } from "#lib/config/index.js";

let handle: MockDbHandle;
let freedonia: number;
let sylvania: number;
let siteId: string;
let clock = new Date("2026-11-21T12:00:00Z");
const now = () => new Date((clock = new Date(clock.getTime() + 3600_000)));
/** Skip past the recruitment cooldown so the next plant is allowed. */
const afterCooldown = () =>
	new Date((clock = new Date(clock.getTime() + INFILTRATION.PLANT_COOLDOWN_HOURS * 3600_000)));
const always = () => 0;

const balance = async (stateId: number) =>
	(await handle.db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)))[0]!.balance;

beforeAll(async () => {
	handle = await createMockDb();
	const all = await handle.db.select().from(states);
	freedonia = all.find((s) => s.name === "Republic of Freedonia")!.id;
	sylvania = all.find((s) => s.name === "Empire of Sylvania")!.id;
	siteId = `telecom-${sylvania}-2`;
}, 900_000);

afterAll(async () => {
	await handle?.close();
});

describe("authority and planting", () => {
	it("only a president or minister builds networks, and not in their own state", async () => {
		await expect(
			plantAsset(handle.db, "user-2", { targetStateId: sylvania, kind: "agent", now: now() })
		).rejects.toThrow(InfiltrationError);
		await expect(
			plantAsset(handle.db, "user-1", { targetStateId: freedonia, kind: "agent", now: now() })
		).rejects.toThrow(InfiltrationError);
	});

	it("charges the treasury, gives a stable codename and starts with heat", async () => {
		const before = await balance(freedonia);
		const r = await plantAsset(handle.db, "user-1", { targetStateId: sylvania, kind: "agent", now: now() });
		expect(r.cost).toBe(42_000);
		expect(r.codename.split(" ")).toHaveLength(2);
		expect(await balance(freedonia)).toBe(before - 42_000);
		const [asset] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, r.assetId));
		expect(asset!.access).toBe(2);
		expect(asset!.heat).toBe(12);
		expect(asset!.status).toBe("active");
	});

	it("makes recruiters lie low before the next plant in the same state", async () => {
		const before = await balance(freedonia);
		await expect(
			plantAsset(handle.db, "user-1", { targetStateId: sylvania, kind: "agent", now: now() })
		).rejects.toThrow(/lying low/);
		expect(await balance(freedonia)).toBe(before);
	});
});

describe("using the network", () => {
	let assetId: number;

	beforeAll(async () => {
		const r = await plantAsset(handle.db, "user-1", { targetStateId: sylvania, kind: "implant", now: afterCooldown() });
		assetId = r.assetId;
	});

	it("builds a deterministic site catalogue with the chosen site", async () => {
		const sites = await sitesFor(handle.db, freedonia, sylvania, now());
		expect(sites.find((s) => s.id === siteId)).toBeDefined();
		expect(sites.every((s) => s.accessRequired <= 5)).toBe(true);
	});

	it("refuses actions by an asset without the access the site needs", async () => {
		const command = (await sitesFor(handle.db, freedonia, sylvania, now())).find((s) => s.kind === "command")!;
		await expect(
			runAction(handle.db, "user-1", { assetId, siteId: command.id, action: "files", now: now(), rng: always })
		).rejects.toThrow(/access level/);
	});

	it("probes a site, watches a camera and copies a sensitive file", async () => {
		const probe = await runAction(handle.db, "user-1", { assetId, siteId, action: "probe", now: now(), rng: always });
		expect(probe.success).toBe(true);
		expect(probe.heatAfter).toBeGreaterThan(0);
		const camera = await runAction(handle.db, "user-1", { assetId, siteId, action: "camera", now: now(), rng: always });
		expect(camera.success).toBe(true);
		expect(camera.detail).toContain("watched");
		const files = await runAction(handle.db, "user-1", { assetId, siteId, action: "files", now: now(), rng: always });
		expect(files.success).toBe(true);
		expect(files.fileId).not.toBeNull();
		const dossier = (await filesFor(handle.db, freedonia, sylvania)).find((f) => f.id === files.fileId)!;
		expect(dossier.body.length).toBeGreaterThan(50);
		expect(dossier.classification).toMatch(/SECRET|RESTRICTED/);
		const sites = await sitesFor(handle.db, freedonia, sylvania, now());
		const known = sites.find((s) => s.id === siteId)!;
		expect(known.known).toBe(true);
		expect(known.cameras).toBe(1);
		expect(known.files).toBe(1);
	});

	it("can cover tracks and always succeeds", async () => {
		const before = (await assetsFor(handle.db, freedonia, sylvania, now())).find((a) => a.id === assetId)!;
		const covered = await runAction(handle.db, "user-1", { assetId, action: "cover", now: now(), rng: () => 0.99 });
		expect(covered.success).toBe(true);
		expect(covered.heatAfter).toBeLessThan(before.heat);
	});

	it("burns an asset that gets too exposed and logs every action", async () => {
		await handle.db
			.update(infiltrationAssets)
			.set({ heat: INFILTRATION.HEAT_MAX - 5, lastActionAt: now() })
			.where(eq(infiltrationAssets.id, assetId));
		const result = await runAction(handle.db, "user-1", { assetId, siteId, action: "files", now: now(), rng: always });
		expect(result.burned).toBe(true);
		const [asset] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, assetId));
		expect(asset!.status).toBe("burned");
		await expect(
			runAction(handle.db, "user-1", { assetId, siteId, action: "camera", now: now(), rng: always })
		).rejects.toThrow(/burned/);
		const logged = await handle.db.select().from(infiltrationActions).where(eq(infiltrationActions.assetId, assetId));
		expect(logged.length).toBeGreaterThanOrEqual(4);
	});

	it("keeps a burned asset on the board for a day, then clears it", async () => {
		const [row] = await handle.db.select().from(infiltrationAssets).where(eq(infiltrationAssets.id, assetId));
		const burnedAt = row!.lastActionAt.getTime();
		const hour = 3600_000;
		const soon = await assetsFor(handle.db, freedonia, sylvania, new Date(burnedAt + hour));
		const shown = soon.find((a) => a.id === assetId)!;
		expect(shown.status).toBe("burned");
		expect(new Date(shown.goneAt!).getTime()).toBe(burnedAt + INFILTRATION.BURNED_VISIBLE_HOURS * hour);
		const later = await assetsFor(
			handle.db,
			freedonia,
			sylvania,
			new Date(burnedAt + (INFILTRATION.BURNED_VISIBLE_HOURS + 1) * hour)
		);
		expect(later.find((a) => a.id === assetId)).toBeUndefined();
	});
});

describe("the network feeds covert operations", () => {
	it("is reflected in target intel and improves an operation's odds", async () => {
		const targets = await targetsFor(handle.db, freedonia, now());
		const target = targets.find((t) => t.id === sylvania)!;
		expect(target.networkAssets).toBeGreaterThanOrEqual(1);
		const baseline = covertOdds("grid_attack", {
			defenceLevel: target.defenceLevel,
			atWar: target.atWar || target.casusBelli,
			recentOps: target.recentOps,
			targetResilient: target.resilient
		});
		const r = await launchOperation(handle.db, {
			userId: "user-1",
			kind: "grid_attack",
			targetStateId: sylvania,
			now: now(),
			rng: always,
			notify: false
		});
		expect(r.operation.successChance).toBeGreaterThan(Math.round(baseline.success * 100));
	});
});
