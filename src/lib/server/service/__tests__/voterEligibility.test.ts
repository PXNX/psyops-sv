import { describe, expect, it } from "@rstest/core";
import { voterEligibility } from "../voterEligibility";

const ends = new Date("2026-11-20T18:00:00Z");
const hours = (h: number) => new Date(ends.getTime() - h * 60 * 60 * 1000);

describe("voterEligibility", () => {
	it("lets long-standing residents vote", () => {
		expect(voterEligibility({ stateId: 2, since: hours(24 * 30) }, 2, "Sardinia", ends).eligible).toBe(true);
	});

	it("allows residents of exactly one day before voting closes", () => {
		expect(voterEligibility({ stateId: 2, since: hours(24) }, 2, "Sardinia", ends).eligible).toBe(true);
	});

	it("refuses people who became residents less than a day before voting closes", () => {
		const r = voterEligibility({ stateId: 2, since: hours(23) }, 2, "Sardinia", ends);
		expect(r.eligible).toBe(false);
		expect(r.reason).toContain("a day before voting closes");
	});

	it("refuses residents of another state and people without a residence", () => {
		expect(voterEligibility({ stateId: 3, since: hours(24 * 30) }, 2, "Sardinia", ends).eligible).toBe(false);
		expect(voterEligibility(null, 2, "Sardinia", ends).reason).toBe("You must be a resident of Sardinia to vote.");
	});
});
