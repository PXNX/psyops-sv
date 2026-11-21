// Pure config tests for the five domains, sea power, space, AI, smuggling,
// energy and fabrication. No database: these are the rules the UI shows and
// the services apply, so a drift here is a bug in both places at once.
import { describe, expect, it } from "@rstest/core";
import {
	AI_LEVELS,
	AMPHIBIOUS,
	DOMAINS,
	DOMAIN_IDS,
	ENERGY_CONFIG,
	FABRICATION,
	MILITARY_UNIT_TEMPLATES,
	NAVAL_OPS,
	POWER_PLANTS,
	PRODUCTION_QUALITY,
	RAID,
	SATELLITE_KINDS,
	SMUGGLING,
	SMUGGLING_GOODS,
	SPACE_OPS,
	aiCyberDefence,
	aiCyberOffence,
	aiDetectionBonus,
	aiLevelSpec,
	aiProductionFactor,
	aiReconBonus,
	aiUpgradeCost,
	amphibiousPenalty,
	blockadeEffects,
	blockadeStrength,
	canAmphibiousAssault,
	chipReadiness,
	combinedArmsBonus,
	covertOdds,
	dailyFuelUse,
	domainEdge,
	domainMix,
	domainOfUnit,
	energyDiversityFactor,
	fightsOnLand,
	gpsFactor,
	convoySurvival,
	dueForWear,
	disruptionFactor,
	efficiencyFactor,
	equipmentForFactory,
	gridConcentration,
	nextEfficiency,
	nextQuality,
	isNavalUnit,
	maxCargo,
	qualityFactor,
	regionSupplyCapacity,
	roundSupplyCost,
	navalInterdictChance,
	navalSuccessChance,
	raidHaul,
	seaControlPoints,
	seaControlStrength,
	sideDomainMultiplier,
	smuggleFine,
	smuggleInterceptChance,
	smugglePayout,
	smugglePremium,
	supplyDemand,
	logisticsSupplyFactor,
	stackedDisruption,
	unitSupplyModifier,
	spaceOpOdds,
	spaceOpDamage,
	strikeAccuracy
} from "#lib/config/index.js";

describe("five domains", () => {
	it("defines exactly air, land, sea, space and cyber", () => {
		expect(DOMAIN_IDS.sort()).toEqual(["air", "cyber", "land", "sea", "space"]);
		for (const id of DOMAIN_IDS) expect(DOMAINS[id].label).toBeTruthy();
	});

	it("classifies every military unit into its fighting domain", () => {
		for (const [type, template] of Object.entries(MILITARY_UNIT_TEMPLATES)) {
			expect(domainOfUnit(type)).toBe(template.domain);
		}
		expect(domainOfUnit("battleship")).toBeNull();
	});

	it("puts marines on land and hulls at sea", () => {
		expect(fightsOnLand("marine")).toBe(true);
		expect(isNavalUnit("carrier")).toBe(true);
		expect(isNavalUnit("marine")).toBe(false);
		expect(domainMix(["infantry", "marine", "frigate", "fighter_squadron"])).toEqual({
			land: 2,
			sea: 1,
			air: 1
		});
	});

	it("rewards combined arms and keeps the edge matrix mild", () => {
		expect(combinedArmsBonus(["infantry"])).toBe(1);
		expect(combinedArmsBonus(["infantry", "frigate", "fighter_squadron"])).toBeCloseTo(1.16);
		expect(domainEdge("air", "sea")).toBeGreaterThan(domainEdge("air", "land"));
		expect(domainEdge("sea", "land")).toBeGreaterThan(1);
		expect(sideDomainMultiplier(["frigate"], ["infantry"])).toBeGreaterThan(1);
		expect(sideDomainMultiplier(["fighter_squadron"], ["armor"])).toBeLessThan(1);
	});
});

