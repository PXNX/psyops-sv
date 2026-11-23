import { describe, expect, it } from "@rstest/core";
import {
	ELECTION,
	ideologyAffinity,
	ideologyLean,
	partyAppeal,
	tallyElectionVotes,
	type PartyAppealFactors
} from "../election.config.js";

const factors = (overrides: Partial<PartyAppealFactors> = {}): PartyAppealFactors => ({
	ideology: "centrist",
	orientation: "centrist",
	reputation: 50,
	presidentApproval: null,
	economy: 50,
	goodwill: 50,
	presidentGoodwill: 50,
	propagandaFor: 0,
	propagandaAgainst: 0,
	...overrides
});

describe("election appeal", () => {
	it("maps party labels to orientations", () => {
		expect(ideologyLean("Social Democrat")).toBe("left");
		expect(ideologyLean("green")).toBe("green");
		expect(ideologyLean(null)).toBe("other");
		expect(ideologyAffinity("left", "left")).toBe(1);
		expect(ideologyAffinity("left", "right")).toBe(-1);
	});

	it("moves appeal in the right direction for each factor", () => {
		const base = partyAppeal(factors());
		expect(partyAppeal(factors({ reputation: 90 }))).toBeGreaterThan(base);
		expect(partyAppeal(factors({ presidentApproval: 90 }))).toBeGreaterThan(base);
		expect(partyAppeal(factors({ economy: 90 }))).toBeGreaterThan(base);
		expect(partyAppeal(factors({ goodwill: 90 }))).toBeGreaterThan(base);
		expect(partyAppeal(factors({ propagandaFor: 10 }))).toBeGreaterThan(base);
		expect(partyAppeal(factors({ propagandaAgainst: 10 }))).toBeLessThan(base);
		expect(
			partyAppeal(factors({ ideology: "liberal", orientation: "left" }))
		).toBeGreaterThan(partyAppeal(factors({ ideology: "liberal", orientation: "right" })));
	});

	it("splits the effective vote 50/50 between citizens and oligarchs", () => {
		const result = tallyElectionVotes({
			citizenVotesByParty: { 1: 60, 2: 40 },
			oligarchs: [
				{ userId: "a", partyId: 1, weight: 4 },
				{ userId: "b", partyId: 2, weight: 1 }
			],
			appealByParty: new Map([[1, 80], [2, 40]]),
			partyIds: [1, 2]
		});
		const citizenTotal = 100;
		const oligarchTotal = Object.values(result).reduce((a, b) => a + b, 0) - citizenTotal;
		expect(oligarchTotal).toBeCloseTo(citizenTotal * ELECTION.OLIGARCH_SHARE / (1 - ELECTION.OLIGARCH_SHARE), 5);
		expect(result[1]).toBeGreaterThan(result[2]);
	});
});
