import { describe, expect, it } from "@rstest/core";
import { BUILDING_TEMPLATES, GOVERNOR_BUILDINGS, VALID_BUILDING_TYPES, isGovernorBuilding } from "../buildings.config";

describe("GOVERNOR_BUILDINGS", () => {
	it("lets a governor build the civilian works", () => {
		for (const type of ["infrastructure", "school", "hospital", "power_plant", "grid", "radio_mast"] as const) {
			expect(isGovernorBuilding(type)).toBe(true);
		}
	});

	it("keeps defences, the airbase and datacenters with the state", () => {
		for (const type of ["fortifications", "radar", "airbase", "datacenter"] as const) {
			expect(isGovernorBuilding(type)).toBe(false);
		}
	});

	it("never includes a law-only building or one that needs finished products", () => {
		for (const type of GOVERNOR_BUILDINGS) {
			expect(VALID_BUILDING_TYPES).toContain(type);
			expect(BUILDING_TEMPLATES[type].lawOnly).toBeFalsy();
			expect(BUILDING_TEMPLATES[type].costs.hardware).toBeUndefined();
		}
	});
});
