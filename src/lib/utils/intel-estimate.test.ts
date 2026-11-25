// Fog of war on foreign statistics: intel levels from sources, and estimates
// whose intervals always hold the truth and narrow with more intel.
import { describe, expect, it } from "@rstest/core";
import {
	INTEL,
	combine,
	estimateRank,
	estimateStat,
	fileGroups,
	formatEstimate,
	halfWidth,
	intelLevel,
	intelTier,
	stateIntelFrom,
	type IntelSignals
} from "./intel-estimate.js";

const now = new Date("2026-11-25T12:00:00Z");
const base: IntelSignals = {
	relation: "foreign",
	sharedBorder: false,
	activeAssets: 0,
	files: [],
	recon: [],
	covertOps: []
};
const key = (stat: string, viewer = 1, target = 2, at = now) => ({
	viewerStateId: viewer,
	targetStateId: target,
	stat,
	now: at
});

describe("intelLevel", () => {
	it("knows its own state fully", () => {
		const level = intelLevel({ ...base, relation: "self" }, now);
		expect(level.overall).toBe(1);
		expect(Object.values(level.groups).every((g) => g === 1)).toBe(true);
	});

	it("knows almost nothing about a stranger", () => {
		const level = intelLevel(base, now);
		expect(level.overall).toBeCloseTo(INTEL.PUBLIC, 3);
		expect(intelTier(level.overall)).toBe("unknown");
	});

	it("gives bloc partners a solid picture", () => {
		const level = intelLevel({ ...base, relation: "bloc" }, now);
		expect(intelTier(level.overall)).toBe("solid");
	});

	it("narrows the military group with military files only", () => {
		const files = Array.from({ length: 3 }, () => ({
			siteId: "airbase-3-0",
			classification: "SECRET",
			capturedAt: now
		}));
		const level = intelLevel({ ...base, files }, now);
		expect(level.groups.military).toBeGreaterThan(level.groups.economy + 0.2);
		expect(level.groups.economy).toBeGreaterThan(INTEL.PUBLIC);
		expect(level.sources.some((s) => s.label.includes("dossier"))).toBe(true);
	});

	it("rises with every source and stays below 1", () => {
		const levels = [
			intelLevel(base, now).overall,
			intelLevel({ ...base, sharedBorder: true }, now).overall,
			intelLevel({ ...base, sharedBorder: true, activeAssets: 2 }, now).overall,
			intelLevel({ ...base, sharedBorder: true, activeAssets: 2, covertOps: [now] }, now).overall
		];
		for (let i = 1; i < levels.length; i++) expect(levels[i]!).toBeGreaterThan(levels[i - 1]!);
		const flooded = intelLevel(
			{
				...base,
				activeAssets: 99,
				files: Array.from({ length: 200 }, (_, i) => ({
					siteId: ["plant-1", "airbase-1", "company-1", "telecom-1", "factory-1"][i % 5]!,
					classification: "TOP SECRET",
					capturedAt: now
				})),
				recon: [now, now]
			},
			now
		);
		expect(flooded.overall).toBeLessThanOrEqual(1);
		expect(flooded.overall).toBeGreaterThan(0.95);
	});

	it("lets old intel go stale", () => {
		const fresh = intelLevel(
			{ ...base, files: [{ siteId: "plant-1", classification: "SECRET", capturedAt: now }] },
			now
		);
		const old = intelLevel(
			{
				...base,
				files: [{ siteId: "plant-1", classification: "SECRET", capturedAt: new Date(now.getTime() - 60 * 86_400_000) }]
			},
			now
		);
		expect(old.groups.energy).toBeLessThan(fresh.groups.energy);
	});
});

describe("fileGroups", () => {
	it("maps site ids to stat groups", () => {
		expect(fileGroups("plant-42")).toEqual(["energy"]);
		expect(fileGroups("airbase-3-0")).toEqual(["military"]);
		expect(fileGroups("company-7")).toEqual(["economy"]);
		expect(fileGroups("mystery-1")).toEqual([]);
	});
});

describe("combine", () => {
	it("saturates", () => {
		expect(combine([])).toBe(0);
		expect(combine([0.5, 0.5])).toBeCloseTo(0.75);
		expect(combine([1, 0.3])).toBe(1);
	});
});

