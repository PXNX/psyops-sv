// src/lib/server/service/voterEligibility.ts
// Who may vote in a state election: residents of the state (their home
// region lies in it) who became residents at least a day before voting
// closes, so nobody can move in at the last minute just to vote.
// (Pure: the database lookup lives in residency.ts so this stays testable.)

const pad = (n: number) => String(n).padStart(2, "0");
/** Same format as formatDateTime: dd.mm.yyyy, hh:mm. */
const formatDateTime = (d: Date) =>
	`${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const RESIDENCY_BEFORE_CLOSE_MS = 24 * 60 * 60 * 1000;

export interface Residency {
	/** State the voter's home region belongs to (null: independent region). */
	stateId: number | null;
	/** When the voter's home region last changed. */
	since: Date;
}

export interface Eligibility {
	eligible: boolean;
	/** Shown to the voter when not eligible. */
	reason: string | null;
}

export function voterEligibility(
	residency: Residency | null,
	stateId: number,
	stateName: string,
	electionEnds: Date
): Eligibility {
	if (!residency || residency.stateId !== stateId) {
		return { eligible: false, reason: `You must be a resident of ${stateName} to vote.` };
	}
	const cutoff = new Date(electionEnds.getTime() - RESIDENCY_BEFORE_CLOSE_MS);
	if (residency.since > cutoff) {
		return {
			eligible: false,
			reason: `Only people who were residents of ${stateName} by ${formatDateTime(cutoff)} (a day before voting closes) can vote. You became a resident on ${formatDateTime(residency.since)}.`
		};
	}
	return { eligible: true, reason: null };
}
