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
	partyMembers
} from "$lib/server/schema";
import { eq, and, lte } from "drizzle-orm";

// Verify the request is from Vercel Cron (using authorization header)
function isValidCronRequest(request: Request): boolean {
	const authHeader = request.headers.get("authorization");
	// Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
	// You should set CRON_SECRET in your Vercel environment variables
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		// If no secret is set, allow in development
		return process.env.NODE_ENV === "development";
	}

	return authHeader === `Bearer ${cronSecret}`;
}

export const GET: RequestHandler = async ({ request }) => {
	// Security check
	if (!isValidCronRequest(request)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

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
	const votesByParty: Record<string, number> = {};
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

	// Calculate seat distribution using proportional representation
	const partyResults: Array<{
		partyId: string;
		partyName: string;
		votes: number;
		percentage: number;
		seats: number;
	}> = [];

	let totalSeatsAllocated = 0;

	// First pass: allocate seats proportionally
	for (const party of parties) {
		const partyVotes = votesByParty[party.id] || 0;
		const percentage = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;
		const seats = Math.floor((percentage / 100) * election.totalSeats);

		partyResults.push({
			partyId: party.id,
			partyName: party.name,
			votes: partyVotes,
			percentage,
			seats
		});

		totalSeatsAllocated += seats;
	}

	// Second pass: allocate remaining seats using largest remainder method
	const remainingSeats = election.totalSeats - totalSeatsAllocated;
	if (remainingSeats > 0 && totalVotes > 0) {
		const sortedByRemainder = partyResults
			.map((result) => ({
				...result,
				remainder: ((result.votes / totalVotes) * election.totalSeats) % 1
			}))
			.filter((r) => r.votes > 0) // Only parties with votes
			.sort((a, b) => b.remainder - a.remainder);

		for (let i = 0; i < Math.min(remainingSeats, sortedByRemainder.length); i++) {
			const partyIndex = partyResults.findIndex((p) => p.partyId === sortedByRemainder[i].partyId);
			if (partyIndex !== -1) {
				partyResults[partyIndex].seats++;
			}
		}
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

	// Clear current parliament members for this state
	await db.delete(parliamentMembers).where(eq(parliamentMembers.stateId, election.stateId));

	// Assign new parliament members based on party results
	for (const result of partyResults) {
		if (result.seats > 0) {
			// Get party members ordered by join date (seniority)
			const members = await db
				.select()
				.from(partyMembers)
				.where(eq(partyMembers.partyId, result.partyId))
				.orderBy(partyMembers.joinedAt)
				.limit(result.seats);

			// Create parliament member entries for selected members
			for (const member of members) {
				await db.insert(parliamentMembers).values({
					userId: member.userId,
					stateId: election.stateId,
					partyAffiliation: result.partyName,
					term: 1
				});
			}

			console.log(`Party ${result.partyName} won ${result.seats} seats, assigned ${members.length} members`);

			// If party doesn't have enough members, log a warning
			if (members.length < result.seats) {
				console.warn(`Party ${result.partyName} won ${result.seats} seats but only has ${members.length} members`);
			}
		}
	}

	// Mark election as completed
	await db
		.update(parliamentaryElections)
		.set({ status: "completed" })
		.where(eq(parliamentaryElections.id, election.id));

	console.log(`Election ${election.id} processed successfully - ${totalVotes} votes cast`);
}
