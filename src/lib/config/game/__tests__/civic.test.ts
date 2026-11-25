import { describe, expect, it } from "@rstest/core";
import {
	CIVIC_BUILDINGS,
	CIVIC_DEDICATION,
	CIVIC_SATURATION,
	allocateCivicOpinion,
	civicBuildingOpinion,
	civicInvested,
	civicNewBuildingEffect,
	civicSaturation,
	civicTier,
	civicUpgradeCost,
	civicUpgradeDays,
	parsePlaque,
	patronRank
} from "../civic.config";

describe("civic tiers", () => {
	it("each tier multiplies the opinion a building is worth", () => {
		expect(civicBuildingOpinion("clinic", 1)).toBe(9);
		expect(civicBuildingOpinion("clinic", 2)).toBe(14);
		expect(civicBuildingOpinion("clinic", 3)).toBe(18);
	});

	it("clamps nonsense tiers into range", () => {
		expect(civicTier(0).tier).toBe(1);
		expect(civicTier(99).tier).toBe(3);
		expect(civicTier(Number.NaN).tier).toBe(1);
	});

	it("prices expansions as a share of the original", () => {
		expect(civicUpgradeCost("water_works", 2)).toBe(15_000);
		expect(civicUpgradeCost("water_works", 3)).toBe(25_000);
		expect(civicUpgradeDays("water_works", 2)).toBeGreaterThanOrEqual(1);
		expect(civicInvested("water_works", 3, true)).toBe(25_000 + 15_000 + 25_000 + CIVIC_DEDICATION.COST);
	});

	it("a plaque adds a flat bonus", () => {
		expect(civicBuildingOpinion("market_hall", 1, true)).toBe(
			CIVIC_BUILDINGS.market_hall.opinion + CIVIC_DEDICATION.OPINION
		);
	});
});

describe("saturation", () => {
	it("the first building counts in full, later ones less, never below the floor", () => {
		expect(civicSaturation(0)).toBe(1);
		expect(civicSaturation(1)).toBe(CIVIC_SATURATION.DECAY);
		expect(civicSaturation(2)).toBeLessThan(civicSaturation(1));
		expect(civicSaturation(50)).toBe(CIVIC_SATURATION.FLOOR);
	});

	it("spamming one region gives diminishing returns", () => {
		const one = allocateCivicOpinion([6]).total;
		const four = allocateCivicOpinion([6, 6, 6, 6]).total;
		expect(four).toBeLessThan(4 * one);
		expect(four).toBeGreaterThan(one);
	});

	it("previews the effect a new building would open at", () => {
		expect(civicNewBuildingEffect("clinic", 0)).toEqual({ value: 9, multiplier: 1, effective: 9 });
		const third = civicNewBuildingEffect("clinic", 2);
		expect(third.effective).toBeCloseTo(9 * CIVIC_SATURATION.DECAY ** 2);
	});
});

describe("plaques", () => {
	it("cleans whitespace and accepts names in any script", () => {
		expect(parsePlaque("  The   Founders' Hall ")).toEqual({ ok: true, text: "The Founders' Hall" });
		expect(parsePlaque("Šárka Novotná").ok).toBe(true);
	});

	it("rejects too short, too long and markup", () => {
		expect(parsePlaque("ab").ok).toBe(false);
		expect(parsePlaque("x".repeat(CIVIC_DEDICATION.MAX_LENGTH + 1)).ok).toBe(false);
		expect(parsePlaque("<script>").ok).toBe(false);
		expect(parsePlaque(null).ok).toBe(false);
	});
});

describe("patron rank", () => {
	it("climbs with goodwill and reports progress to the next title", () => {
		expect(patronRank(0)).toMatchObject({ level: 1, label: "Private citizen" });
		const mid = patronRank(10);
		expect(mid.label).toBe("Donor");
		expect(mid.next?.label).toBe("Benefactor");
		expect(mid.progress).toBeCloseTo(0.5);
		expect(patronRank(1000)).toMatchObject({ next: null, progress: 1 });
	});
});
