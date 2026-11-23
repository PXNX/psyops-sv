// The computing chain is pure data and arithmetic: the fabrication recipe,
// the heavy utility draws and the cyber/AI edge are all tested without a DB.
import { describe, expect, it } from "@rstest/core";
import {
	DATACENTER_BONUS,
	FABRICATION,
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
	it("extends the chip chain with hardware and datacenters", () => {
		expect(FAB_PRODUCTS).toEqual(["chips", "electronics", "hardware", "datacenter"]);
		expect(FABRICATION.electronics.inputs.chips).toBeGreaterThan(0);
		expect(FABRICATION.hardware.inputs.electronics).toBeGreaterThan(0);
		expect(FABRICATION.hardware.inputs.chips).toBeGreaterThan(0);
		expect(FABRICATION.datacenter.inputs.hardware).toBeGreaterThan(0);
	});

	it("is far hungrier for electricity and water than earlier fab steps", () => {
		expect(FABRICATION.hardware.energyDraw).toBeGreaterThan(FABRICATION.chips.energyDraw);
		expect(FABRICATION.datacenter.energyDraw).toBeGreaterThan(FABRICATION.hardware.energyDraw);
		expect(factoryEnergyRequirement("datacenter")).toBe(FABRICATION.datacenter.energyDraw);
		expect(factoryEnergyRequirement("rifles")).toBeLessThan(factoryEnergyRequirement("hardware"));
		expect(factoryWaterDraw("hardware")).toBeGreaterThan(factoryWaterDraw("chips"));
		expect(factoryWaterDraw("datacenter")).toBeGreaterThan(factoryWaterDraw("hardware"));
	});
});

describe("datacenter bonuses", () => {
	it("counts built sites and loose hardware, up to a cap", () => {
		expect(datacenterCapacity(0, 0)).toBe(0);
		expect(datacenterCapacity(DATACENTER_BONUS.HARDWARE_PER_SITE, 0)).toBe(1);
		expect(datacenterCapacity(0, 2)).toBe(2);
		expect(datacenterCapacity(10_000, 0)).toBe(DATACENTER_BONUS.CAP);
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
