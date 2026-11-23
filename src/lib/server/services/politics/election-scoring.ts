// Election scoring: turns the world's current mood into effective votes.
// Read-only and free of SvelteKit virtual imports so it can be unit tested.
import { and, eq, gte, inArray } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import {
	companies,
	electionVotes,
	partyMembers,
	politicalParties,
	presidents,
	regions,
	residences,
	stateEffects,
	userWallets
} from "#lib/server/schema.js";
import {
	 ideologyLean,
	 partyAppeal,
	 tallyElectionVotes,
	 type IdeologyLean,
	 type OligarchVote,
	 type PartyAppealFactors
} from "#lib/config/index.js";
import { regionOpinion } from "./civic.service.js";

export interface ElectionInput {
	electionId: number;
	stateId: number;
	now?: Date;
}

/** Who can be counted as part of the state's electorate. */
async function residentUserIds(db: Database, stateId: number): Promise<string[]> {
	const rows = await db
		.select({ userId: residences.userId })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId));
	return [...new Set(rows.map((r) => r.userId))];
}

/** Effective vote tally: half cast ballots, half oligarch weight. */
export async function effectiveVotesByParty(db: Database, input: ElectionInput): Promise<Record<number, number>> {
	const now = input.now ?? new Date();
	const parties = await db.select().from(politicalParties).where(eq(politicalParties.stateId, input.stateId));
	if (!parties.length) return {};

	const voters = await residentUserIds(db, input.stateId);
	const votes = await db.select().from(electionVotes).where(eq(electionVotes.electionId, input.electionId));
	const citizenVotesByParty: Record<number, number> = {};
	for (const vote of votes) citizenVotesByParty[vote.partyId] = (citizenVotesByParty[vote.partyId] ?? 0) + 1;
	const partyIds = parties.map((p) => p.id);

	// Public mood: mean civic opinion across the state's regions.
	const stateRegions = await db.select({ id: regions.id, economy: regions.economy }).from(regions).where(eq(regions.stateId, input.stateId));
	const opinions = stateRegions.length ? await Promise.all(stateRegions.map((r) => regionOpinion(db, r.id, now))) : [50];
	const reputation = opinions.length ? opinions.reduce((a, b) => a + b, 0) / opinions.length : 50;
	const economy = stateRegions.length
		? stateRegions.reduce((sum, r) => sum + Math.max(0, Math.min(100, (r.economy ?? 0) * 10)), 0) / stateRegions.length
		: 50;

	// Propaganda for and against the state's current order.
	const effects = await db
		.select({ kind: stateEffects.kind, magnitude: stateEffects.magnitude })
		.from(stateEffects)
		.where(and(eq(stateEffects.stateId, input.stateId), gte(stateEffects.expiresAt, now)));
	const propagandaFor = effects.filter((e) => e.kind === "morale_boost").reduce((s, e) => s + e.magnitude, 0);
	const propagandaAgainst = effects.filter((e) => e.kind === "morale_shaken").reduce((s, e) => s + e.magnitude, 0);

	// President and party goodwill: the leader's own reputation plus their party standing.
	const [president] = await db.select().from(presidents).where(eq(presidents.stateId, input.stateId));
	let presidentApproval: number | null = null;
	if (president) {
		const residence = await db.select({ regionId: residences.regionId }).from(residences).where(eq(residences.userId, president.userId)).limit(1);
		if (residence[0]) presidentApproval = await regionOpinion(db, residence[0].regionId, now);
	}
	const membership = await db
		.select({ partyId: partyMembers.partyId, userId: partyMembers.userId, role: partyMembers.role })
		.from(partyMembers)
		.where(inArray(partyMembers.partyId, partyIds));
	const memberCountByParty = new Map<number, number>();
	for (const row of membership) memberCountByParty.set(row.partyId, (memberCountByParty.get(row.partyId) ?? 0) + 1);
	const maxMembers = Math.max(1, ...memberCountByParty.values());

	// The dominant political orientation of the electorate follows the largest party.
	const largestParty = [...parties].sort((a, b) => (memberCountByParty.get(b.id) ?? 0) - (memberCountByParty.get(a.id) ?? 0))[0];
	const orientation: IdeologyLean = ideologyLean(largestParty?.ideology ?? "centrist");

	const appealByParty = new Map<number, number>();
	for (const party of parties) {
		const goodwill = ((memberCountByParty.get(party.id) ?? 0) / maxMembers) * 100;
		const factors: PartyAppealFactors = {
			ideology: party.ideology,
			orientation,
			reputation,
			presidentApproval: membership.some((m) => m.partyId === party.id && m.role === "leader") ? presidentApproval : null,
			economy,
			goodwill,
			presidentGoodwill: goodwill,
			propagandaFor,
			propagandaAgainst
		};
		appealByParty.set(party.id, partyAppeal(factors));
	}

	// Oligarchs: residents with money or companies. Their wealth sets their weight,
	// their party membership sets their loyalty.
	const wallets = voters.length ? await db.select({ userId: userWallets.userId, balance: userWallets.balance }).from(userWallets).where(inArray(userWallets.userId, voters)) : [];
	const ownedCompanies = voters.length ? await db.select({ userId: companies.ownerId }).from(companies).where(inArray(companies.ownerId, voters)) : [];
	const companyCount = new Map<string, number>();
	for (const c of ownedCompanies) companyCount.set(c.userId, (companyCount.get(c.userId) ?? 0) + 1);
	const partyByUser = new Map<string, number>();
	for (const m of membership) if (!partyByUser.has(m.userId)) partyByUser.set(m.userId, m.partyId);

	const oligarchs: OligarchVote[] = voters.map((userId) => {
		const balance = wallets.find((w) => w.userId === userId)?.balance ?? 0;
		const weight = 1 + Math.log10(balance + 10) + (companyCount.get(userId) ?? 0) * 0.5;
		return { userId, partyId: partyByUser.get(userId) ?? null, weight };
	});

	return tallyElectionVotes({ citizenVotesByParty, oligarchs, appealByParty, partyIds });
}
