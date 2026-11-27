// Election appeal: how the people and the wealthy decide who gets the seats.
// Half the effective vote comes from cast ballots, half from the oligarchs who
// back parties with money and goodwill. Pure functions only; no DB access.

export const ELECTION = {
	OLIGARCH_SHARE: 0.5,
	BASE_APPEAL: 50,
	REPUTATION_WEIGHT: 0.35,
	PRESIDENT_WEIGHT: 0.2,
	ECONOMY_WEIGHT: 0.2,
	GOODWILL_WEIGHT: 0.15,
	/** Extra appeal when the party's president is well regarded. */
	PRESIDENT_GOODWILL_WEIGHT: 0.1,
	IDEOLOGY_WEIGHT: 6,
	PROPAGANDA_FOR_PER_POINT: 0.4,
	PROPAGANDA_FOR_CAP: 8,
	PROPAGANDA_AGAINST_PER_POINT: -0.35,
	PROPAGANDA_AGAINST_CAP: -12,
	MIN_APPEAL: 1,
	MAX_APPEAL: 100
} as const;

export type IdeologyLean = "left" | "right" | "green" | "libertarian" | "centrist" | "other";

const LEAN: Record<string, IdeologyLean> = {
	liberal: "left",
	socialist: "left",
	"social democrat": "left",
	progressive: "left",
	green: "green",
	conservative: "right",
	nationalist: "right",
	libertarian: "libertarian",
	centrist: "centrist",
	other: "other"
};

export function ideologyLean(ideology: string | null | undefined): IdeologyLean {
	const key = (ideology ?? "").trim().toLowerCase();
	return LEAN[key] ?? "other";
}

/** -1 (opposites) to 1 (same). "Other" is neutral. */
export function ideologyAffinity(a: IdeologyLean, b: IdeologyLean): number {
	if (a === "other" || b === "other") return 0;
	if (a === b) return 1;
	if ((a === "left" && b === "centrist") || (a === "centrist" && b === "left")) return 0.5;
	if ((a === "right" && b === "centrist") || (a === "centrist" && b === "right")) return 0.5;
	if ((a === "left" && b === "right") || (a === "right" && b === "left")) return -1;
	if ((a === "green" && b === "left") || (a === "left" && b === "green")) return 0.6;
	if ((a === "libertarian" && b === "right") || (a === "right" && b === "libertarian")) return 0.6;
	return -0.3;
}

export interface PartyAppealFactors {
	ideology: string | null;
	orientation: IdeologyLean;
	/** Public goodwill toward the state, 0-100. */
	reputation: number;
	/** How well the people regard the party's president, 0-100, or null if none. */
	presidentApproval: number | null;
	/** Current economic mood, 0-100. */
	economy: number;
	/** Goodwill earned with the party and its president, 0-100. */
	goodwill: number;
	/** Goodwill specifically toward the party's president, 0-100. */
	presidentGoodwill: number;
	propagandaFor: number;
	propagandaAgainst: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const centered = (value: number) => clamp(value, 0, 100) - 50;

/** A party's appeal to the electorate, 0-100. */
export function partyAppeal(f: PartyAppealFactors): number {
	const propagandaFor = clamp(f.propagandaFor * ELECTION.PROPAGANDA_FOR_PER_POINT, 0, ELECTION.PROPAGANDA_FOR_CAP);
	const propagandaAgainst = clamp(
		f.propagandaAgainst * ELECTION.PROPAGANDA_AGAINST_PER_POINT,
		ELECTION.PROPAGANDA_AGAINST_CAP,
		0
	);
	const president =
		f.presidentApproval == null
			? 0
			: centered(f.presidentApproval) * ELECTION.PRESIDENT_WEIGHT +
				centered(f.presidentGoodwill) * ELECTION.PRESIDENT_GOODWILL_WEIGHT;
	return clamp(
		ELECTION.BASE_APPEAL +
			centered(f.reputation) * ELECTION.REPUTATION_WEIGHT +
			president +
			centered(f.economy) * ELECTION.ECONOMY_WEIGHT +
			centered(f.goodwill) * ELECTION.GOODWILL_WEIGHT +
			ideologyAffinity(ideologyLean(f.ideology), f.orientation) * ELECTION.IDEOLOGY_WEIGHT +
			propagandaFor +
			propagandaAgainst,
		ELECTION.MIN_APPEAL,
		ELECTION.MAX_APPEAL
	);
}

export interface OligarchVote {
	userId: string;
	partyId: number | null;
	/** Relative financial weight, 1 or greater. */
	weight: number;
}

/**
 * The weighted tally is fractional, but stored votes are integers. Round once
 * before allocating seats and inserting results so no float ever reaches the
 * database (e.g. 3.999999999999999 into an integer column).
 */
export function wholeVotesByParty(votes: Record<number, number>): Record<number, number> {
	return Object.fromEntries(
		Object.entries(votes).map(([partyId, count]) => [Number(partyId), Math.max(0, Math.round(count))])
	);
}

export function tallyElectionVotes(input: {
	citizenVotesByParty: Record<number, number>;
	oligarchs: OligarchVote[];
	appealByParty: Map<number, number>;
	partyIds: number[];
}): Record<number, number> {
	const result: Record<number, number> = {};
	for (const partyId of input.partyIds) result[partyId] = input.citizenVotesByParty[partyId] ?? 0;
	const citizenTotal = Object.values(input.citizenVotesByParty).reduce((a, b) => a + b, 0);
	const oligarchTotal =
		citizenTotal > 0
			? (citizenTotal / (1 - ELECTION.OLIGARCH_SHARE)) * ELECTION.OLIGARCH_SHARE
			: input.oligarchs.length;

	if (!input.oligarchs.length || !input.partyIds.length) return result;

	const weights = input.partyIds.map((partyId) => {
		const appeal = Math.max(1, input.appealByParty.get(partyId) ?? ELECTION.BASE_APPEAL);
		return { partyId, appeal };
	});
	const totalWeight = input.oligarchs.reduce((sum, o) => sum + Math.max(1, o.weight), 0);

	for (const oligarch of input.oligarchs) {
		const share = (Math.max(1, oligarch.weight) / totalWeight) * oligarchTotal;
		const loyalty = (partyId: number) => (oligarch.partyId === partyId ? 4 : 1);
		const weighted = weights.map((w) => ({ ...w, value: w.appeal * loyalty(w.partyId) }));
		const weightedTotal = weighted.reduce((sum, w) => sum + w.value, 0) || 1;
		for (const w of weighted) {
			result[w.partyId] = (result[w.partyId] ?? 0) + share * (w.value / weightedTotal);
		}
	}
	return result;
}
