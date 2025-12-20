import { db } from "$lib/server/db";
import { accounts, partyMembers, files } from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
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

	return {
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			name: user.profile?.name,
			avatar: user.profile?.avatar,
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
		isOwnProfile: account.id === params.id
	};
};
