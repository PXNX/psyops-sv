// src/routes/(authenticated)/(dock)/user/[id]/career/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, articles, journalists, userMedals, presidents, files } from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { error } from "@sveltejs/kit";
import { desc, eq, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;

	// Query account with all career-related data
	const user = await db.query.accounts.findFirst({
		where: eq(accounts.id, params.id),
		with: {
			profile: true,
			journalists: {
				with: {
					newspaper: true
				},
				orderBy: [desc(journalists.id)]
			},
			articles: {
				orderBy: [desc(articles.createdAt)],
				with: {
					newspaper: true,
					upvotes: true
				}
			}
		}
	});

	if (!user) {
		error(404, "User not found");
	}

	// Get user medals
	const medals = await db.query.userMedals.findMany({
		where: eq(userMedals.userId, params.id),
		with: {
			awardedByUser: {
				with: {
					profile: true
				}
			},
			state: true
		},
		orderBy: [desc(userMedals.awardedAt)]
	});

	// Get user profile logo if exists
	let logoUrl: string | null = null;
	if (user.profile?.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, user.profile.logo)
		});
		if (logoFile) {
			logoUrl = await getSignedDownloadUrl(logoFile.key);
		}
	}

	// Get newspaper logos
	const newspaperLogos = new Map<number, string>();
	for (const journalist of user.journalists) {
		if (journalist.newspaper.logo) {
			const logoFile = await db.query.files.findFirst({
				where: eq(files.id, journalist.newspaper.logo)
			});
			if (logoFile) {
				newspaperLogos.set(journalist.newspaper.id, await getSignedDownloadUrl(logoFile.key));
			}
		}
	}

	// Calculate career statistics
	const totalArticles = user.articles.length;
	const totalUpvotes = user.articles.reduce((sum, article) => sum + article.upvotes.length, 0);
	const newspaperCount = user.journalists.length;

	// Group journalists by newspaper with their positions
	const newspaperPositions = user.journalists.reduce(
		(acc, j) => {
			const existing = acc.find((n) => n.newspaperId === j.newspaper.id);
			if (existing) {
				existing.positions.push({
					rank: j.rank
				});
			} else {
				acc.push({
					newspaperId: j.newspaper.id,
					newspaperName: j.newspaper.name,
					newspaperLogo: newspaperLogos.get(j.newspaper.id) || null,
					newspaperBackground: j.newspaper.background,
					positions: [
						{
							rank: j.rank
						}
					]
				});
			}
			return acc;
		},
		[] as Array<{
			newspaperId: number;
			newspaperName: string;
			newspaperLogo: string | null;
			newspaperBackground: string | null;
			positions: Array<{ rank: string }>;
		}>
	);

	// Check if current user can award medals
	let canAwardMedal = false;
	let hasAwardedThisMonth = false;
	if (account) {
		const presidency = await db.query.presidents.findFirst({
			where: eq(presidents.userId, account.id)
		});

		if (presidency) {
			canAwardMedal = true;

			// Check if already awarded this month
			const startOfMonth = new Date();
			startOfMonth.setDate(1);
			startOfMonth.setHours(0, 0, 0, 0);

			const thisMonthAwards = await db.query.userMedals.findFirst({
				where: and(
					eq(userMedals.awardedBy, account.id)
					// Add date comparison here if needed
				)
			});

			if (thisMonthAwards && new Date(thisMonthAwards.awardedAt) >= startOfMonth) {
				hasAwardedThisMonth = true;
			}
		}
	}

	return {
		user: {
			id: user.id,
			name: user.profile?.name,
			logo: logoUrl,
			bio: user.profile?.bio,
			createdAt: user.createdAt
		},
		career: {
			newspaperPositions,
			medals: medals.map((m) => ({
				id: m.id,
				medalType: m.medalType,
				reason: m.reason,
				awardedAt: m.awardedAt,
				awardedBy: {
					name: m.awardedByUser.profile?.name || "Unknown",
					logo: null // Can be enhanced later
				},
				stateName: m.state.name
			})),
			stats: {
				totalArticles,
				totalUpvotes,
				newspaperCount,
				averageUpvotes: totalArticles > 0 ? Math.round(totalUpvotes / totalArticles) : 0,
				medalCount: medals.length
			}
		},
		canAwardMedal: canAwardMedal && !hasAwardedThisMonth && account?.id !== params.id,
		isOwnProfile: account?.id === params.id
	};
};
