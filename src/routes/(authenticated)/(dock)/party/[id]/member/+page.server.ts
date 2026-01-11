// src/routes/party/[id]/member/+page.server.ts
import { db } from "$lib/server/db";
import { politicalParties, partyMembers, files, states, regions } from "$lib/server/schema";
import { eq, sql, and } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
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
			logoUrl = await getSignedDownloadUrl(logoFile.key);
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

	// Process member logos
	const membersWithLogos = await Promise.all(
		members.map(async (m) => {
			let memberLogoUrl = null;
			if (m.user.profile?.logo) {
				try {
					const logoFile = await db.query.files.findFirst({
						where: eq(files.id, m.user.profile.logo)
					});
					if (logoFile) {
						memberLogoUrl = await getSignedDownloadUrl(logoFile.key);
					}
				} catch (err) {
					console.error("Failed to get member logo:", err);
				}
			}

			// todo: 		{@const sortedMembers = data.members.slice().sort((a, b) => {
			// 	const roleOrder = { leader: 0, deputy: 1, member: 2 };
			// 	return roleOrder[a.role] - roleOrder[b.role];
			// 	})}

			return {
				id: m.id,
				userId: m.userId,
				role: m.role,
				joinedAt: m.joinedAt,
				user: {
					name: m.user.profile?.name || null,
					logo: memberLogoUrl
				}
			};
		})
	);

	// Check if current user is a member
	let isMember = false;
	let isLeader = false;
	let isDeputy = false;
	let memberSince = null;
	let canJoin = false;

	const membership = membersWithLogos.find((m) => m.userId === account.id);
	if (membership) {
		isMember = true;
		isLeader = membership.role === "leader";
		isDeputy = membership.role === "deputy";
		memberSince = membership.joinedAt;
	} else {
		// Check if user already has a party membership elsewhere
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});
		canJoin = !existingMembership;
	}

	// Calculate party rank
	const allParties = await db
		.select({ id: politicalParties.id, memberCount: politicalParties.memberCount })
		.from(politicalParties)
		.where(eq(politicalParties.stateId, party.stateId))
		.orderBy(sql`${politicalParties.memberCount} DESC`);

	const partyRank = allParties.findIndex((p) => p.id === partyId) + 1;

	// Check if this is the only party in the state
	const isOnlyPartyInState = allParties.length === 1;

	// Get state statistics for disband warning
	let stateRegionCount = 0;
	let statePopulation = 0;
	if (isOnlyPartyInState) {
		const stateRegions = await db
			.select({
				id: regions.id
			})
			.from(regions)
			.where(eq(regions.stateId, party.stateId));

		stateRegionCount = stateRegions.length;
		statePopulation = party.state.population || 0;
	}

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
		members: membersWithLogos,
		isMember,
		isLeader,
		isDeputy,
		memberSince,
		canJoin,
		partyRank,
		isOnlyPartyInState,
		stateRegionCount,
		statePopulation,
		parliamentSeats: 0
	};
};

