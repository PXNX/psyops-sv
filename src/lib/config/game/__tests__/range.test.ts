import { describe, expect, it } from "@rstest/core";
import { AIRCRAFT } from "../aircraft.config";
import { SHIP_CLASSES } from "../fleet.config";
import { BUILDING_TEMPLATES } from "../buildings.config";
import { airReach, nearestAirbase, shipEnduranceHexes, shipMoveReach, shipReachHexes } from "../range.config";

describe("air reach", () => {
	const base = { q: 10, r: 10 };

	it("reaches targets within the type's range of the airbase", () => {
		const range = AIRCRAFT.fighterjet.rangeHexes;
		const verdict = airReach("fighterjet", base, { q: 10 + range, r: 10 });
		expect(verdict.ok).toBe(true);
		expect(verdict.distance).toBe(range);
	});

	it("refuses targets beyond the range with a reason", () => {
		const range = AIRCRAFT.close_air_support.rangeHexes;
		const verdict = airReach("close_air_support", base, { q: 10 + range + 1, r: 10 });
		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toContain("Out of range");
	});

	it("bombers reach further than close air support", () => {
		const target = { q: 10 + AIRCRAFT.bomber.rangeHexes, r: 10 };
		expect(airReach("bomber", base, target).ok).toBe(true);
		expect(airReach("close_air_support", base, target).ok).toBe(false);
	});

	it("needs an airbase to fly from", () => {
		const verdict = airReach("bomber", null, base);
		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toContain("airbase");
	});

	it("rejects non-aircraft", () => {
		expect(airReach("infantry", base, base).ok).toBe(false);
	});

	it("picks the nearest airbase", () => {
		const bases = [
			{ regionId: 1, hex: { q: 0, r: 0 } },
			{ regionId: 2, hex: { q: 9, r: 11 } }
		];
		expect(nearestAirbase(base, bases)?.regionId).toBe(2);
		expect(nearestAirbase(base, [])).toBeNull();
	});
});

describe("ship reach", () => {
	const frigate = SHIP_CLASSES.frigate;

	it("is the fuel aboard divided by the burn per hex", () => {
		expect(shipReachHexes(frigate, frigate.fuelPerHex * 4 + 1)).toBe(4);
		expect(shipReachHexes(frigate, 0)).toBe(0);
		expect(shipEnduranceHexes(frigate)).toBe(Math.floor(frigate.fuelCapacity / frigate.fuelPerHex));
	});

	it("refuses routes longer than the fuel allows", () => {
		const fuel = frigate.fuelPerHex * 3;
		expect(shipMoveReach(frigate, fuel, 3).ok).toBe(true);
		const verdict = shipMoveReach(frigate, fuel, 4);
		expect(verdict.ok).toBe(false);
		expect(verdict.reason).toContain("Refuel");
	});
});

describe("airbase building", () => {
	it("is a single-level region building", () => {
		expect(BUILDING_TEMPLATES.airbase.stat).toBe("airbase");
		expect(BUILDING_TEMPLATES.airbase.maxLevel).toBe(1);
		expect(BUILDING_TEMPLATES.airbase.lawOnly).toBe(true);
	});
});
