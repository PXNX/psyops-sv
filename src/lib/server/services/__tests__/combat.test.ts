import { describe, expect, it } from "@rstest/core";
import { selectEngagedUnits } from "../military/combat";

// Shaped like battle_participants rows loaded `with: { unit: true }`:
// the unit type lives on the nested unit, not on the participant.
const participant = (
	id: number,
	unitType: "infantry" | "armor" | "artillery",
	joinedAt: string,
	currentStrength = 100
) => ({
	id,
	currentStrength,
	joinedAt: new Date(joinedAt),
	unit: { unitType }
});

describe("selectEngagedUnits", () => {
	it("reads the unit type from the nested unit (regression: crashed every combat round)", () => {
		const engaged = selectEngagedUnits([participant(1, "infantry", "2026-01-01")], 10);
		expect(engaged.map((p) => p.id)).toEqual([1]);
	});

	it("fills combat width with the earliest-joined units first", () => {
		const units = [
			participant(1, "armor", "2026-01-03"), // width 4
			participant(2, "infantry", "2026-01-01"), // width 2
			participant(3, "artillery", "2026-01-02") // width 3
		];
		// width 6: infantry (2) + artillery (3) = 5; armor (4) no longer fits
		expect(selectEngagedUnits(units, 6).map((p) => p.id)).toEqual([2, 3]);
	});

	it("skips destroyed units", () => {
		const units = [participant(1, "infantry", "2026-01-01", 0), participant(2, "infantry", "2026-01-02")];
		expect(selectEngagedUnits(units, 10).map((p) => p.id)).toEqual([2]);
	});

	it("returns nothing when no unit fits", () => {
		expect(selectEngagedUnits([participant(1, "armor", "2026-01-01")], 3)).toEqual([]);
	});
});
