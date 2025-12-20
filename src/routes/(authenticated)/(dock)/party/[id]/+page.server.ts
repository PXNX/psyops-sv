// src/routes/party/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { politicalParties, partyMembers, files } from "$lib/server/schema";
import { eq, sql } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;
	const partyId = params.id;

	// Get party details
	const party = await db.query.politicalParties.findFirst({
		where: eq(politicalParties.id, partyId),
		with: {
			state: true,
			founder: {
				with: {
					profile: true
				}
			}
		}
	});

	if (!party) {
		throw error(404, "Party not found");
	}

	// Get party logo URL if exists
	let logoUrl = null;
	if (party.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, party.logo)
		});
		if (logoFile) {
			// Construct the URL based on your file storage setup
			logoUrl = `https://your-cdn.com/${logoFile.key}`;
		}
	}

	// Get all party members
	const members = await db.query.partyMembers.findMany({
		where: eq(partyMembers.partyId, partyId),
		with: {
			user: {
				with: {
					profile: true
				}
			}
		},
		orderBy: (partyMembers, { desc }) => [desc(partyMembers.joinedAt)]
	});

	// Check if current user is a member
	let isMember = false;
	let isLeader = false;
	let memberSince = null;
	let canJoin = false;

	if (account) {
		const membership = members.find((m) => m.userId === account.id);
		if (membership) {
			isMember = true;
			isLeader = membership.role === "leader";
			memberSince = membership.joinedAt.toISOString();
		} else {
			// Check if user already has a party membership elsewhere
			const existingMembership = await db.query.partyMembers.findFirst({
				where: eq(partyMembers.userId, account.id)
			});
			canJoin = !existingMembership;
		}
	}

	// Calculate party rank (simplified - you'd want more complex logic)
	const allParties = await db
		.select({ id: politicalParties.id, memberCount: politicalParties.memberCount })
		.from(politicalParties)
		.where(eq(politicalParties.stateId, party.stateId))
		.orderBy(sql`${politicalParties.memberCount} DESC`);

	const partyRank = allParties.findIndex((p) => p.id === partyId) + 1;

	return {
		party: {
			id: party.id,
			name: party.name,
			abbreviation: party.abbreviation,
			color: party.color,
			logoUrl,
			ideology: party.ideology,
			description: party.description,
			foundedAt: party.foundedAt.toISOString(),
			memberCount: party.memberCount,
			state: {
				id: party.state.id,
				name: party.state.name
			}
		},
		members: members.map((m) => ({
			id: m.id,
			userId: m.userId,
			role: m.role,
			joinedAt: m.joinedAt.toISOString(),
			user: {
				email: m.user.email,
				profile: m.user.profile
					? {
							name: m.user.profile.name,
							avatar: m.user.profile.avatar
						}
					: null
			}
		})),
		isMember,
		isLeader,
		memberSince,
		canJoin,
		partyRank,
		parliamentSeats: 0 // TODO: Calculate from parliamentMembers table
	};
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "You must be logged in to join a party" });
		}

		const partyId = params.id;

		// Check if user already in a party
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (existingMembership) {
			return fail(400, { error: "You are already a member of another party" });
		}

		// Check if party exists
		const party = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.id, partyId)
		});

		if (!party) {
			return fail(404, { error: "Party not found" });
		}

		try {
			// Add user as member
			await db.insert(partyMembers).values({
				userId: account.id,
				partyId,
				role: "member"
			});

			// Increment member count
			await db
				.update(politicalParties)
				.set({
					memberCount: sql`${politicalParties.memberCount} + 1`
				})
				.where(eq(politicalParties.id, partyId));

			return { success: "Successfully joined the party!" };
		} catch (error) {
			console.error("Join party error:", error);
			return fail(500, { error: "Failed to join party" });
		}
	},

	leave: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "You must be logged in" });
		}

		const partyId = params.id;

		// Check if user is a member
		const membership = await db.query.partyMembers.findFirst({
			where: sql`${partyMembers.userId} = ${account.id} AND ${partyMembers.partyId} = ${partyId}`
		});

		if (!membership) {
			return fail(400, { error: "You are not a member of this party" });
		}

		// Prevent leader from leaving (they must transfer leadership first)
		if (membership.role === "leader") {
			return fail(400, { error: "Party leaders cannot leave. Transfer leadership first or disband the party." });
		}

		try {
			// Remove membership
			await db
				.delete(partyMembers)
				.where(sql`${partyMembers.userId} = ${account.id} AND ${partyMembers.partyId} = ${partyId}`);

			// Decrement member count
			await db
				.update(politicalParties)
				.set({
					memberCount: sql`${politicalParties.memberCount} - 1`
				})
				.where(eq(politicalParties.id, partyId));

			redirect(303, "/parties");
		} catch (error) {
			console.error("Leave party error:", error);
			return fail(500, { error: "Failed to leave party" });
		}
	}
};
