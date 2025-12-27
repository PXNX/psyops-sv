// src/routes/party/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { politicalParties, partyMembers, files, userProfiles } from "$lib/server/schema";
import { and, eq, sql } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;
	const partyId = parseInt(params.id);

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
			try {
				logoUrl = await getSignedDownloadUrl(logoFile.key);
			} catch {
				logoUrl = null;
			}
		}
	}

	// Get all party members with their profiles
	const members = await db
		.select({
			id: partyMembers.id,
			userId: partyMembers.userId,
			role: partyMembers.role,
			joinedAt: partyMembers.joinedAt
		})
		.from(partyMembers)
		.where(eq(partyMembers.partyId, partyId))
		.orderBy(sql`${partyMembers.joinedAt} DESC`);

	// Get user profiles for all members
	const membersWithProfiles = await Promise.all(
		members.map(async (member) => {
			const userProfile = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, member.userId)
			});

			// Get logo URL if exists
			let logoUrl = null;
			if (userProfile?.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, userProfile.logo)
				});
				if (logoFile) {
					try {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {
						logoUrl = null;
					}
				}
			}

			return {
				id: member.id,
				userId: member.userId,
				role: member.role,
				joinedAt: member.joinedAt.toISOString(),
				user: {
					profile: userProfile
						? {
								name: userProfile.name,
								logo: logoUrl
							}
						: null
				}
			};
		})
	);

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

	// Calculate party rank
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
		members: membersWithProfiles,
		isMember,
		isLeader,
		memberSince,
		canJoin,
		partyRank,
		parliamentSeats: 0
	};
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "You must be logged in to join a party" });
		}

		const partyId = parseInt(params.id);

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

		const partyId = parseInt(params.id);

		try {
			// Check if user is a member
			const membership = await db.query.partyMembers.findFirst({
				where: and(eq(partyMembers.userId, account.id), eq(partyMembers.partyId, partyId))
			});

			if (!membership) {
				return fail(400, { error: "You are not a member of this party" });
			}

			// Prevent leader from leaving (they must delete party if alone or transfer leadership)
			if (membership.role === "leader") {
				return fail(400, {
					error: "Party leaders cannot leave. Delete the party or transfer leadership first."
				});
			}

			// Remove membership
			await db.delete(partyMembers).where(eq(partyMembers.id, membership.id));

			// Decrement member count
			await db
				.update(politicalParties)
				.set({
					memberCount: sql`${politicalParties.memberCount} - 1`
				})
				.where(eq(politicalParties.id, partyId));
		} catch (err) {
			// Re-throw redirect errors
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Leave party error:", err);
			return fail(500, { error: "Failed to leave party" });
		}

		redirect(303, "/party");
	},

	delete: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "You must be logged in" });
		}

		const partyId = parseInt(params.id);

		try {
			// Get party details
			const party = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, partyId),
				with: {
					members: true
				}
			});

			if (!party) {
				return fail(404, { error: "Party not found" });
			}

			// Check if user is the leader
			const membership = party.members.find((m) => m.userId === account.id);
			if (!membership || membership.role !== "leader") {
				return fail(403, { error: "Only the party leader can delete the party" });
			}

			// Check if leader is the only member
			if (party.memberCount > 1) {
				return fail(400, { error: "Cannot delete party with other members. All members must leave first." });
			}

			// Delete party (cascade will handle party members)
			await db.delete(politicalParties).where(eq(politicalParties.id, partyId));
		} catch (err) {
			// Re-throw redirect errors
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Delete party error:", err);
			return fail(500, { error: "Failed to delete party" });
		}

		redirect(303, "/party");
	}
};
