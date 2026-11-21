// The NATO DTG format is the single absolute timestamp used across the app.
// These tests pin it down so a locale or timezone change can't silently
// turn "12 NOV 2026, 13:44" back into a local 12-hour string.
import { describe, expect, it } from "@rstest/core";
import { dtg, dtgCompact, dtgDate, dtgDayKey, dtgDaysAgo, dtgTime } from "./dtg";

const at = "2026-11-12T13:44:00.000Z";

describe("NATO DTG", () => {
	it("formats the full group in UTC", () => {
		expect(dtg(at)).toBe("12 NOV 2026, 13:44");
		expect(dtg(new Date(at))).toBe("12 NOV 2026, 13:44");
	});

	it("formats dates and times separately", () => {
		expect(dtgDate(at)).toBe("12 NOV 2026");
		expect(dtgTime(at)).toBe("13:44");
	});

	it("keeps the compact group for tight sensor overlays", () => {
		expect(dtgCompact(at)).toBe("121344Z NOV 26");
	});

	it("groups days by UTC calendar date", () => {
		expect(dtgDayKey(at)).toBe("2026-11-12");
		expect(dtgDaysAgo(at, new Date("2026-11-14T01:00:00Z"))).toBe(2);
	});

	it("uses 24-hour midnight and single-digit days", () => {
		expect(dtg("2026-01-03T00:05:00Z")).toBe("03 JAN 2026, 00:05");
		expect(dtgTime("2026-01-03T23:59:00Z")).toBe("23:59");
	});
});
