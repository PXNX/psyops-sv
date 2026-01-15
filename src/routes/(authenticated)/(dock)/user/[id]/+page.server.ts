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
	presidents,
	ministers,
	governors
} from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { error, fail } from "@sveltejs/kit";
import { eq, count, and } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { getRegionName } from "$lib/utils/formatting";
import { sendMedalNotification } from "$lib/server/service/inbox";

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

	// Check if user is a president
	const presidency = await db.query.presidents.findFirst({
		where: eq(presidents.userId, params.id),
		with: {
			state: true
		}
	});

	// Get state logo URL if president
	let presidencyLogoUrl: string | null = null;
	if (presidency?.state?.logo) {
		const stateLogoFile = await db.query.files.findFirst({
			where: eq(files.id, presidency.state.logo)
		});
		if (stateLogoFile) {
			presidencyLogoUrl = await getSignedDownloadUrl(stateLogoFile.key);
		}
	}

	// Check if user is a governor
	const governorship = await db.query.governors.findFirst({
		where: eq(governors.userId, params.id),
		with: {
			region: {
				with: {
					state: true
				}
			}
		}
	});

	// Get all ministries user holds
	const ministries = await db.query.ministers.findMany({
		where: eq(ministers.userId, params.id),
		with: {
			state: true
		}
	});

	// Check if current user is a president (for appointment ability)
	const currentUserPresidency = await db.query.presidents.findFirst({
		where: eq(presidents.userId, account.id)
	});

	// Get available ministries if current user is president and viewing someone else
	let availableMinistries: string[] = [];
	if (currentUserPresidency && account.id !== params.id) {
		// Get all occupied ministries in this state
		const occupiedMinistries = await db.query.ministers.findMany({
			where: eq(ministers.stateId, currentUserPresidency.stateId)
		});

		const allMinistries = ["economy", "defense", "foreign_affairs"];

		const occupied = occupiedMinistries.map((m) => m.ministry);
		availableMinistries = allMinistries.filter((m) => !occupied.includes(m));
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
		isOwnProfile: account.id === params.id,
		presidency: presidency
			? {
					stateId: presidency.stateId,
					stateName: presidency.state.name,
					stateLogo: presidencyLogoUrl,
					electedAt: presidency.electedAt,
					term: presidency.term
				}
			: null,
		governorship: governorship
			? {
					regionId: governorship.regionId,
					regionName: getRegionName(governorship.regionId),
					stateId: governorship.region.stateId,
					stateName: governorship.region.state?.name,
					appointedAt: governorship.appointedAt,
					term: governorship.term
				}
			: null,
		ministries: ministries.map((m) => ({
			id: m.id,
			ministry: m.ministry,
			stateId: m.stateId,
			stateName: m.state.name,
			appointedAt: m.appointedAt
		})),
		canAppointMinister: !!currentUserPresidency && account.id !== params.id,
		availableMinistries,
		currentUserPresidency: currentUserPresidency
			? {
					stateId: currentUserPresidency.stateId
				}
			: null
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
			where: and(eq(userMedals.awardedBy, account.id))
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
			await db.insert(userMedals).values({
				userId: params.id,
				stateId: presidency.stateId,
				medalType: medalType as any,
				reason,
				awardedBy: account.id
			});

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
	},

	appointMinister: async ({ request, params, locals }) => {
		const account = locals.account!;

		// Check if user is a president
		const presidency = await db.query.presidents.findFirst({
			where: eq(presidents.userId, account.id)
		});

		if (!presidency) {
			return fail(403, { error: "Only presidents can appoint ministers" });
		}

		// Cannot appoint self
		if (account.id === params.id) {
			return fail(400, { error: "Cannot appoint yourself as minister" });
		}

		const formData = await request.formData();
		const ministry = formData.get("ministry") as string;

		if (!ministry) {
			return fail(400, { error: "Ministry is required" });
		}

		const validMinistries = ["economy", "defense", "foreign_affairs"];

		if (!validMinistries.includes(ministry)) {
			return fail(400, { error: "Invalid ministry" });
		}

		// Check if ministry is already occupied
		const existingMinister = await db.query.ministers.findFirst({
			where: and(eq(ministers.stateId, presidency.stateId), eq(ministers.ministry, ministry as any))
		});

		if (existingMinister) {
			return fail(400, { error: "This ministry is already occupied" });
		}

		// Check if user lives in the state
		const userResidence = await db
			.select({
				regionId: residences.regionId,
				stateId: regions.stateId
			})
			.from(residences)
			.leftJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(residences.userId, params.id))
			.limit(1);

		if (!userResidence.length || userResidence[0].stateId !== presidency.stateId) {
			return fail(400, { error: "User must be a resident of your state to be appointed" });
		}

		try {
			await db.insert(ministers).values({
				userId: params.id,
				stateId: presidency.stateId,
				ministry: ministry as any
			});

			return { success: true, message: `Successfully appointed as ${ministry.replace("_", " ")} minister` };
		} catch (error) {
			console.error("Error appointing minister:", error);
			return fail(500, { error: "Failed to appoint minister" });
		}
	},

	dismissMinister: async ({ request, params, locals }) => {
		const account = locals.account!;

		// Check if user is a president
		const presidency = await db.query.presidents.findFirst({
			where: eq(presidents.userId, account.id)
		});

		if (!presidency) {
			return fail(403, { error: "Only presidents can dismiss ministers" });
		}

		const formData = await request.formData();
		const ministerId = parseInt(formData.get("ministerId") as string);

		// Verify the minister belongs to the president's state
		const minister = await db.query.ministers.findFirst({
			where: eq(ministers.id, ministerId)
		});

		if (!minister || minister.stateId !== presidency.stateId) {
			return fail(403, { error: "Invalid minister" });
		}

		try {
			await db.delete(ministers).where(eq(ministers.id, ministerId));

			return { success: true, message: "Minister dismissed successfully" };
		} catch (error) {
			console.error("Error dismissing minister:", error);
			return fail(500, { error: "Failed to dismiss minister" });
		}
	}
};
