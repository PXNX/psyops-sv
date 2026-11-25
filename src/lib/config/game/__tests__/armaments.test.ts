// Armaments market rules: goods, condition, guide prices, routes and delivery.
import { describe, expect, it } from "@rstest/core";
import {
	ARMAMENTS,
	ARMAMENT_GOODS,
	ARMAMENT_PROFILE,
	armamentValue,
	armsRoute,
	blendCondition,
	conditionFactor,
	conditionGrade,
	deliveryHours,
	demandFactor,
	guidePrice,
	isArmament,
	levyPercent,
	priceBand,
	wornCondition
} from "../armaments.config";

describe("armaments", () => {
	it("recognises only military hardware", () => {
		expect(isArmament("rifles")).toBe(true);
		expect(isArmament("artillery")).toBe(true);
		expect(isArmament("iron")).toBe(false);
		expect(ARMAMENT_GOODS).toHaveLength(5);
		for (const g of ARMAMENT_GOODS) expect(ARMAMENT_PROFILE[g].label).toBeTruthy();
	});

	it("prices hardware from the shared good values", () => {
		expect(armamentValue("vehicles")).toBeGreaterThan(armamentValue("ammunition"));
		expect(armamentValue("unknown")).toBeGreaterThan(0);
		expect(ARMAMENTS.EXPORT_TAX_PERCENT).toBe(5);
	});
});

describe("condition", () => {
	it("is worth less the more worn it is", () => {
		expect(conditionFactor(100)).toBe(1);
		expect(conditionFactor(0)).toBeCloseTo(ARMAMENTS.CONDITION_VALUE_FLOOR);
		expect(conditionFactor(50)).toBeLessThan(conditionFactor(80));
		expect(conditionFactor(500)).toBe(1);
	});

	it("wears each time it changes hands, never below the floor", () => {
		expect(wornCondition(100)).toBe(100 - ARMAMENTS.RESALE_WEAR);
		expect(wornCondition(ARMAMENTS.MIN_CONDITION)).toBe(ARMAMENTS.MIN_CONDITION);
		expect(wornCondition(-5)).toBe(ARMAMENTS.MIN_CONDITION);
	});

	it("grades and blends batches", () => {
		expect(conditionGrade(100)).toBe("new");
		expect(conditionGrade(80)).toBe("good");
		expect(conditionGrade(60)).toBe("worn");
		expect(conditionGrade(35)).toBe("battered");
		expect(blendCondition(10, 100, 10, 50)).toBe(75);
		expect(blendCondition(0, 0, 0, 0)).toBe(100);
	});
});

describe("guide price", () => {
	it("rises with demand and falls with supply, within limits", () => {
		expect(demandFactor(0, 0)).toBe(1);
		expect(demandFactor(500, 10)).toBeGreaterThan(1);
		expect(demandFactor(10, 500)).toBeLessThan(1);
		expect(demandFactor(1e9, 0)).toBe(ARMAMENTS.GUIDE_MAX_FACTOR);
		expect(demandFactor(0, 1e9)).toBe(ARMAMENTS.GUIDE_MIN_FACTOR);
	});

	it("discounts second-hand hardware and bands offers around it", () => {
		expect(guidePrice("rifles", 0, 0)).toBe(100);
		expect(guidePrice("rifles", 0, 0, 50)).toBe(70);
		expect(guidePrice("ammunition", 0, 1e9, 0)).toBeGreaterThanOrEqual(1);
		expect(priceBand(100)).toEqual({ min: 25, max: 400 });
		expect(priceBand(1).min).toBe(1);
	});
});

describe("routes and delivery", () => {
	const fr = { stateId: 1, blocId: 10 };
	const sy = { stateId: 2, blocId: 20 };
	const ally = { stateId: 3, blocId: 10 };
	const neutral = { stateId: 4, blocId: null };

	it("tells domestic, bloc and foreign trade apart", () => {
		expect(armsRoute(fr, fr)).toBe("domestic");
		expect(armsRoute(fr, ally)).toBe("bloc");
		expect(armsRoute(fr, sy)).toBe("foreign");
		expect(armsRoute(neutral, { stateId: 5, blocId: null })).toBe("foreign");
		expect(armsRoute(fr, { stateId: null, blocId: null })).toBe("foreign");
	});

	it("ships further and bigger orders more slowly", () => {
		expect(deliveryHours("domestic", 1)).toBe(ARMAMENTS.DELIVERY_HOURS.domestic);
		expect(deliveryHours("foreign", 1)).toBeGreaterThan(deliveryHours("bloc", 1));
		expect(deliveryHours("bloc", 1000)).toBe(ARMAMENTS.DELIVERY_HOURS.bloc + 3);
	});

	it("levies only foreign sales", () => {
		expect(levyPercent("foreign")).toBe(ARMAMENTS.EXPORT_TAX_PERCENT);
		expect(levyPercent("bloc")).toBe(0);
		expect(levyPercent("domestic")).toBe(0);
	});
});