describe("naval warfare", () => {
	it("has five operations with their own costs and requirements", () => {
		expect(Object.keys(NAVAL_OPS).sort()).toEqual([
			"amphibious_assault",
			"blockade",
			"minelaying",
			"sea_lane_raid",
			"shore_bombardment"
		]);
		expect(NAVAL_OPS.amphibious_assault.marinesRequired).toBe(1);
		expect(NAVAL_OPS.shore_bombardment.needsCoast).toBe(true);
	});

	it("turns hulls into sea control with diminishing effect against threats", () => {
		expect(seaControlPoints(["frigate", "submarine", "carrier"])).toBe(10);
		expect(seaControlStrength(10)).toBeGreaterThan(seaControlStrength(5));
		expect(seaControlStrength(10, 20, 10)).toBeLessThan(seaControlStrength(10));
		expect(navalInterdictChance(0)).toBeLessThan(navalInterdictChance(20));
	});

	it("makes a blockade bite trade, energy and smuggling", () => {
		const s = blockadeStrength(20, 5);
		expect(s).toBeGreaterThan(0.5);
		const e = blockadeEffects(s);
		expect(e.tradeFactor).toBeLessThan(1);
		expect(e.energyFactor).toBeLessThan(1);
		expect(e.smugglingFactor).toBeGreaterThan(1);
		expect(e.costPerHour).toBeGreaterThan(0);
		expect(blockadeStrength(5, 20)).toBeLessThan(s);
	});

	it("gates amphibious landings on marines, ships and their health", () => {
		expect(canAmphibiousAssault({ marines: 1, landingShips: 1, marinesHealthy: true, shipsHealthy: true }).ok).toBe(true);
		expect(canAmphibiousAssault({ marines: 0, landingShips: 1, marinesHealthy: true, shipsHealthy: true }).ok).toBe(false);
		expect(canAmphibiousAssault({ marines: 1, landingShips: 1, marinesHealthy: false, shipsHealthy: true }).ok).toBe(false);
		expect(amphibiousPenalty(0)).toBeGreaterThan(amphibiousPenalty(5));
		expect(amphibiousPenalty(99)).toBeGreaterThanOrEqual(1 - AMPHIBIOUS.MAX_PENALTY);
	});

	it("caps raid hauls and scales naval success with sea control", () => {
		expect(raidHaul(10_000_000, 1)).toBe(RAID.TREASURY_MAX);
		expect(raidHaul(1_000_000, 0.5)).toBe(15_000);
		expect(navalSuccessChance("blockade", 20, 0, 0)).toBeGreaterThan(navalSuccessChance("blockade", 4, 5, 5));
		expect(navalSuccessChance("amphibious_assault", 20, 0, 0, 5)).toBeLessThan(
			navalSuccessChance("amphibious_assault", 20, 0, 0)
		);
	});
});

describe("space", () => {
	it("gives each satellite kind a cost, orbit and one clear purpose", () => {
		for (const kind of Object.keys(SATELLITE_KINDS) as (keyof typeof SATELLITE_KINDS)[]) {
			const spec = SATELLITE_KINDS[kind];
			expect(spec.cost).toBeGreaterThan(0);
			expect(spec.orbit).toMatch(/^(leo|meo|geo)$/);
			expect(spec.upkeepPerDay).toBeGreaterThan(0);
		}
	});

	it("improves GPS and recon with satellites but with diminishing returns", () => {
		expect(gpsFactor(0)).toBe(1);
		expect(gpsFactor(1)).toBeGreaterThan(1);
		expect(gpsFactor(8)).toBeLessThan(gpsFactor(4) * 2);
	});

	it("makes ASAT strikes harder against higher orbits and defended states", () => {
		const leo = spaceOpOdds("asat_strike", "leo", 0, false);
		const geo = spaceOpOdds("asat_strike", "geo", 0, false);
		expect(geo.success).toBeLessThan(leo.success);
		expect(spaceOpOdds("asat_strike", "leo", 4, false).success).toBeLessThan(leo.success);
		expect(leo.attribution).toBeGreaterThan(spaceOpOdds("asat_strike", "leo", 0, true).attribution);
		expect(spaceOpDamage("asat_strike")).toBeGreaterThanOrEqual(SATELLITE_KINDS.recon.health);
		expect(Object.keys(SPACE_OPS)).toContain("uplink_jam");
	});

	it("sharpens guided strikes when GPS satellites are up", () => {
		const target = "industry" as const;
		const weapon = "gps_bomb" as never;
		const ctx = {
			conditions: { weather: "clear" as const, night: false, cover: "open" as const },
			adUnits: 0,
			intelConfidence: 0.5,
			buildingsSeen: true,
			ownTroopsEngaged: false,
			population: 1000,
			density: 10,
			enemyUnits: 1
		};
		expect(strikeAccuracy(target, weapon, { ...ctx, gpsAccuracy: 1.25 }).value).toBeGreaterThan(
			strikeAccuracy(target, weapon, ctx).value
		);
		// Unguided weapons don't benefit.
		expect(strikeAccuracy(target, "unguided_bombs" as never, { ...ctx, gpsAccuracy: 1.25 }).value).toBe(
			strikeAccuracy(target, "unguided_bombs" as never, ctx).value
		);
	});
});

