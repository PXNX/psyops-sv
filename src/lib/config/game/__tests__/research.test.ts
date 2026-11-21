// Research trees: costs climb, prerequisites gate the advanced areas, each
// portfolio owns its own fields, and points turn into levels at a bounded pace.
import { describe, expect, it } from "@rstest/core";
import {
	RESEARCH_AREA_IDS,
	RESEARCH_AREAS,
	availableResearch,
	canResearch,
	levelOf,
	portfolioResearch,
	researchArea,
	researchBonus,
	researchCost,
	researchPointsPerDay,
	researchPrerequisitesMet,
	researchProgress,
	researchSpent,
	researchTotalCost
} from "../research.config";

describe("research areas", () => {
	it("covers health, bio-defence, space, air, land, AI, power and production", () => {
		for (const id of [
			"health",
			"antivirus",
			"space",
			"air_defence",
			"land_defence",
			"ai",
			"power_efficiency",
			"production"
		]) {
			expect(researchArea(id)).not.toBeNull();
		}
	});

	it("gives every area one portfolio, a cost and a bounded effect", () => {
		for (const id of RESEARCH_AREA_IDS) {
			const area = RESEARCH_AREAS[id];
			expect(area.label).toBeTruthy();
			expect(area.blurb).toBeTruthy();
			expect(["science_health", "economy_energy", "foreign_trade", "defence_interior"]).toContain(area.portfolio);
			expect(area.maxLevel).toBeGreaterThan(0);
			expect(area.baseCost).toBeGreaterThan(0);
			expect(area.costGrowth).toBeGreaterThan(1);
			expect(area.effectPerLevel).toBeGreaterThan(0);
			expect(area.effect).toBeTruthy();
		}
	});

	it("spreads areas across all four minister portfolios", () => {
		const portfolios = new Set(RESEARCH_AREA_IDS.map((id) => RESEARCH_AREAS[id].portfolio));
		expect(portfolios.size).toBe(4);
		expect(portfolioResearch("science_health")).toContain("antivirus");
		expect(portfolioResearch("economy_energy")).toContain("power_efficiency");
		expect(portfolioResearch("foreign_trade")).toContain("trade");
		expect(portfolioResearch("defence_interior")).toContain("space");
	});
});

describe("research costs", () => {
	it("rises with each level and stops at the cap", () => {
		const first = researchCost("production", 0)!;
		expect(first).toBeGreaterThan(0);
		expect(researchCost("production", 1)!).toBeGreaterThan(first);
		expect(researchCost("production", RESEARCH_AREAS.production.maxLevel)).toBeNull();
	});

	it("sums the cost of a whole run", () => {
		const stepwise = researchCost("health", 0)! + researchCost("health", 1)! + researchCost("health", 2)!;
		expect(researchTotalCost("health", 0, 3)).toBe(stepwise);
		expect(researchTotalCost("health", 0, 99)).toBe(researchTotalCost("health", 0, RESEARCH_AREAS.health.maxLevel));
		expect(researchSpent("health", { health: 1 })).toBe(researchCost("health", 0));
	});
});

describe("prerequisites", () => {
	it("unlocks advanced areas only after their parent field", () => {
		expect(researchPrerequisitesMet("antivirus", {})).toBe(false);
		expect(researchPrerequisitesMet("antivirus", { health: 1 })).toBe(true);
		expect(researchPrerequisitesMet("ai", { fabrication: 1 })).toBe(true);
		expect(canResearch("antivirus", {})).toBe(false);
		expect(canResearch("antivirus", { health: 1 })).toBe(true);
	});

	it("offers root fields to a state with no research", () => {
		const open = availableResearch({});
		expect(open).toContain("health");
		expect(open).toContain("land_defence");
		expect(open).not.toContain("antivirus");
		expect(open).not.toContain("space");
	});

	it("clamps levels and hides maxed areas", () => {
		const maxed = { production: 99 } as never;
		expect(levelOf(maxed, "production")).toBe(RESEARCH_AREAS.production.maxLevel);
		expect(availableResearch(maxed)).not.toContain("production");
	});
});

describe("research output", () => {
	it("turns levels into bonuses", () => {
		expect(researchBonus("health", {})).toBe(0);
		expect(researchBonus("health", { health: 2 })).toBeCloseTo(2 * RESEARCH_AREAS.health.effectPerLevel);
	});

	it("grows with labs and AI, and never goes negative", () => {
		expect(researchPointsPerDay(0)).toBe(0);
		expect(researchPointsPerDay(2)).toBe(2);
		expect(researchPointsPerDay(2, 4)).toBeGreaterThan(researchPointsPerDay(2));
		expect(researchPointsPerDay(-5)).toBe(0);
	});

	it("reports progress bounded between zero and one", () => {
		expect(researchProgress(50, 100)).toBe(0.5);
		expect(researchProgress(500, 100)).toBe(1);
		expect(researchProgress(-10, 100)).toBe(0);
		expect(researchProgress(10, null)).toBe(1);
	});
});
