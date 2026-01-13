// src/routes/(authenticated)/api/cron/elections/+server.ts

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import {
	parliamentaryElections,
	electionVotes,
	electionResults,
	parliamentMembers,
	politicalParties,
	partyMembers,
	presidents
} from "$lib/server/schema";
import { eq, and, lte } from "drizzle-orm";

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let processed = 0;
		let activated = 0;

		// 1. Update scheduled elections to active
		const scheduledElections = await db
			.select()
			.from(parliamentaryElections)
			.where(and(eq(parliamentaryElections.status, "scheduled"), lte(parliamentaryElections.startDate, now)));

		for (const election of scheduledElections) {
			await db
				.update(parliamentaryElections)
				.set({ status: "active" })
				.where(eq(parliamentaryElections.id, election.id));
			activated++;
			console.log(`✅ Activated election ${election.id} for state ${election.stateId}`);
		}

		// 2. Process finished elections
		const finishedElections = await db
			.select()
			.from(parliamentaryElections)
			.where(and(eq(parliamentaryElections.status, "active"), lte(parliamentaryElections.endDate, now)));

		for (const election of finishedElections) {
			await processElectionResults(election);
			processed++;
		}

		return json({
			success: true,
			timestamp: now.toISOString(),
			electionsActivated: activated,
			electionsProcessed: processed
		});
	} catch (error) {
		console.error("Cron job error:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
};

async function processElectionResults(election: any) {
	console.log(`Processing election ${election.id} for state ${election.stateId}`);

	// Check if already processed (idempotency check)
	const existingResults = await db
		.select()
		.from(electionResults)
		.where(eq(electionResults.electionId, election.id))
		.limit(1);

	if (existingResults.length > 0) {
		console.log(`Election ${election.id} already processed, skipping`);
		return;
	}

	// Get all votes for this election
	const votes = await db.select().from(electionVotes).where(eq(electionVotes.electionId, election.id));

	// Count votes per party
	const votesByParty: Record<number, number> = {};
	votes.forEach((vote) => {
		votesByParty[vote.partyId] = (votesByParty[vote.partyId] || 0) + 1;
	});

	const totalVotes = votes.length;

	// Get all parties in the state
	const parties = await db.select().from(politicalParties).where(eq(politicalParties.stateId, election.stateId));

	if (parties.length === 0) {
		console.warn(`No parties found for state ${election.stateId}`);
		// Mark as completed anyway
		await db
			.update(parliamentaryElections)
			.set({ status: "completed" })
			.where(eq(parliamentaryElections.id, election.id));
		return;
	}

	// Calculate seat distribution using D'Hondt method (proportional representation)
	const partyResults: Array<{
		partyId: number;
		partyName: string;
		votes: number;
		percentage: number;
		seats: number;
	}> = [];

	// D'Hondt method for seat allocation
	const seatAllocations: Record<number, number> = {};
	parties.forEach((party) => {
		seatAllocations[party.id] = 0;
	});

	// Allocate seats one by one using D'Hondt quotients
	for (let seat = 0; seat < election.totalSeats; seat++) {
		let maxQuotient = 0;
		let winningParty = parties[0].id;

		parties.forEach((party) => {
			const partyVotes = votesByParty[party.id] || 0;
			if (partyVotes === 0) return; // Skip parties with no votes

			const quotient = partyVotes / (seatAllocations[party.id] + 1);
			if (quotient > maxQuotient) {
				maxQuotient = quotient;
				winningParty = party.id;
			}
		});

		seatAllocations[winningParty]++;
	}

	// Build results array
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

	// Store results in database
	for (const result of partyResults) {
		await db.insert(electionResults).values({
			electionId: election.id,
			partyId: result.partyId,
			votes: result.votes,
			seatsWon: result.seats,
			votePercentage: Math.round(result.percentage)
		});
	}

	// ⭐ CRITICAL FIX: Clear current parliament members for this state
	await db.delete(parliamentMembers).where(eq(parliamentMembers.stateId, election.stateId));

	// ⭐ CRITICAL FIX: Assign new parliament members based on party results
	for (const result of partyResults) {
		if (result.seats > 0) {
			// Get party members
			const members = await db.select().from(partyMembers).where(eq(partyMembers.partyId, result.partyId));

			// Sort: leader first, then by join date (seniority)
			const sortedMembers = members.sort((a, b) => {
				if (a.role === "leader") return -1;
				if (b.role === "leader") return 1;
				return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
			});

			// Take the first N members based on seats won
			const selectedMembers = sortedMembers.slice(0, result.seats);

			// Create parliament member entries for selected members
			for (const member of selectedMembers) {
				await db.insert(parliamentMembers).values({
					userId: member.userId,
					stateId: election.stateId,
					partyAffiliation: result.partyName,
					term: 1 // Could be calculated based on election cycle
				});
			}

			console.log(`✅ Party ${result.partyName} won ${result.seats} seats, assigned ${selectedMembers.length} members`);

			// If party doesn't have enough members, log a warning
			if (members.length < result.seats) {
				console.warn(`⚠️  Party ${result.partyName} won ${result.seats} seats but only has ${members.length} members`);
			}
		}
	}

	// ⭐ NEW: Find the party with the most votes and make their leader president
	const winningParty = partyResults.reduce((prev, current) => {
		return current.votes > prev.votes ? current : prev;
	});

	if (winningParty.votes > 0) {
		// Get the leader of the winning party
		const leaderMember = await db
			.select()
			.from(partyMembers)
			.where(and(eq(partyMembers.partyId, winningParty.partyId), eq(partyMembers.role, "leader")))
			.limit(1);

		if (leaderMember.length > 0) {
			const leader = leaderMember[0];

			// Remove current president (if any)
			await db.delete(presidents).where(eq(presidents.stateId, election.stateId));

			// Calculate new term number
			const previousPresidents = await db.select().from(presidents).where(eq(presidents.userId, leader.userId));

			const newTerm = previousPresidents.length + 1;

			// Assign new president
			await db.insert(presidents).values({
				userId: leader.userId,
				stateId: election.stateId,
				electedAt: new Date(),
				term: newTerm
			});

			console.log(
				`🎉 ${winningParty.partyName} leader (user ${leader.userId}) appointed as President of state ${election.stateId}`
			);
		} else {
			console.warn(`⚠️  Winning party ${winningParty.partyName} has no leader to appoint as president`);
		}
	} else {
		console.warn(`⚠️  No party received any votes in election ${election.id}`);
	}

	// Mark election as completed
	await db
		.update(parliamentaryElections)
		.set({ status: "completed" })
		.where(eq(parliamentaryElections.id, election.id));

	console.log(
		`✅ Election ${election.id} processed successfully - ${totalVotes} votes cast, ${partyResults.reduce((sum, r) => sum + r.seats, 0)} parliament seats filled`
	);
}
