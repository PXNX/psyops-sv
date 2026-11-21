// src/routes/(authenticated)/api/cron/bloc-elections/+server.ts

import type { RequestHandler } from "./$types";
import { cronCrash, cronResponse } from "#lib/server/cron.js";
import { db } from "#lib/server/db.js";
import { blocs, blocLeaders, blocLeaderElections, blocLeaderCandidates, blocLeaderVotes } from "#lib/server/schema.js";
import { eq, and, lte } from "drizzle-orm";
import { resolveExpiredBlocApplications } from "#lib/server/service/blocApplication.js";
import { nextCycleWindow } from "#lib/server/service/blocElectionCycle.js";
import { dtg } from "#lib/utils/dtg.js";

export const config = {
	maxDuration: 60
};

export const GET: RequestHandler = async () => {
	try {
		const now = new Date();
		let bootstrapped = 0;
		let activated = 0;
		let processed = 0;

		// 0. Every bloc without an election cycle yet gets its first one scheduled.
		const allBlocs = await db.select({ id: blocs.id }).from(blocs);
		const blocsWithElections = await db
			.selectDistinct({ blocId: blocLeaderElections.blocId })
			.from(blocLeaderElections);
		const blocIdsWithElections = new Set(blocsWithElections.map((b) => b.blocId));

		for (const bloc of allBlocs) {
			if (blocIdsWithElections.has(bloc.id)) continue;
			await scheduleNextCycle(bloc.id, now);
			bootstrapped++;
		}

		// 1. Open the nomination/voting window for cycles that reached their last 2 days.
		const toActivate = await db
			.select()
			.from(blocLeaderElections)
			.where(and(eq(blocLeaderElections.status, "scheduled"), lte(blocLeaderElections.votingStartsAt, now)));

		for (const election of toActivate) {
			await db.update(blocLeaderElections).set({ status: "active" }).where(eq(blocLeaderElections.id, election.id));
			activated++;
			console.log(`✅ Opened nominations/voting for bloc ${election.blocId} election ${election.id}`);
		}

		// 2. Tally finished elections and schedule the next cycle.
		const toProcess = await db
			.select()
			.from(blocLeaderElections)
			.where(and(eq(blocLeaderElections.status, "active"), lte(blocLeaderElections.votingEndsAt, now)));

		for (const election of toProcess) {
			await processBlocLeaderElection(election.id, election.blocId);
			processed++;
			await scheduleNextCycle(election.blocId, now);
		}

		// 3. Close bloc membership applications whose voting window expired.
		const applicationsResolved = await resolveExpiredBlocApplications();

		return cronResponse("bloc-elections", { bootstrapped, activated, processed, applicationsResolved }, 0);
	} catch (error) {
		return cronCrash("bloc-elections", error);
	}
};

async function scheduleNextCycle(blocId: number, from: Date) {
	// A bloc without a leader opens nominations/voting right away instead of
	// waiting 28 days for the end of a fresh cycle.
	const [leader] = await db
		.select({ userId: blocLeaders.userId })
		.from(blocLeaders)
		.where(eq(blocLeaders.blocId, blocId))
		.limit(1);
	const window = nextCycleWindow(from, !!leader);

	await db.insert(blocLeaderElections).values({ blocId, ...window });

	console.log(
		window.status === "active"
			? `🗳️ Bloc ${blocId} has no leader - nominations and voting open until ${dtg(window.votingEndsAt)}`
			: `📅 Scheduled next bloc leader election for bloc ${blocId} - voting opens ${dtg(window.votingStartsAt)}`
	);
}

async function processBlocLeaderElection(electionId: number, blocId: number) {
	// Idempotency guard, mirroring the parliamentary election cron.
	const [current] = await db
		.select({ status: blocLeaderElections.status })
		.from(blocLeaderElections)
		.where(eq(blocLeaderElections.id, electionId))
		.limit(1);

	if (!current || current.status === "completed") return;

	const candidates = await db
		.select()
		.from(blocLeaderCandidates)
		.where(eq(blocLeaderCandidates.electionId, electionId))
		.orderBy(blocLeaderCandidates.nominatedAt);

	if (candidates.length > 0) {
		const votes = await db.select().from(blocLeaderVotes).where(eq(blocLeaderVotes.electionId, electionId));
		const tally: Record<string, number> = {};
		votes.forEach((vote) => {
			tally[vote.candidateUserId] = (tally[vote.candidateUserId] || 0) + 1;
		});

		// Winner is the most-voted candidate; ties (including the zero-vote,
		// uncontested case) go to whoever was nominated first.
		let winnerId = candidates[0].candidateUserId;
		let winnerVotes = tally[winnerId] || 0;
		for (const candidate of candidates.slice(1)) {
			const candidateVotes = tally[candidate.candidateUserId] || 0;
			if (candidateVotes > winnerVotes) {
				winnerId = candidate.candidateUserId;
				winnerVotes = candidateVotes;
			}
		}

		await db
			.insert(blocLeaders)
			.values({ userId: winnerId, blocId })
			.onConflictDoUpdate({
				target: blocLeaders.blocId,
				set: { userId: winnerId, appointedAt: new Date() }
			});

		console.log(`🎉 ${winnerId} elected bloc leader of bloc ${blocId} with ${winnerVotes} vote(s)`);
	} else {
		console.log(`No candidates nominated for bloc ${blocId} election ${electionId} - leadership unchanged`);
	}

	await db.update(blocLeaderElections).set({ status: "completed" }).where(eq(blocLeaderElections.id, electionId));
}
