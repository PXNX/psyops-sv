// Pure intel maths: how fresh UAV spotting feeds artillery, and why satellites
// (however sharp their imagery) don't call in fire.
import { describe, expect, it } from "@rstest/core";
import { sideModifiers, uavCoverage, type IntelPicture } from "../military/intel";

const picture = (sensors: Partial<IntelPicture["sensors"][number]>[]): IntelPicture =>
	({
		confidence: 0.5,
		sensors: sensors.map((s, i) => ({
			reportId: i + 1,
			sensor: "drone_eo",
			outcome: "ok",
			observedAt: new Date().toISOString(),
			weight: 1,
			confidence: 0.5,
			...s
		}))
	}) as IntelPicture;

describe("UAV spotting", () => {
	it("uses the freshest useful drone pass, not satellites or blind passes", () => {
		expect(uavCoverage(null)).toBe(0);
		expect(
			uavCoverage(
				picture([
					{ sensor: "sat_sar", weight: 1 },
					{ sensor: "drone_ir", outcome: "intercepted", weight: 1 },
					{ sensor: "drone_ir", weight: 0.6 },
					{ sensor: "drone_eo", weight: 0.9 }
				])
			)
		).toBe(0.9);
	});

	it("boosts indirect fire only near the front", () => {
		const base = sideModifiers({ picture: picture([]), ownArtilleryEngaged: false, enemyAirDefenceUnits: 0 });
		const near = sideModifiers({
			picture: picture([]),
			ownArtilleryEngaged: false,
			enemyAirDefenceUnits: 0,
			uavCoverage: 1,
			nearFront: true
		});
		const deep = sideModifiers({
			picture: picture([]),
			ownArtilleryEngaged: false,
			enemyAirDefenceUnits: 0,
			uavCoverage: 1,
			nearFront: false
		});
		expect(near.indirect).toBeGreaterThan(base.indirect);
		expect(deep.indirect).toBe(base.indirect);
		// Aerial fire is unaffected: the bonus is strictly for the guns.
		expect(near.general).toBe(base.general);
	});
});
