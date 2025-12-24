// src/routes/(authenticated)/user/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, partyMembers, files, residences, articles, userVisas } from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { error } from "@sveltejs/kit";
import { eq, and, count, gt } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	// Query account with its profile
	const user = await db.query.accounts.findFirst({
		where: eq(accounts.id, params.id),
		with: {
			profile: true
		}
	});

	if (!user) {
		error(404, "User not found");
	}

	const account = locals.account!;

	// Get user's single residence
	const residence = await db.query.residences.findFirst({
		where: eq(residences.userId, params.id),
		with: {
			region: {
				with: {
					state: true
				}
			}
		}
	});

	// Get user's active visas
	const activeVisas = await db.query.userVisas.findMany({
		where: and(eq(userVisas.userId, params.id), eq(userVisas.status, "active"), gt(userVisas.expiresAt, new Date())),
		with: {
			state: true
		},
		orderBy: (visas, { asc }) => [asc(visas.expiresAt)]
	});

	// Get article count
	const articleCount = await db.select({ count: count() }).from(articles).where(eq(articles.authorId, params.id));

	// Check if user is in a party
	const partyMembership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, params.id),
		with: {
			party: {
				with: {
					state: true
				}
			}
		}
	});

	// Get party logo URL if exists
	let partyLogoUrl = null;
	if (partyMembership?.party.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, partyMembership.party.logo)
		});
		if (logoFile) {
			partyLogoUrl = await getSignedDownloadUrl(logoFile.key);
		}
	}

	// Get user avatar URL if exists
	let avatarUrl = user.profile?.avatar || null;
	if (avatarUrl && !avatarUrl.startsWith("http")) {
		const avatarFile = await db.query.files.findFirst({
			where: eq(files.id, avatarUrl)
		});
		if (avatarFile) {
			avatarUrl = await getSignedDownloadUrl(avatarFile.key);
		}
	}

	return {
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			name: user.profile?.name,
			avatar: avatarUrl,
			bio: user.profile?.bio,
			createdAt: user.createdAt
		},
		party: partyMembership
			? {
					id: partyMembership.party.id,
					name: partyMembership.party.name,
					abbreviation: partyMembership.party.abbreviation,
					color: partyMembership.party.color,
					logo: partyLogoUrl,
					ideology: partyMembership.party.ideology,
					role: partyMembership.role,
					stateName: partyMembership.party.state.name,
					joinedAt: partyMembership.joinedAt
				}
			: null,
		residence: residence
			? {
					id: residence.id,
					movedInAt: residence.movedInAt,
					region: {
						id: residence.region.id,

						stateName: residence.region.state?.name
					}
				}
			: null,
		activeVisas: activeVisas.map((v) => ({
			id: v.id,
			stateId: v.stateId,
			stateName: v.state.name,
			stateAvatar: v.state.avatar,
			expiresAt: v.expiresAt,
			issuedAt: v.issuedAt,
			cost: v.cost
		})),
		articleCount: articleCount[0]?.count || 0,
		isOwnProfile: account.id === params.id
	};
};
