// src/routes/(authenticated)/(dock)/region/[id]/state-formation/+page.server.ts
import { db } from "$lib/server/db";
import {
	regions,
	stateFormationPeriods,
	stateFormationProposals,
	stateFormationVotes,
	politicalParties,
	states,
	presidents
} from "$lib/server/schema";
import { error, fail } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	const region = await db.query.regions.findFirst({
		where: eq(regions.id, parseInt(params.id)),
		with: {
			state: true
		}
	});

	console.log("region", region);

	if (!region) {
		error(404, "Region not found");
	}

	if (region.state) {
		error(400, "This region is already part of a state");
	}

	const formationPeriod = await db.query.stateFormationPeriods.findFirst({
		where: eq(stateFormationPeriods.regionId, parseInt(params.id)),
		with: {
			proposals: {
				with: {
					proposer: {
						with: {
							profile: true
						}
					},
					votes: true
				}
			}
		}
	});

	console.log("formationPeriod", formationPeriod);

	if (!formationPeriod) {
		error(404, "No state formation period in progress");
	}

	// Get all parties in this region
	const parties = await db.query.politicalParties.findMany({
		where: sql`${politicalParties.stateId} IS NULL`,
		with: {
			founder: {
				with: {
					profile: true
				}
			},
			members: true
		}
	});

	console.log("parties", parties);

	// Check if user has voted
	let userVote = null;
	if (formationPeriod.proposals.length > 0) {
		const proposalIds = formationPeriod.proposals.map((p) => p.id);
		userVote = await db.query.stateFormationVotes.findFirst({
			where: and(eq(stateFormationVotes.voterId, account.id), sql`${stateFormationVotes.proposalId} IN ${proposalIds}`)
		});
	}

	const now = new Date();
	const isActive = formationPeriod.status === "active" && new Date(formationPeriod.endsAt) > now;

	return {
		region: {
			id: region.id,
			name: region.name,
			avatar: region.avatar,
			population: region.population
		},
		formationPeriod: {
			id: formationPeriod.id,
			status: formationPeriod.status,
			endsAt: formationPeriod.endsAt,
			isActive
		},
		proposals: formationPeriod.proposals.map((p) => ({
			id: p.id,
			stateName: p.stateName,
			description: p.description,
			mapColor: p.mapColor,
			logo: p.logo,
			voteCount: p.votes.length,
			proposer: {
				name: p.proposer.profile?.name || "Anonymous",
				avatar: p.proposer.profile?.avatar
			}
		})),
		parties: parties.map((p) => ({
			id: p.id,
			name: p.name,
			abbreviation: p.abbreviation,
			color: p.color,
			memberCount: p.memberCount,
			founder: {
				name: p.founder.profile?.name || "Anonymous"
			}
		})),
		userVote: userVote ? { proposalId: userVote.proposalId } : null
	};
};

export const actions: Actions = {
	vote: async ({ request, locals, params }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const proposalId = formData.get("proposalId") as string;

		if (!proposalId) {
			return fail(400, { error: "Proposal ID required" });
		}

		// Verify proposal exists and is part of this region's formation
		const proposal = await db.query.stateFormationProposals.findFirst({
			where: eq(stateFormationProposals.id, proposalId),
			with: {
				formationPeriod: true
			}
		});

		if (!proposal) {
			return fail(404, { error: "Proposal not found" });
		}

		if (proposal.formationPeriod.regionId !== parseInt(params.id)) {
			return fail(400, { error: "Invalid proposal for this region" });
		}

		if (proposal.formationPeriod.status !== "active") {
			return fail(400, { error: "Voting period has ended" });
		}

		if (new Date() > new Date(proposal.formationPeriod.endsAt)) {
			return fail(400, { error: "Voting period has expired" });
		}

		try {
			// Remove any existing vote from this user for this formation period
			const allProposals = await db.query.stateFormationProposals.findMany({
				where: eq(stateFormationProposals.formationPeriodId, proposal.formationPeriodId)
			});

			for (const p of allProposals) {
				await db
					.delete(stateFormationVotes)
					.where(and(eq(stateFormationVotes.proposalId, p.id), eq(stateFormationVotes.voterId, account.id)));
			}

			// Cast new vote
			await db.insert(stateFormationVotes).values({
				proposalId,
				voterId: account.id
			});

			// Update vote count
			const voteCount = await db.query.stateFormationVotes.findMany({
				where: eq(stateFormationVotes.proposalId, proposalId)
			});

			await db
				.update(stateFormationProposals)
				.set({ voteCount: voteCount.length })
				.where(eq(stateFormationProposals.id, proposalId));

			return { success: true };
		} catch (error) {
			console.error("Voting error:", error);
			return fail(500, { error: "Failed to cast vote" });
		}
	},

	finalize: async ({ params, locals }) => {
		const account = locals.account!;

		const formationPeriod = await db.query.stateFormationPeriods.findFirst({
			where: eq(stateFormationPeriods.regionId, parseInt(params.id)),
			with: {
				proposals: {
					with: {
						votes: true
					}
				}
			}
		});

		if (!formationPeriod) {
			return fail(404, { error: "Formation period not found" });
		}

		if (new Date() < new Date(formationPeriod.endsAt)) {
			return fail(400, { error: "Formation period has not ended yet" });
		}

		if (formationPeriod.status !== "active") {
			return fail(400, { error: "Formation period already finalized" });
		}

		try {
			// Find winning proposal (most votes)
			const winningProposal = formationPeriod.proposals.reduce((prev, current) =>
				current.votes.length > prev.votes.length ? current : prev
			);

			// Get the region to calculate initial population
			const region = await db.query.regions.findFirst({
				where: eq(regions.id, parseInt(params.id))
			});

			// Create the new state
			const [newState] = await db
				.insert(states)
				.values({
					name: winningProposal.stateName,
					avatar: winningProposal.logo,
					background: null,
					description: winningProposal.description,
					population: region?.population || 0,
					rating: 0
				})
				.returning();

			// Link region to state
			await db
				.update(regions)
				.set({ stateId: newState.id })
				.where(eq(regions.id, parseInt(params.id)));

			// Update all parties to belong to this state
			await db
				.update(politicalParties)
				.set({ stateId: newState.id })
				.where(sql`${politicalParties.stateId} IS NULL`);

			// Make the winning proposer the first president
			await db.insert(presidents).values({
				userId: winningProposal.proposedBy,
				stateId: newState.id,
				term: 1
			});

			// Mark formation period as completed
			await db
				.update(stateFormationPeriods)
				.set({ status: "completed" })
				.where(eq(stateFormationPeriods.id, formationPeriod.id));

			return { success: true, stateId: newState.id };
		} catch (error) {
			console.error("Finalization error:", error);
			return fail(500, { error: "Failed to finalize state formation" });
		}
	}
};
