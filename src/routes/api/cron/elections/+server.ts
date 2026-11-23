// src/routes/(authenticated)/api/cron/elections/+server.ts

import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import {
	parliamentaryElections,
	electionVotes,
	electionResults,
	parliamentMembers,
	politicalParties,
	partyMembers,
	presidents,
	residences,
	regions,
	states
} from "#lib/server/schema.js";
import { eq, and, lte } from "drizzle-orm";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";
import { runAutomaticDividends } from "#lib/server/services/economy/dividends.js";
import { reachFirstTime } from "#lib/server/services/politics/first-time.js";
import { effectiveVotesByParty } from "#lib/server/services/politics/election-scoring.js";
import { isMartialLaw } from "#lib/server/services/politics/martial-law.js";
import { dtg } from "#lib/utils/dtg.js";
import { REAL_DAY_MS } from "#lib/utils/game-time.js";

// Give the serverless function enough time to process every state's election in
// a single run. Without this, Vercel terminates the function at the default
// timeout before it can return the success response, and the schedule reports
// a timeout instead of receiving `{ success: true }`.
export const config = {
	maxDuration: 60
};

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let processed = 0;
		let activated = 0;
		let scheduled = 0;
		let suspended = 0;

		// A declaration is self-expiring: the timestamp alone says whether
		// elections are paused, so no cron has to switch a flag back off.
		const stateRows = await db
			.select({ id: states.id, martialLawUntil: states.martialLawUntil })
			.from(states);
		const martialUntil = new Map(stateRows.map((s) => [s.id, s.martialLawUntil]));

		// 1. Update scheduled elections to active
		const scheduledElections = await db
			.select()
			.from(parliamentaryElections)
			.where(and(eq(parliamentaryElections.status, "scheduled"), lte(parliamentaryElections.startDate, now)));

		for (const election of scheduledElections) {
			if (isMartialLaw(martialUntil.get(election.stateId), now)) {
				suspended++;
				continue;
			}
			await db
				.update(parliamentaryElections)
				.set({ status: "active" })
				.where(eq(parliamentaryElections.id, election.id));
			activated++;
			console.log(`✅ Activated election ${election.id} for state ${election.stateId}`);

			notifyStateCitizens(
				election.stateId,
				{
					title: "🗳️ Election Started!",
					body: "A parliamentary election has begun in your state. Cast your vote!",
					icon: "/favicon.png",
					badge: "/badge.png",
					data: { url: `/state/${election.stateId}`, tag: `election-${election.id}` }
				},
				"notifyElections"
			).catch((err) => console.error("Election notification error:", err));
		}

		// 2. Process finished elections
		const finishedElections = await db
			.select()
			.from(parliamentaryElections)
			.where(and(eq(parliamentaryElections.status, "active"), lte(parliamentaryElections.endDate, now)));

		for (const election of finishedElections) {
			// Defer the count-out until martial law lifts; the next hourly tick
			// picks it up, so a missed run cannot extend the suspension.
			if (isMartialLaw(martialUntil.get(election.stateId), now)) {
				suspended++;
				continue;
			}
			await processElectionResults(election);
			processed++;

			// 3. Schedule next election (1 week from now, never inside martial law)
			const nextElectionStart = new Date(now);
			nextElectionStart.setDate(nextElectionStart.getDate() + 7);
			const until = martialUntil.get(election.stateId);
			if (until && isMartialLaw(until, nextElectionStart)) {
				nextElectionStart.setTime(until.getTime() + REAL_DAY_MS);
			}

			const nextElectionEnd = new Date(nextElectionStart);
			nextElectionEnd.setDate(nextElectionEnd.getDate() + 3);

			await db.insert(parliamentaryElections).values({
				stateId: election.stateId,
				startDate: nextElectionStart,
				endDate: nextElectionEnd,
				status: "scheduled",
				totalSeats: election.totalSeats,
				isInaugural: false
			});

			scheduled++;
			console.log(`📅 Scheduled next election for state ${election.stateId} - starts ${dtg(nextElectionStart)}`);
		}

		// Automatic dividend policies piggyback on this hourly schedule (each
		// company still pays at most once per dividend cooldown).
		const dividends = await runAutomaticDividends(db, { now });

		return cronResponse(
			"elections",
			{
				electionsActivated: activated,
				electionsProcessed: processed,
				electionsScheduled: scheduled,
				electionsSuspended: suspended,
				dividendsPaid: dividends.paid.length,
				dividendsSkipped: dividends.skipped
			},
			dividends.failures
		);
	} catch (error) {
		return cronCrash("elections", error);
	}
};

