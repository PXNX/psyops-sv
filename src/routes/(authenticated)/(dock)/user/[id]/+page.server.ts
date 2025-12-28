// src/routes/(authenticated)/user/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	accounts,
	partyMembers,
	files,
	residences,
	articles,
	regions,
	states,
	politicalParties,
	userMedals,
	presidents
} from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { error, fail } from "@sveltejs/kit";
import { eq, count, and } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { getRegionName } from "$lib/utils/formatting";

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

	// Get user's primary residence
	const [residence] = await db
		.select({
			id: residences.id,
			movedInAt: residences.movedInAt,
			regionId: residences.regionId,

			stateId: states.id,
			stateName: states.name,
			stateLogo: states.logo
		})
		.from(residences)
		.leftJoin(regions, eq(residences.regionId, regions.id))
		.leftJoin(states, eq(regions.stateId, states.id))
		.where(eq(residences.userId, params.id))
		.limit(1);

	// Get article count
	const [articleCountResult] = await db
		.select({ count: count() })
		.from(articles)
		.where(eq(articles.authorId, params.id));

	// Check if user is in a party
	const [partyMembership] = await db
		.select({
			partyId: partyMembers.partyId,
			role: partyMembers.role,
			joinedAt: partyMembers.joinedAt,
			partyName: politicalParties.name,
			partyAbbreviation: politicalParties.abbreviation,
			partyColor: politicalParties.color,
			partyLogo: politicalParties.logo,
			partyIdeology: politicalParties.ideology,
			stateId: politicalParties.stateId
		})
		.from(partyMembers)
		.leftJoin(politicalParties, eq(partyMembers.partyId, politicalParties.id))
		.where(eq(partyMembers.userId, params.id))
		.limit(1);

	// Get party state and logo URL if party exists
	let partyLogoUrl = null;
	let partyStateName = null;
	if (partyMembership) {
		const [partyState] = await db
			.select({ name: states.name })
			.from(states)
			.where(eq(states.id, partyMembership.stateId!))
			.limit(1);

		partyStateName = partyState?.name || null;

		if (partyMembership.partyLogo) {
			const logoFile = await db.query.files.findFirst({
				where: eq(files.id, partyMembership.partyLogo)
			});
			if (logoFile) {
				partyLogoUrl = await getSignedDownloadUrl(logoFile.key);
			}
		}
	}

	// Get user logo URL if exists
	let logoUrl: string | null = null;
	if (user.profile?.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, user.profile?.logo!)
		});
		if (logoFile) {
			logoUrl = await getSignedDownloadUrl(logoFile.key);
		}
	}

	return {
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			name: user.profile?.name,
			logo: logoUrl,
			bio: user.profile?.bio,
			createdAt: user.createdAt
		},
		party: partyMembership
			? {
					id: partyMembership.partyId,
					name: partyMembership.partyName,
					abbreviation: partyMembership.partyAbbreviation,
					color: partyMembership.partyColor,
					logo: partyLogoUrl,
					ideology: partyMembership.partyIdeology,
					role: partyMembership.role,
					stateName: partyStateName,
					joinedAt: partyMembership.joinedAt
				}
			: null,
		residence: residence
			? {
					id: residence.id,
					movedInAt: residence.movedInAt,
					region: {
						id: residence.regionId,

						name: getRegionName(residence.regionId),
						logo: "/coats/" + residence.regionId + ".svg",
						state: {
							id: residence.stateId,
							name: residence.stateName,
							logo: residence.stateLogo
						}
					}
				}
			: null,
		articleCount: articleCountResult?.count || 0,
		isOwnProfile: account.id === params.id
	};
};

export const actions: Actions = {
	awardMedal: async ({ request, params, locals }) => {
		const account = locals.account!;

		// Check if user is a president
		const presidency = await db.query.presidents.findFirst({
			where: eq(presidents.userId, account.id)
		});

		if (!presidency) {
			return fail(403, { error: "Only presidents can award medals" });
		}

		// Check if already awarded this month
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const existingAward = await db.query.userMedals.findFirst({
			where: and(
				eq(userMedals.awardedBy, account.id)
				// Add date comparison if your DB supports it
			)
		});

		if (existingAward && new Date(existingAward.awardedAt) >= startOfMonth) {
			return fail(400, { error: "You can only award one medal per month" });
		}

		// Cannot award to self
		if (account.id === params.id) {
			return fail(400, { error: "Cannot award medal to yourself" });
		}

		const formData = await request.formData();
		const medalType = formData.get("medalType") as string;
		const reason = formData.get("reason") as string;

		if (!medalType || !reason) {
			return fail(400, { error: "Medal type and reason are required" });
		}

		if (!["honor", "valor", "excellence", "service", "leadership"].includes(medalType)) {
			return fail(400, { error: "Invalid medal type" });
		}

		if (reason.length < 10 || reason.length > 500) {
			return fail(400, { error: "Reason must be between 10 and 500 characters" });
		}

		try {
			// Award the medal
			await db.insert(userMedals).values({
				userId: params.id,
				stateId: presidency.stateId,
				medalType: medalType as any,
				reason,
				awardedBy: account.id
			});

			// Send inbox notification
			await sendMedalNotification({
				recipientId: params.id,
				awarderId: account.id,
				medalType,
				reason,
				stateId: presidency.stateId
			});

			return { success: true };
		} catch (error) {
			console.error("Error awarding medal:", error);
			return fail(500, { error: "Failed to award medal" });
		}
	}
};
