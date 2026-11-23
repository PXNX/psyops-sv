// The computing chain is pure data and arithmetic: the fabrication recipe,
// the heavy utility draws and the cyber/AI edge are all tested without a DB.
import { describe, expect, it } from "@rstest/core";
import {
	BUILDING_TEMPLATES,
	DATACENTER_BONUS,
	OPINION_FROM_STATE_BUILDINGS,
	FABRICATION,
	datacenterOperational,
	FAB_PRODUCTS,
	aiUpgradeCost,
	covertOdds,
	datacenterCapacity,
	datacenterCyberBonus,
	datacenterResearch,
	factoryEnergyRequirement,
	factoryWaterDraw
} from "#lib/config/index.js";

describe("hardware and datacenter fabrication", () => {
	it("keeps datacenters out of the tradeable fabrication chain", () => {
		expect(FAB_PRODUCTS).toEqual(["chips", "electronics", "hardware"]);
		expect(FABRICATION.electronics.inputs.chips).toBeGreaterThan(0);
		expect(FABRICATION.hardware.inputs.electronics).toBeGreaterThan(0);
		expect(FABRICATION.hardware.inputs.chips).toBeGreaterThan(0);
		expect(BUILDING_TEMPLATES.datacenter.costs.hardware).toBeGreaterThan(0);
	});

	it("makes hardware the power- and water-hungry fab step", () => {
		expect(FABRICATION.hardware.energyDraw).toBeGreaterThan(FABRICATION.chips.energyDraw);
		expect(factoryEnergyRequirement("rifles")).toBeLessThan(factoryEnergyRequirement("hardware"));
		expect(factoryWaterDraw("hardware")).toBeGreaterThan(factoryWaterDraw("chips"));
		expect(datacenterOperational(1, 1)).toBe(true);
		expect(datacenterOperational(0.5, 1)).toBe(false);
		expect(datacenterOperational(1, 0.5)).toBe(false);
	});
});

describe("connectivity buildings", () => {
	it("are constructed by law and make civilians happier", () => {
		expect(BUILDING_TEMPLATES.internet_backbone.stat).toBe("connectivity");
		expect(BUILDING_TEMPLATES.network_switch.stat).toBe("connectivity");
		expect(BUILDING_TEMPLATES.radio_mast.stat).toBe("connectivity");
		expect(BUILDING_TEMPLATES.datacenter.siteOnly).toBe(true);
		expect(OPINION_FROM_STATE_BUILDINGS.connectivity).toBeGreaterThan(0);
	});
});

describe("datacenter bonuses", () => {
	it("counts built sites and loose hardware, up to a cap", () => {
		expect(datacenterCapacity(0, 0)).toBe(0);
		expect(datacenterCapacity(DATACENTER_BONUS.HARDWARE_PER_SITE, 0)).toBe(1);
		expect(datacenterCapacity(0, 2)).toBe(2);
		expect(datacenterCapacity(DATACENTER_BONUS.HARDWARE_PER_SITE * DATACENTER_BONUS.CAP, 0)).toBe(
			DATACENTER_BONUS.CAP
		);
	});

	it("sharpens cyber offence and defence, and makes traffic more deniable", () => {
		const small = datacenterCyberBonus(0, 1);
		const large = datacenterCyberBonus(0, 3);
		expect(small.offence).toBeGreaterThan(0);
		expect(small.defence).toBeGreaterThan(0);
		expect(small.attribution).toBeLessThan(0);
		expect(large.offence).toBeGreaterThan(small.offence);
		expect(datacenterResearch(0, 1)).toBeGreaterThan(0);
		expect(datacenterResearch(0, 3)).toBeGreaterThan(datacenterResearch(0, 1));
	});

	it("changes the odds of a real cyber operation but not psyops", () => {
		const base = { defenceLevel: 2, atWar: true, recentOps: 0, targetResilient: false };
		const wired = { ...base, attackerDatacenter: datacenterCyberBonus(0, 3) };
		expect(covertOdds("grid_attack", wired).success).toBeGreaterThan(covertOdds("grid_attack", base).success);
		expect(covertOdds("grid_attack", wired).attribution).toBeLessThan(
			covertOdds("grid_attack", base).attribution
		);
		expect(covertOdds("leaflet_drop", wired)).toEqual(covertOdds("leaflet_drop", base));
	});
});

describe("AI programme requirements", () => {
	it("needs hardware and datacenters at the upper tiers", () => {
		expect(aiUpgradeCost(0)!.hardware).toBe(0);
		expect(aiUpgradeCost(2)!.hardware).toBeGreaterThan(0);
		expect(aiUpgradeCost(2)!.datacenters).toBeGreaterThan(0);
		expect(aiUpgradeCost(4)!.datacenters).toBeGreaterThan(aiUpgradeCost(2)!.datacenters);
		expect(aiUpgradeCost(5)).toBeNull();
	});
});
