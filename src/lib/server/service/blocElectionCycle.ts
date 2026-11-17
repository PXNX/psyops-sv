// src/lib/server/service/blocElectionCycle.ts
// When the next bloc leader election runs.
//
// Bloc leaders are elected by member-state presidents every 30-day cycle;
// nominations and voting happen in the cycle's final 2 days. A bloc without
// a leader doesn't wait out a whole cycle: its election opens right away.

export const BLOC_CYCLE_DAYS = 30;
export const BLOC_VOTING_WINDOW_DAYS = 2;

const DAY = 24 * 60 * 60 * 1000;

export interface CycleWindow {
	cycleStartsAt: Date;
	votingStartsAt: Date;
	votingEndsAt: Date;
	status: "scheduled" | "active";
}

export function nextCycleWindow(from: Date, hasLeader: boolean): CycleWindow {
	if (!hasLeader) {
		return {
			cycleStartsAt: from,
			votingStartsAt: from,
			votingEndsAt: new Date(from.getTime() + BLOC_VOTING_WINDOW_DAYS * DAY),
			status: "active"
		};
	}
	return {
		cycleStartsAt: from,
		votingStartsAt: new Date(from.getTime() + (BLOC_CYCLE_DAYS - BLOC_VOTING_WINDOW_DAYS) * DAY),
		votingEndsAt: new Date(from.getTime() + BLOC_CYCLE_DAYS * DAY),
		status: "scheduled"
	};
}