export const actions: Actions = {
	kick: async ({ request, params, locals }) => {
		const account = locals.account!;
		const partyId = parseInt(params.id);
		const formData = await request.formData();
		const targetUserId = formData.get("userId") as string;

		if (!targetUserId) {
			return fail(400, { error: "Missing user ID" });
		}

		// Check if requester is leader or deputy
		const requesterMembership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, account.id))
		});

		if (!requesterMembership || (requesterMembership.role !== "leader" && requesterMembership.role !== "deputy")) {
			return fail(403, { error: "You don't have permission to kick members" });
		}

		// Get target member
		const targetMembership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, targetUserId))
		});

		if (!targetMembership) {
			return fail(404, { error: "Member not found" });
		}

		// Leader cannot kick themselves
		if (targetMembership.role === "leader") {
			return fail(403, { error: "Cannot kick the party leader" });
		}

		// Deputy can only kick regular members
		if (requesterMembership.role === "deputy" && targetMembership.role !== "member") {
			return fail(403, { error: "Deputies can only kick regular members" });
		}

		// Delete the membership
		await db.delete(partyMembers).where(eq(partyMembers.id, targetMembership.id));

		// Update member count
		await db
			.update(politicalParties)
			.set({ memberCount: sql`${politicalParties.memberCount} - 1` })
			.where(eq(politicalParties.id, partyId));

		return { success: true, message: "Member kicked successfully" };
	},

	promote: async ({ request, params, locals }) => {
		const account = locals.account!;
		const partyId = parseInt(params.id);
		const formData = await request.formData();
		const targetUserId = formData.get("userId") as string;

		if (!targetUserId) {
			return fail(400, { error: "Missing user ID" });
		}

		// Check if requester is leader
		const requesterMembership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, account.id))
		});

		if (!requesterMembership || requesterMembership.role !== "leader") {
			return fail(403, { error: "Only the party leader can promote members" });
		}

		// Get target member
		const targetMembership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, targetUserId))
		});

		if (!targetMembership) {
			return fail(404, { error: "Member not found" });
		}

		if (targetMembership.role !== "member") {
			return fail(400, { error: "Can only promote regular members" });
		}

		// Check if there's already a deputy
		const existingDeputy = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.partyId, partyId), eq(partyMembers.role, "deputy"))
		});

		if (existingDeputy) {
			return fail(400, { error: "There is already a deputy leader. Demote them first." });
		}

		// Promote to deputy
		await db.update(partyMembers).set({ role: "deputy" }).where(eq(partyMembers.id, targetMembership.id));

		return { success: true, message: "Member promoted to deputy leader" };
	},

	demote: async ({ request, params, locals }) => {
		const account = locals.account!;
		const partyId = parseInt(params.id);
		const formData = await request.formData();
		const targetUserId = formData.get("userId") as string;

		if (!targetUserId) {
			return fail(400, { error: "Missing user ID" });
		}

		// Check if requester is leader
		const requesterMembership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, account.id))
		});

		if (!requesterMembership || requesterMembership.role !== "leader") {
			return fail(403, { error: "Only the party leader can demote members" });
		}

		// Get target member
		const targetMembership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, targetUserId))
		});

		if (!targetMembership) {
			return fail(404, { error: "Member not found" });
		}

		if (targetMembership.role !== "deputy") {
			return fail(400, { error: "Can only demote deputy leaders" });
		}

		// Demote to regular member
		await db.update(partyMembers).set({ role: "member" }).where(eq(partyMembers.id, targetMembership.id));

		return { success: true, message: "Deputy leader demoted to member" };
	},

	disband: async ({ params, locals }) => {
		const account = locals.account!;
		const partyId = parseInt(params.id);

		try {
			// Get party details with state info
			const party = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, partyId),
				with: {
					members: true,
					state: true
				}
			});

			if (!party) {
				return fail(404, { error: "Party not found" });
			}

			// Check if user is the leader
			const membership = party.members.find((m) => m.userId === account.id);
			if (!membership || membership.role !== "leader") {
				return fail(403, { error: "Only the party leader can disband the party" });
			}

			// Check if leader is the only member
			if (party.memberCount > 1) {
				return fail(400, { error: "Cannot disband party with other members. All members must leave first." });
			}

			// Check if this is the only party in the state
			const partiesInState = await db
				.select({ id: politicalParties.id })
				.from(politicalParties)
				.where(eq(politicalParties.stateId, party.stateId));

			const isOnlyParty = partiesInState.length === 1;

			if (isOnlyParty) {
				// Abolish the state - make all regions independent
				await db.update(regions).set({ stateId: null }).where(eq(regions.stateId, party.stateId));

				// Delete the state (this will cascade delete related data)
				await db.delete(states).where(eq(states.id, party.stateId));
			}

			// Delete party (cascade will handle party members)
			await db.delete(politicalParties).where(eq(politicalParties.id, partyId));

			throw redirect(303, "/party");
		} catch (err) {
			// Re-throw redirect errors
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Disband party error:", err);
			return fail(500, { error: "Failed to disband party" });
		}
	}
};
