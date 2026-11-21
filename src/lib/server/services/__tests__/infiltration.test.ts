// Pure rules of the player-driven network: stable site catalogues, heat decay,
// action odds, generated dossiers, and how footholds improve covert ops.
import { describe, expect, it } from "@rstest/core";
import {
	INFILTRATION,
	INFILTRATION_ASSETS,
	NETWORK_ASSET_BONUS,
	actionChance,
	assetCodename,
	covertOdds,
	effectiveHeat,
	fileFor,
	sitesForTarget
} from "#lib/config/index.js";

describe("network assets", () => {
	it("gives every asset kind a cost, access level and plant heat", () => {
		for (const spec of Object.values(INFILTRATION_ASSETS)) {
			expect(spec.cost).toBeGreaterThan(0);
			expect(spec.access).toBeGreaterThanOrEqual(1);
			expect(spec.access).toBeLessThanOrEqual(5);
			expect(spec.plantHeat).toBeGreaterThan(0);
		}
	});

	it("makes stable, distinct codenames", () => {
		const a = assetCodename(1, 2, 0);
		expect(assetCodename(1, 2, 0)).toBe(a);
		expect(assetCodename(1, 2, 1)).not.toBe(a);
		expect(a.split(" ")).toHaveLength(2);
	});
});

describe("heat", () => {
	it("decays with idle time and never drops below zero or above the cap", () => {
		const now = new Date("2026-01-10T12:00:00Z");
		expect(effectiveHeat({ heat: 40, lastActionAt: now }, now)).toBe(40);
		expect(effectiveHeat({ heat: 40, lastActionAt: new Date(now.getTime() - 2 * 3600_000) }, now)).toBe(
			40 - 2 * INFILTRATION.HEAT_DECAY_PER_HOUR
		);
		expect(effectiveHeat({ heat: 10, lastActionAt: "2020-01-01T00:00:00Z" }, now)).toBe(0);
		expect(effectiveHeat({ heat: 500, lastActionAt: now }, now)).toBe(INFILTRATION.HEAT_MAX);
	});
});

describe("site catalogue", () => {
	const plants = [{ id: 7, name: "Ashfield Coal Station", plantType: "coal" }];

	it("is deterministic and includes real power plants", () => {
		const a = sitesForTarget(2, plants);
		expect(sitesForTarget(2, plants)).toEqual(a);
		expect(a.find((s) => s.id === "plant-7")?.name).toBe("Ashfield Coal Station");
		expect(a.some((s) => s.kind === "airbase")).toBe(true);
		expect(a.some((s) => s.kind === "datacenter")).toBe(true);
		expect(a.some((s) => s.kind === "command")).toBe(true);
	});

	it("makes harder sites need more access", () => {
		const sites = sitesForTarget(2, plants);
		const command = sites.find((s) => s.kind === "command")!;
		const telecom = sites.find((s) => s.kind === "telecom")!;
		expect(command.accessRequired).toBeGreaterThan(telecom.accessRequired);
	});
});

describe("action odds", () => {
	it("rewards access, punishes heat, and lets cover tracks always work", () => {
		const site = { security: 3 };
		expect(actionChance("files", { access: 4, heat: 0 }, site)).toBeGreaterThan(
			actionChance("files", { access: 2, heat: 0 }, site)
		);
		expect(actionChance("files", { access: 4, heat: 60 }, site)).toBeLessThan(
			actionChance("files", { access: 4, heat: 0 }, site)
		);
		expect(actionChance("cover", { access: 1, heat: 99 }, { security: 5 })).toBe(1);
		expect(actionChance("probe", { access: 1, heat: 95 }, { security: 5 })).toBeGreaterThanOrEqual(0.15);
	});
});

describe("dossiers", () => {
	it("fills a template with stable content and respects the size cap", () => {
		const site = sitesForTarget(2, []).find((s) => s.kind === "datacenter")!;
		const a = fileFor(site, "Empire of Sylvania", 12, new Date("2026-11-21T00:00:00Z"));
		expect(fileFor(site, "Empire of Sylvania", 12, new Date("2026-11-21T00:00:00Z"))).toEqual(a);
		expect(a.body.length).toBeLessThanOrEqual(INFILTRATION.FILE_MAX_CHARS);
		expect(a.classification).toMatch(/RESTRICTED|SECRET|TOP SECRET/);
		expect(a.title.length).toBeGreaterThan(0);
	});
});

describe("footholds in covert operations", () => {
	const base = { defenceLevel: 0, atWar: true, recentOps: 0, targetResilient: false };

	it("raise success and lower attribution, up to the cap", () => {
		const none = covertOdds("grid_attack", base);
		const some = covertOdds("grid_attack", { ...base, networkAssets: 2 });
		expect(some.success).toBeCloseTo(none.success + NETWORK_ASSET_BONUS.SUCCESS_PER_ASSET * 2);
		expect(some.attribution).toBeCloseTo(none.attribution - NETWORK_ASSET_BONUS.ATTRIBUTION_PER_ASSET * 2);
		expect(some.factors.some((f) => /Network footholds/.test(f.label))).toBe(true);
		const capped = covertOdds("grid_attack", { ...base, networkAssets: 99 });
		expect(capped.success).toBeCloseTo(none.success + NETWORK_ASSET_BONUS.SUCCESS_PER_ASSET * NETWORK_ASSET_BONUS.CAP);
	});

	it("leave self-targeted campaigns and the default unchanged", () => {
		expect(covertOdds("counter_propaganda", { ...base, networkAssets: 3 }).factors).toEqual([]);
		expect(covertOdds("grid_attack", base)).toEqual(covertOdds("grid_attack", { ...base, networkAssets: 0 }));
	});
});