async function processElectionResults(election: any) {
	console.log(`Processing election ${election.id} for state ${election.stateId}`);

	// Check if already processed
	const existingResults = await db
		.select()
		.from(electionResults)
		.where(eq(electionResults.electionId, election.id))
		.limit(1);

	if (existingResults.length > 0) {
		console.log(`Election ${election.id} already processed, skipping`);
		return;
	}

	const votes = await db.select().from(electionVotes).where(eq(electionVotes.electionId, election.id));
	const parties = await db.select().from(politicalParties).where(eq(politicalParties.stateId, election.stateId));

	// Half the vote is cast by citizens, half is weighted by the oligarchs who
	// fund parties. Reputation, the president, ideology, the economy and
	// propaganda all move the oligarch half.
	const votesByParty = await effectiveVotesByParty(db, {
		electionId: election.id,
		stateId: election.stateId
	});
	const totalVotes = Object.values(votesByParty).reduce((a, b) => a + b, 0);


	if (parties.length === 0) {
		console.warn(`No parties found for state ${election.stateId}`);
		await db
			.update(parliamentaryElections)
			.set({ status: "completed" })
			.where(eq(parliamentaryElections.id, election.id));
		return;
	}

	// HANDLE ZERO VOTES CASE
	if (totalVotes === 0) {
		console.warn(`No votes cast in election ${election.id}, using equal distribution`);

		const partiesWithMembers = await Promise.all(
			parties.map(async (party) => {
				const members = await db.select().from(partyMembers).where(eq(partyMembers.partyId, party.id));
				return {
					...party,
					memberCount: members.length,
					members: members
				};
			})
		);

		const sortedParties = partiesWithMembers.sort((a, b) => {
			if (b.memberCount !== a.memberCount) {
				return b.memberCount - a.memberCount;
			}
			return new Date(a.foundedAt).getTime() - new Date(b.foundedAt).getTime();
		});

		const seatsPerParty = Math.floor(election.totalSeats / parties.length);
		const remainderSeats = election.totalSeats % parties.length;

		const partyResults: Array<{
			partyId: number;
			partyName: string;
			votes: number;
			percentage: number;
			seats: number;
		}> = [];

		for (let i = 0; i < parties.length; i++) {
			const party = parties[i];
			const seats = seatsPerParty + (i < remainderSeats ? 1 : 0);

			partyResults.push({
				partyId: party.id,
				partyName: party.name,
				votes: 0,
				percentage: 0,
				seats: seats
			});
		}

		if (partyResults.length > 0) {
			await db.insert(electionResults).values(
				partyResults.map((result) => ({
					electionId: election.id,
					partyId: result.partyId,
					votes: 0,
					seatsWon: result.seats,
					votePercentage: 0
				}))
			);
		}

		await db.delete(parliamentMembers).where(eq(parliamentMembers.stateId, election.stateId));

		const newMembers: Array<{
			userId: string;
			stateId: number;
			partyAffiliation: string;
			term: number;
		}> = [];

		for (const result of partyResults) {
			if (result.seats > 0) {
				const partyWithMembers = sortedParties.find((p) => p.id === result.partyId);
				if (!partyWithMembers) continue;

				// Sort members: leader first, then deputy, then by seniority
				const sortedMembers = partyWithMembers.members.sort((a, b) => {
					if (a.role === "leader") return -1;
					if (b.role === "leader") return 1;
					if (a.role === "deputy") return -1;
					if (b.role === "deputy") return 1;
					return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
				});

				const selectedMembers = sortedMembers.slice(0, result.seats);

				for (const member of selectedMembers) {
					newMembers.push({
						userId: member.userId,
						stateId: election.stateId,
						partyAffiliation: result.partyName,
						term: 1
					});
				}

				console.log(
					`✅ Party ${result.partyName} assigned ${result.seats} seats (${partyWithMembers.memberCount} members)`
				);

				if (partyWithMembers.members.length < result.seats) {
					console.warn(
						`⚠️  Party ${result.partyName} allocated ${result.seats} seats but only has ${partyWithMembers.members.length} members`
					);
				}
			}
		}

		if (newMembers.length > 0) {
			await db.insert(parliamentMembers).values(newMembers);
		}

		const winningParty = sortedParties[0];
		const leaderMember = await db
			.select()
			.from(partyMembers)
			.where(and(eq(partyMembers.partyId, winningParty.id), eq(partyMembers.role, "leader")))
			.limit(1);

		if (leaderMember.length > 0) {
			const leader = leaderMember[0];
			// Count the outgoing term before deleting it, so a re-election is
			// recorded as term 2 and a first presidency as term 1.
			const previousPresidents = await db.select().from(presidents).where(eq(presidents.userId, leader.userId));
			const firstPresidency = previousPresidents.length === 0;
			const newTerm = previousPresidents.length + 1;

			await db.delete(presidents).where(eq(presidents.stateId, election.stateId));

			await db.insert(presidents).values({
				userId: leader.userId,
				stateId: election.stateId,
				electedAt: new Date(),
				term: newTerm
			});
			if (firstPresidency) await reachFirstTime(db, leader.userId, "president");

			console.log(
				`🎉 ${winningParty.name} (${winningParty.memberCount} members) leader appointed as President - no votes cast`
			);
		}

		await db
			.update(parliamentaryElections)
			.set({ status: "completed" })
			.where(eq(parliamentaryElections.id, election.id));

		console.log(
			`✅ Election ${election.id} processed with zero votes - seats distributed equally, ${winningParty.name} wins presidency`
		);

		return;
	}

	// NORMAL VOTE-COUNTING LOGIC
	const partyResults: Array<{
		partyId: number;
		partyName: string;
		votes: number;
		percentage: number;
		seats: number;
	}> = [];

	const seatAllocations: Record<number, number> = {};
	parties.forEach((party) => {
		seatAllocations[party.id] = 0;
	});

	// D'Hondt method
	for (let seat = 0; seat < election.totalSeats; seat++) {
		let maxQuotient = 0;
		let winningParty = parties[0].id;

		parties.forEach((party) => {
			const partyVotes = votesByParty[party.id] || 0;
			if (partyVotes === 0) return;

			const quotient = partyVotes / (seatAllocations[party.id] + 1);
			if (quotient > maxQuotient) {
				maxQuotient = quotient;
				winningParty = party.id;
			}
		});

		seatAllocations[winningParty]++;
	}

	for (const party of parties) {
		const partyVotes = votesByParty[party.id] || 0;
		const percentage = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;
		const seats = seatAllocations[party.id];

		partyResults.push({
			partyId: party.id,
			partyName: party.name,
			votes: partyVotes,
			percentage,
			seats
		});
	}

	if (partyResults.length > 0) {
		await db.insert(electionResults).values(
			partyResults.map((result) => ({
				electionId: election.id,
				partyId: result.partyId,
				votes: result.votes,
				seatsWon: result.seats,
				votePercentage: Math.round(result.percentage)
			}))
		);
	}

	await db.delete(parliamentMembers).where(eq(parliamentMembers.stateId, election.stateId));

	const newMembers: Array<{
		userId: string;
		stateId: number;
		partyAffiliation: string;
		term: number;
	}> = [];

	for (const result of partyResults) {
		if (result.seats > 0) {
			const members = await db.select().from(partyMembers).where(eq(partyMembers.partyId, result.partyId));

			// Sort: leader first, then deputy, then by seniority
			const sortedMembers = members.sort((a, b) => {
				if (a.role === "leader") return -1;
				if (b.role === "leader") return 1;
				if (a.role === "deputy") return -1;
				if (b.role === "deputy") return 1;
				return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
			});

			const selectedMembers = sortedMembers.slice(0, result.seats);

			for (const member of selectedMembers) {
				newMembers.push({
					userId: member.userId,
					stateId: election.stateId,
					partyAffiliation: result.partyName,
					term: 1
				});
			}

			console.log(`✅ Party ${result.partyName} won ${result.seats} seats, assigned ${selectedMembers.length} members`);

			if (members.length < result.seats) {
				console.warn(`⚠️  Party ${result.partyName} won ${result.seats} seats but only has ${members.length} members`);
			}
		}
	}

	if (newMembers.length > 0) {
		await db.insert(parliamentMembers).values(newMembers);
	}

	const winningParty = partyResults.reduce((prev, current) => {
		return current.votes > prev.votes ? current : prev;
	});

	if (winningParty.votes > 0) {
		const leaderMember = await db
			.select()
			.from(partyMembers)
			.where(and(eq(partyMembers.partyId, winningParty.partyId), eq(partyMembers.role, "leader")))
			.limit(1);

		if (leaderMember.length > 0) {
			const leader = leaderMember[0];
			// Count the outgoing term before deleting it, so a re-election is
			// recorded as term 2 and a first presidency as term 1.
			const previousPresidents = await db.select().from(presidents).where(eq(presidents.userId, leader.userId));
			const firstPresidency = previousPresidents.length === 0;
			const newTerm = previousPresidents.length + 1;

			await db.delete(presidents).where(eq(presidents.stateId, election.stateId));

			await db.insert(presidents).values({
				userId: leader.userId,
				stateId: election.stateId,
				electedAt: new Date(),
				term: newTerm
			});
			if (firstPresidency) await reachFirstTime(db, leader.userId, "president");

			console.log(
				`🎉 ${winningParty.partyName} leader (user ${leader.userId}) appointed as President of state ${election.stateId}`
			);
		}
	}

	await db
		.update(parliamentaryElections)
		.set({ status: "completed" })
		.where(eq(parliamentaryElections.id, election.id));

	console.log(
		`✅ Election ${election.id} processed successfully - ${totalVotes} votes cast, ${partyResults.reduce((sum, r) => sum + r.seats, 0)} parliament seats filled`
	);

	const winnerName = partyResults.reduce((prev, current) => (current.votes > prev.votes ? current : prev)).partyName;
	notifyStateCitizens(
		election.stateId,
		{
			title: "🏛️ Election Results",
			body: `The election is over! ${winnerName} won the most votes. Check the results.`,
			icon: "/favicon.png",
			badge: "/badge.png",
			data: { url: `/state/${election.stateId}`, tag: `election-result-${election.id}` }
		},
		"notifyElections"
	).catch((err) => console.error("Election result notification error:", err));
}

async function notifyStateCitizens(
	stateId: number,
	payload: { title: string; body: string; icon?: string; badge?: string; data?: Record<string, any> },
	notificationType: "notifyElections" | "notifyWarDeclarations" | "notifyBattleResults"
) {
	const citizens = await db
		.select({ userId: residences.userId })
		.from(residences)
		.innerJoin(regions, eq(residences.homeRegionId, regions.id))
		.where(eq(regions.stateId, stateId));

	const promises = citizens.map((c) => sendNotificationIfEnabled(c.userId, notificationType, payload));
	await Promise.allSettled(promises);
}