describe("estimateStat", () => {
	const spec = { group: "population" as const };

	it("always holds the true value inside the interval", () => {
		for (let t = 0; t < 400; t++) {
			const truth = Math.floor((t * 7919) % 5_000_000);
			const level = (t % 97) / 100;
			const e = estimateStat(truth, level, spec, key(`s${t}`, t, t + 1));
			if (e.kind === "hidden") continue;
			expect(e.low).toBeLessThanOrEqual(truth);
			expect(e.high).toBeGreaterThanOrEqual(truth);
			expect(e.value).toBeGreaterThanOrEqual(e.low);
			expect(e.value).toBeLessThanOrEqual(e.high);
		}
	});

	it("is wide with no intel and about ±5% with high intel", () => {
		const truth = 1_000_000;
		const blind = estimateStat(truth, 0, spec, key("pop"));
		const sharp = estimateStat(truth, 0.95, spec, key("pop"));
		if (blind.kind !== "range" || sharp.kind !== "range") throw new Error("expected ranges");
		expect((blind.high - blind.low) / truth).toBeGreaterThan(1.5);
		expect((sharp.high - sharp.low) / truth).toBeLessThan(0.15);
		expect(halfWidth(0.95)).toBeCloseTo(0.0536, 3);
	});

	it("narrows monotonically as the level rises", () => {
		let last = Infinity;
		for (const level of [0, 0.2, 0.4, 0.6, 0.8, 0.9]) {
			const w = halfWidth(level);
			expect(w).toBeLessThan(last);
			last = w;
		}
	});

	it("is exact when confirmed", () => {
		const e = estimateStat(12345, 1, spec, key("pop"));
		expect(e).toMatchObject({ kind: "exact", value: 12345, low: 12345, high: 12345 });
	});

	it("hides stats below their threshold", () => {
		const e = estimateStat(500, 0.1, { group: "military", hideBelow: 0.2 }, key("power"));
		expect(e.kind).toBe("hidden");
		expect(formatEstimate(e)).toBe("—");
	});

	it("is deterministic per viewer, target, stat and day", () => {
		const a = estimateStat(80_000, 0.3, spec, key("pop"));
		const b = estimateStat(80_000, 0.3, spec, key("pop"));
		expect(b).toEqual(a);
		const otherDays = Array.from({ length: 6 }, (_, d) =>
			estimateStat(80_000, 0.3, spec, key("pop", 1, 2, new Date(now.getTime() + (d + 1) * 86_400_000)))
		);
		expect(otherDays.some((e) => e.value !== a.value)).toBe(true);
		const otherViewer = estimateStat(80_000, 0.3, spec, key("pop", 9));
		const otherStat = estimateStat(80_000, 0.3, spec, key("gdp"));
		expect(otherViewer.value !== a.value || otherStat.value !== a.value).toBe(true);
	});

	it("gives a zero figure a real interval via its scale", () => {
		const e = estimateStat(0, 0.3, { group: "economy", scale: 10_000 }, key("debt"));
		expect(e.kind).toBe("range");
		expect(e.low).toBe(0);
		expect(e.high!).toBeGreaterThan(0);
	});

	it("formats ranges compactly", () => {
		const e = estimateStat(1_200_000, 0.5, spec, key("pop"));
		expect(formatEstimate(e)).toMatch(/^~[\d.]+[kM] \([\d.]+[kM]?–[\d.]+[kM]\)$/);
	});
});

describe("stateIntelFrom", () => {
	it("shows its own state exactly", () => {
		const intel = stateIntelFrom(2, 2, { ...base, relation: "self" }, now);
		expect(intel.exact).toBe(true);
		expect(intel.estimate("debt", 4321, { group: "economy" })).toMatchObject({ kind: "exact", value: 4321 });
	});

	it("estimates a foreign state, seeded like estimateStat", () => {
		const intel = stateIntelFrom(1, 2, base, now);
		expect(intel.exact).toBe(false);
		const spec = { group: "population" as const, scale: 10 };
		const e = intel.estimate("residents", 300, spec);
		expect(e).toEqual(estimateStat(300, intel.level.groups.population, spec, key("residents")));
		expect(e.kind).toBe("range");
	});
});

describe("estimateRank", () => {
	it("sorts hidden figures last", () => {
		const shown = estimateStat(50, 0.5, { group: "military" }, key("a"));
		const hidden = estimateStat(50, 0.05, { group: "military", hideBelow: 0.2 }, key("b"));
		expect(estimateRank(shown)).toBeGreaterThan(estimateRank(hidden));
	});
});
