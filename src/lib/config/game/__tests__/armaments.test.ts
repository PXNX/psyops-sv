// Armaments market rules: which goods count and their reference values.
import { describe, expect, it } from "@rstest/core";
import { ARMAMENTS, ARMAMENT_GOODS, armamentValue, isArmament } from "../armaments.config";

describe("armaments", () => {
	it("recognises only military hardware", () => {
		expect(isArmament("rifles")).toBe(true);
		expect(isArmament("artillery")).toBe(true);
		expect(isArmament("iron")).toBe(false);
		expect(ARMAMENT_GOODS).toHaveLength(5);
	});

	it("prices hardware from the shared good values", () => {
		expect(armamentValue("vehicles")).toBeGreaterThan(armamentValue("ammunition"));
		expect(armamentValue("unknown")).toBeGreaterThan(0);
		expect(ARMAMENTS.EXPORT_TAX_PERCENT).toBe(5);
	});
});
