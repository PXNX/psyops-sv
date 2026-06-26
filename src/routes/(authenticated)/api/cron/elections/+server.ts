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
	presidents,
	residences,
	regions
} from "$lib/server/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendNotificationIfEnabled } from "$lib/server/services/push-notification.service";

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let processed = 0;
		let activated = 0;
		let scheduled = 0;

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

			notifyStateCitizens(election.stateId, {
				title: "🗳️ Election Started!",
				body: "A parliamentary election has begun in your state. Cast your vote!",
				icon: "/favicon.png",
				badge: "/badge.png",
				data: { url: `/state/${election.stateId}`, tag: `election-${election.id}` }
			}, "notifyElections").catch((err) => console.error("Election notification error:", err));
		}

		// 2. Process finished elections
		const finishedElections = await db
			.select()
			.from(parliamentaryElections)
			.where(and(eq(parliamentaryElections.status, "active"), lte(parliamentaryElections.endDate, now)));

		for (const election of finishedElections) {
			await processElectionResults(election);
			processed++;

			// 3. Schedule next election (1 week from now)
			const nextElectionStart = new Date(now);
			nextElectionStart.setDate(nextElectionStart.getDate() + 7);

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
			console.log(
				`📅 Scheduled next election for state ${election.stateId} - starts ${nextElectionStart.toISOString()}`
			);
		}

		return json({
			success: true,
			timestamp: now.toISOString(),
			electionsActivated: activated,
			electionsProcessed: processed,
			electionsScheduled: scheduled
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
	const votesByParty: Record<number, number> = {};
	votes.forEach((vote) => {
		votesByParty[vote.partyId] = (votesByParty[vote.partyId] || 0) + 1;
	});

	const totalVotes = votes.length;
	const parties = await db.select().from(politicalParties).where(eq(politicalParties.stateId, election.stateId));

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
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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

			await db.insert(electionResults).values({
				electionId: election.id,
				partyId: party.id,
				votes: 0,
				seatsWon: seats,
				votePercentage: 0
			});
		}

		await db.delete(parliamentMembers).where(eq(parliamentMembers.stateId, election.stateId));

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
					await db.insert(parliamentMembers).values({
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

		const winningParty = sortedParties[0];
		const leaderMember = await db
			.select()
			.from(partyMembers)
			.where(and(eq(partyMembers.partyId, winningParty.id), eq(partyMembers.role, "leader")))
			.limit(1);

		if (leaderMember.length > 0) {
			const leader = leaderMember[0];
			await db.delete(presidents).where(eq(presidents.stateId, election.stateId));

			const previousPresidents = await db.select().from(presidents).where(eq(presidents.userId, leader.userId));
			const newTerm = previousPresidents.length + 1;

			await db.insert(presidents).values({
				userId: leader.userId,
				stateId: election.stateId,
				electedAt: new Date(),
				term: newTerm
			});

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

	for (const result of partyResults) {
		await db.insert(electionResults).values({
			electionId: election.id,
			partyId: result.partyId,
			votes: result.votes,
			seatsWon: result.seats,
			votePercentage: Math.round(result.percentage)
		});
	}

	await db.delete(parliamentMembers).where(eq(parliamentMembers.stateId, election.stateId));

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
				await db.insert(parliamentMembers).values({
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
			await db.delete(presidents).where(eq(presidents.stateId, election.stateId));

			const previousPresidents = await db.select().from(presidents).where(eq(presidents.userId, leader.userId));
			const newTerm = previousPresidents.length + 1;

			await db.insert(presidents).values({
				userId: leader.userId,
				stateId: election.stateId,
				electedAt: new Date(),
				term: newTerm
			});

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
	notifyStateCitizens(election.stateId, {
		title: "🏛️ Election Results",
		body: `The election is over! ${winnerName} won the most votes. Check the results.`,
		icon: "/favicon.png",
		badge: "/badge.png",
		data: { url: `/state/${election.stateId}`, tag: `election-result-${election.id}` }
	}, "notifyElections").catch((err) => console.error("Election result notification error:", err));
	}

	async function notifyStateCitizens(
	stateId: number,
	payload: { title: string; body: string; icon?: string; badge?: string; data?: Record<string, any> },
	notificationType: "notifyElections" | "notifyWarDeclarations" | "notifyBattleResults"
	) {
	const citizens = await db
		.select({ userId: residences.userId })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(regions.stateId, stateId));

	const promises = citizens.map((c) =>
		sendNotificationIfEnabled(c.userId, notificationType, payload)
	);
	await Promise.allSettled(promises);
	}
