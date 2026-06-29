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
	governors,
	newspapers,
	journalists,
	generalReports,
	birthdayRewards,
	userWallets
} from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { fail } from "@sveltejs/kit";
import { eq, count, and, sql } from "drizzle-orm";
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
		return {
			userNotFound: true as const,
			userId: params.id
		};
	}

	const account = locals.account!;

	// Get user's current residence
	const [residence] = await db
		.select({
			id: residences.id,
			movedInAt: residences.movedInAt,
			regionChangedAt: residences.regionChangedAt,
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

	// Get user's home (citizenship/residence) region
	let homeRegionData: { regionId: number; stateId: number | null; stateName: string | null; stateLogo: number | null; homeRegionChangedAt: Date } | null = null;
	const [residenceRow] = await db
		.select({ homeRegionId: residences.homeRegionId, homeRegionChangedAt: residences.homeRegionChangedAt })
		.from(residences)
		.where(eq(residences.userId, params.id))
		.limit(1);

	if (residenceRow) {
		const [homeRegionResult] = await db
			.select({
				regionId: regions.id,
				stateId: states.id,
				stateName: states.name,
				stateLogo: states.logo,
			})
			.from(regions)
			.leftJoin(states, eq(regions.stateId, states.id))
			.where(eq(regions.id, residenceRow.homeRegionId))
			.limit(1);
		homeRegionData = homeRegionResult ? { ...homeRegionResult, homeRegionChangedAt: residenceRow.homeRegionChangedAt } : null;
	}

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

	// Get newspapers owned by current user (for add author feature)
	// Birthday reward calculation
	const BIRTHDAY_REWARD_AMOUNT = 10000;
	const now = new Date();
	const createdAt = new Date(user.createdAt);
	// Calculate how many full years the account has existed
	const totalYears = Math.floor(
		(now.getTime() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
	);
	// Get already collected birthday rewards
	const collectedRewards = await db
		.select({ year: birthdayRewards.year })
		.from(birthdayRewards)
		.where(eq(birthdayRewards.userId, params.id));
	const collectedYears = new Set(collectedRewards.map((r) => r.year));
	// Determine uncollected years (1-based: year 1 = first anniversary)
	const uncollectedYears: number[] = [];
	for (let y = 1; y <= totalYears; y++) {
		if (!collectedYears.has(y)) {
			uncollectedYears.push(y);
		}
	}
	const birthdayRewardTotal = uncollectedYears.length * BIRTHDAY_REWARD_AMOUNT;
	// Check if today is the account's birthday (same month+day)
	const isBirthday =
		now.getMonth() === createdAt.getMonth() && now.getDate() === createdAt.getDate();

	let ownedNewspapers: Array<{ id: number; name: string }> = [];
	if (account.id !== params.id) {
		const journalistRecords = await db.query.journalists.findMany({
			where: and(eq(journalists.userId, account.id), eq(journalists.rank, "owner")),
			with: {
				newspaper: true
			}
		});

		ownedNewspapers = journalistRecords.map((j) => ({
			id: j.newspaper.id,
			name: j.newspaper.name
		}));
	}

	return {
		userNotFound: false as const,
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
					regionChangedAt: residence.regionChangedAt,
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
		homeRegion: homeRegionData
			? {
					id: homeRegionData.regionId,
					name: getRegionName(homeRegionData.regionId),
					logo: "/coats/" + homeRegionData.regionId + ".svg",
					changedAt: homeRegionData.homeRegionChangedAt,
					state: {
						id: homeRegionData.stateId,
						name: homeRegionData.stateName,
						logo: homeRegionData.stateLogo
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
			: null,
		ownedNewspapers,
		account,
		birthdayInfo: {
			isBirthday,
			totalYears,
			uncollectedYears,
			rewardTotal: birthdayRewardTotal,
			rewardPerYear: BIRTHDAY_REWARD_AMOUNT
		}
	};
};

export const actions: Actions = {
	collectBirthday: async ({ params, locals }) => {
		const account = locals.account!;
		// Only the profile owner can collect their own birthday reward
		if (account.id !== params.id) {
			return fail(403, { error: "You can only collect your own birthday reward" });
		}
		const BIRTHDAY_REWARD_AMOUNT = 10000;
		const user = await db.query.accounts.findFirst({ where: eq(accounts.id, params.id) });
		if (!user) return fail(404, { error: "User not found" });
		const now = new Date();
		const createdAt = new Date(user.createdAt);
		const totalYears = Math.floor(
			(now.getTime() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
		);
		if (totalYears < 1) {
			return fail(400, { error: "No birthday reward available yet" });
		}
		const collectedRewards = await db
			.select({ year: birthdayRewards.year })
			.from(birthdayRewards)
			.where(eq(birthdayRewards.userId, params.id));
		const collectedYears = new Set(collectedRewards.map((r) => r.year));
		const uncollectedYears: number[] = [];
		for (let y = 1; y <= totalYears; y++) {
			if (!collectedYears.has(y)) uncollectedYears.push(y);
		}
		if (uncollectedYears.length === 0) {
			return fail(400, { error: "All birthday rewards have already been collected" });
		}
		const totalReward = uncollectedYears.length * BIRTHDAY_REWARD_AMOUNT;
		try {
			await db.transaction(async (tx) => {
				// Mark all uncollected years as collected
				for (const year of uncollectedYears) {
					await tx.insert(birthdayRewards).values({ userId: params.id, year });
				}
				// Add currency to wallet
				const existingWallet = await tx.query.userWallets.findFirst({
					where: eq(userWallets.userId, params.id)
				});
				if (existingWallet) {
					await tx
						.update(userWallets)
						.set({ balance: sql`${userWallets.balance} + ${totalReward}` })
						.where(eq(userWallets.userId, params.id));
				} else {
					await tx.insert(userWallets).values({
						userId: params.id,
						balance: 10000 + totalReward
					});
				}
			});
			return { success: true, message: `Happy Birthday! You collected ${totalReward.toLocaleString()} currency!` };
		} catch (err) {
			console.error("Error collecting birthday reward:", err);
			return fail(500, { error: "Failed to collect birthday reward" });
		}
	},
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

		// Check if user is a citizen (residence) of the state
		const userResidence = await db
			.select({
				homeRegionId: residences.homeRegionId,
				homeStateId: regions.stateId
			})
			.from(residences)
			.leftJoin(regions, eq(residences.homeRegionId, regions.id))
			.where(eq(residences.userId, params.id))
			.limit(1);

		if (!userResidence.length || userResidence[0].homeStateId !== presidency.stateId) {
			return fail(400, { error: "User must be a citizen of your state to be appointed" });
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
	},

	reportAccount: async ({ request, params, locals }) => {
		const account = locals.account!;

		// Cannot report self
		if (account.id === params.id) {
			return fail(400, { error: "Cannot report yourself" });
		}

		const formData = await request.formData();
		const reason = formData.get("reason") as string;
		const violationType = formData.get("violationType") as string;

		if (!reason || reason.length < 10) {
			return fail(400, { error: "Please provide a detailed reason (at least 10 characters)" });
		}

		if (reason.length > 500) {
			return fail(400, { error: "Reason must be less than 500 characters" });
		}

		const validViolationTypes = [
			"insult",
			"spam",
			"pornography",
			"hate_speech",
			"graphic_violence",
			"privacy_violation",
			"other"
		];

		if (!validViolationTypes.includes(violationType)) {
			return fail(400, { error: "Invalid violation type" });
		}

		try {
			await db.insert(generalReports).values({
				targetType: "account",
				targetId: params.id,
				reporterId: account.id,
				reason,
				violationType: violationType as any,
				status: "pending"
			});

			return {
				success: true,
				message: "Report submitted successfully. Thank you for helping keep our community safe."
			};
		} catch (error) {
			console.error("Error submitting report:", error);
			return fail(500, { error: "Failed to submit report" });
		}
	},

	addAuthor: async ({ request, params, locals }) => {
		const account = locals.account!;

		// Cannot add self
		if (account.id === params.id) {
			return fail(400, { error: "Cannot add yourself as an author" });
		}

		const formData = await request.formData();
		const newspaperId = parseInt(formData.get("newspaperId") as string);
		const rank = formData.get("rank") as string;

		if (!newspaperId) {
			return fail(400, { error: "Newspaper is required" });
		}

		const validRanks = ["author", "editor"];
		if (!validRanks.includes(rank)) {
			return fail(400, { error: "Invalid rank" });
		}

		// Verify ownership
		const ownership = await db.query.journalists.findFirst({
			where: and(
				eq(journalists.newspaperId, newspaperId),
				eq(journalists.userId, account.id),
				eq(journalists.rank, "owner")
			)
		});

		if (!ownership) {
			return fail(403, { error: "You don't own this newspaper" });
		}

		// Check if user is already an author/editor
		const existingJournalist = await db.query.journalists.findFirst({
			where: and(eq(journalists.newspaperId, newspaperId), eq(journalists.userId, params.id))
		});

		if (existingJournalist) {
			return fail(400, { error: "This user is already a journalist at this newspaper" });
		}

		try {
			await db.insert(journalists).values({
				userId: params.id,
				newspaperId,
				rank: rank as any
			});

			return { success: true, message: `Successfully added as ${rank}` };
		} catch (error) {
			console.error("Error adding author:", error);
			return fail(500, { error: "Failed to add author" });
		}
	}
};
