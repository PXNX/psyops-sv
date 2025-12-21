// src/routes/party/[id]/member/+page.server.ts
import { db } from "$lib/server/db";
import { politicalParties, partyMembers, files, regions } from "$lib/server/schema";
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
		parliamentSeats: 0
	};
};