describe("artificial intelligence", () => {
	it("has six levels with rising costs and bonuses", () => {
		expect(AI_LEVELS).toHaveLength(6);
		expect(aiUpgradeCost(5)).toBeNull();
		expect(aiUpgradeCost(0)!.cost).toBeLessThan(aiUpgradeCost(4)!.cost);
		expect(aiProductionFactor(5)).toBeGreaterThan(aiProductionFactor(0));
		expect(aiReconBonus(5)).toBeGreaterThan(aiReconBonus(0));
		expect(aiCyberOffence(5)).toBeGreaterThan(aiCyberDefence(0));
		expect(aiDetectionBonus(5)).toBeGreaterThan(0);
		expect(aiLevelSpec(99).label).toBe(AI_LEVELS[5].label);
	});

	it("sharps cyber operations without touching psyops", () => {
		const base = {
			defenceLevel: 2,
			atWar: true,
			recentOps: 0,
			targetResilient: false
		};
		const plain = covertOdds("grid_attack", base);
		const smart = covertOdds("grid_attack", { ...base, attackerAiLevel: 5, defenderAiLevel: 0 });
		const defended = covertOdds("grid_attack", { ...base, defenderAiLevel: 5 });
		expect(smart.success).toBeGreaterThan(plain.success);
		expect(defended.success).toBeLessThan(plain.success);
		expect(defended.attribution).toBeGreaterThan(plain.attribution);
		expect(covertOdds("leaflet_drop", { ...base, attackerAiLevel: 5 })).toEqual(
			covertOdds("leaflet_drop", base)
		);
	});
});

describe("smuggling", () => {
	it("prices scarce and controlled goods higher", () => {
		expect(SMUGGLING_GOODS.chips.basePrice).toBeGreaterThan(0);
		expect(smugglePremium(true, true)).toBeGreaterThan(smugglePremium(false, false));
		expect(smugglePayout("chips", 10, true, false)).toBeGreaterThan(smugglePayout("chips", 10, false, false));
		expect(smuggleFine("chips", 10)).toBeGreaterThan(0);
	});

	it("raises interception with enforcement, blockades and sea control but lowers it with AI", () => {
		const base = { bulk: 1, sanctioned: false, blockaded: false, enforcement: 0, aiLevel: 0, seaControl: 0 };
		const risk = smuggleInterceptChance(base);
		expect(smuggleInterceptChance({ ...base, sanctioned: true })).toBeGreaterThan(risk);
		expect(smuggleInterceptChance({ ...base, blockaded: true })).toBeGreaterThan(risk);
		expect(smuggleInterceptChance({ ...base, enforcement: 5 })).toBeGreaterThan(risk);
		expect(smuggleInterceptChance({ ...base, seaControl: 30 })).toBeGreaterThan(risk);
		expect(smuggleInterceptChance({ ...base, aiLevel: 5 })).toBeLessThan(risk);
		expect(maxCargo("fuel")).toBeLessThan(maxCargo("chips"));
	});

	it("keeps the base interception chance honest", () => {
		expect(SMUGGLING.BASE_INTERCEPT).toBeGreaterThan(0);
		expect(SMUGGLING.BASE_INTERCEPT).toBeLessThan(0.5);
	});
});

describe("energy and industry", () => {
	it("offers eight plant types including renewables and fusion", () => {
		expect(Object.keys(POWER_PLANTS)).toHaveLength(8);
		expect(POWER_PLANTS.geothermal.renewable).toBe(true);
		expect(POWER_PLANTS.fusion.output).toBeGreaterThan(POWER_PLANTS.coal.output);
		expect(POWER_PLANTS.nuclear.fuel!.resource).toBe("enriched_uranium");
	});

	it("rewards a diversified grid and flags concentration", () => {
		expect(energyDiversityFactor(1)).toBe(1);
		expect(energyDiversityFactor(3)).toBeGreaterThan(1);
		expect(energyDiversityFactor(20)).toBeLessThanOrEqual(1 + ENERGY_CONFIG.DIVERSITY_MAX);
		expect(gridConcentration({ coal: 90, solar: 10 })).toBeCloseTo(0.9);
		expect(gridConcentration({})).toBe(0);
	});

	it("burns the right fuel and produces chips from silicon and rare earths", () => {
		expect(dailyFuelUse([{ plantType: "coal", count: 2 }])).toEqual({ coal: 400 });
		expect(FABRICATION.chips.inputs.silicon).toBeGreaterThan(0);
		expect(FABRICATION.electronics.inputs.chips).toBeGreaterThan(0);
		expect(chipReadiness(0, 0)).toBe(0);
		expect(chipReadiness(1000, 1000)).toBe(1);
	});
});

