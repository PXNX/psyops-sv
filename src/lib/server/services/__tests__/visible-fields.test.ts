import { describe, expect, it } from "@rstest/core";
import { visibleFields } from "#lib/config/game/infiltration.config.js";
import { redactFindings, redactPicture } from "../military/intel.js";
import type { IntelFindings } from "#lib/server/schema.js";

const findings: IntelFindings = {
	sensor: "uav",
	outcome: "ok",
	conditions: { weather: "clear", night: false, cover: "open" },
	ownerStateId: 2,
	ownerStateName: "A state",
	airDefence: { units: 3, radar: 2, interceptChance: 0.2 },
	coverage: { infantry: 0.8 },
	categories: [{ category: "infantry", count: 10, estimated: false, confidence: 80 }],
	unitTypes: [{ unitType: "infantry", count: 10, estimated: false }],
	firingPositions: { count: 2, confidence: 70 },
	buildings: { infrastructure: 3, economy: 2, education: 1, hospitals: 1, fortifications: 2, radar: 1, underConstruction: 0 },
	battle: null
};

describe("spy network depth", () => {
	it("opens more fields with each foothold", () => {
		expect(visibleFields(0).size).toBe(0);
		expect(visibleFields(1).has("unitCounts")).toBe(true);
		expect(visibleFields(2).has("installations")).toBe(true);
		expect(visibleFields(3).has("economy")).toBe(true);
		expect(visibleFields(4).has("treasury")).toBe(true);
	});

	it("redacts a report for a shallow network", () => {
		const shallow = redactFindings(findings, visibleFields(0));
		expect(shallow.categories).toEqual([]);
		expect(shallow.buildings).toBeNull();
		expect(shallow.unitTypes).toBeNull();
		const one = redactFindings(findings, visibleFields(1));
		expect(one.categories).toHaveLength(1);
		expect(one.buildings).toBeNull();
		const deep = redactFindings(findings, visibleFields(4));
		expect(deep.unitTypes).toHaveLength(1);
	});
});
