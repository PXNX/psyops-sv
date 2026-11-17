import { describe, expect, it } from "@rstest/core";
import { BLOC_CYCLE_DAYS, BLOC_VOTING_WINDOW_DAYS, nextCycleWindow } from "../blocElectionCycle";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-17T15:00:00Z");

describe("nextCycleWindow", () => {
	it("opens voting immediately for a bloc without a leader", () => {
		const w = nextCycleWindow(now, false);
		expect(w.status).toBe("active");
		expect(w.votingStartsAt).toEqual(now);
		expect(w.votingEndsAt.getTime() - now.getTime()).toBe(BLOC_VOTING_WINDOW_DAYS * DAY);
	});

	it("schedules voting for the last days of a full cycle when the bloc has a leader", () => {
		const w = nextCycleWindow(now, true);
		expect(w.status).toBe("scheduled");
		expect(w.votingEndsAt.getTime() - now.getTime()).toBe(BLOC_CYCLE_DAYS * DAY);
		expect(w.votingEndsAt.getTime() - w.votingStartsAt.getTime()).toBe(BLOC_VOTING_WINDOW_DAYS * DAY);
	});
});