describe("logistics and supply chains", () => {
	it("derives capacity from infrastructure, borders, ports and terrain", () => {
		const bare = regionSupplyCapacity({ id: 1, terrain: "plains", infrastructure: 0 }, 0, false);
		const rich = regionSupplyCapacity({ id: 2, terrain: "plains", infrastructure: 5 }, 3, true);
		expect(rich).toBeGreaterThan(bare);
		expect(regionSupplyCapacity({ id: 3, terrain: "mountain", infrastructure: 5 }, 3, true)).toBeLessThan(rich);
		expect(regionSupplyCapacity({ id: 4, terrain: "shore", infrastructure: 5 }, 3, true)).toBeGreaterThan(
			regionSupplyCapacity({ id: 5, terrain: "shore", infrastructure: 5 }, 3, false)
		);
	});

	it("counts the draw of units and factories", () => {
		const demand = supplyDemand(["infantry", "armor", "frigate"], ["armaments", "fabrication"]);
		expect(demand).toBeGreaterThan(supplyDemand(["infantry"], []));
		expect(supplyDemand([], ["fabrication"])).toBeGreaterThan(supplyDemand([], ["armaments"]));
	});

	it("stacks disruptions with diminishing returns and adds blockade cuts", () => {
		expect(disruptionFactor([0.5], 0)).toBeCloseTo(0.5);
		expect(disruptionFactor([0.5, 0.5], 0)).toBeLessThan(0.5);
		expect(disruptionFactor([0], 1)).toBeLessThan(1);
		expect(stackedDisruption([1, 1, 1])).toBeLessThanOrEqual(0.8);
	});

	it("ties combat output and production to supply", () => {
		expect(logisticsSupplyFactor(100, 50)).toBe(1);
		expect(logisticsSupplyFactor(100, 200)).toBe(0.5);
		expect(logisticsSupplyFactor(100, 200, 0.5)).toBe(0.25);
		expect(unitSupplyModifier(100, 1)).toBe(1);
		expect(unitSupplyModifier(0, 1)).toBeLessThan(0.5);
		expect(unitSupplyModifier(100, 0.5)).toBe(0.5);
		expect(roundSupplyCost(0.25)).toBeGreaterThan(roundSupplyCost(1));
	});

	it("makes escorts matter against a blockade", () => {
		expect(convoySurvival(1, 0)).toBeLessThan(convoySurvival(1, 5));
		expect(convoySurvival(0, 0)).toBe(1);
	});
});

describe("equipment, efficiency and quality", () => {
	it("requires shared tools, plus specialized kit for fabrication", () => {
		expect(equipmentForFactory("mine").machine_tools).toBeGreaterThan(0);
		expect(equipmentForFactory("fabrication").fab_equipment).toBeGreaterThan(0);
		expect(equipmentForFactory("armaments").fab_equipment).toBeUndefined();
	});

	it("learns on clean shifts and loses know-how on shortages and attacks", () => {
		expect(efficiencyFactor(50)).toBeGreaterThan(0.7);
		expect(efficiencyFactor(100)).toBeGreaterThan(efficiencyFactor(50));
		expect(qualityFactor(100)).toBeGreaterThan(qualityFactor(0));
		expect(nextEfficiency(50, { supplied: true, disruptions: [1, 1] })).toBeGreaterThan(50);
		expect(nextEfficiency(50, { supplied: true, disruptions: [0.4, 1] })).toBeLessThan(50);
		expect(nextEfficiency(50, { supplied: false, disruptions: [1] })).toBe(50 - PRODUCTION_QUALITY.LOSS_ON_SHORTAGE);
		expect(nextQuality(90, 70, true)).toBeLessThan(90);
	});

	it("grinds machine tools every few shifts", () => {
		expect(dueForWear(1)).toBe(false);
		expect(dueForWear(5)).toBe(true);
		expect(dueForWear(10)).toBe(true);
	});
});
