// src/routes/(authenticated)/(dock)/user/[id]/career/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, articles, journalists } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	// Query account with all career-related data
	const user = await db.query.accounts.findFirst({
		where: eq(accounts.id, params.id),
		with: {
			profile: true,
			journalists: {
				with: {
					newspaper: true
				},
				orderBy: [desc(journalists.id)] // Most recent first
			},
			articles: {
				orderBy: [desc(articles.createdAt)],
				with: {
					newspaper: true,
					upvotes: true
				},
				limit: 10 // Show recent articles
			}
		}
	});

	if (!user) {
		error(404, "User not found");
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
					rank: j.rank,
					joinedAt: j.id
				});
			} else {
				acc.push({
					newspaperId: j.newspaper.id,
					newspaperName: j.newspaper.name,
					newspaperAvatar: j.newspaper.avatar,
					newspaperBackground: j.newspaper.background,
					positions: [
						{
							rank: j.rank,
							joinedAt: j.id
						}
					]
				});
			}
			return acc;
		},
		[] as Array<{
			newspaperId: string;
			newspaperName: string;
			newspaperAvatar: string | null;
			newspaperBackground: string | null;
			positions: Array<{ rank: string; joinedAt: string }>;
		}>
	);

	// Find most prolific newspaper (where user wrote most articles)
	const articlesByNewspaper = user.articles.reduce(
		(acc, article) => {
			acc[article.newspaperId] = (acc[article.newspaperId] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	const mostActiveNewspaper = Object.entries(articlesByNewspaper).sort(([, a], [, b]) => b - a)[0];

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
		career: {
			newspaperPositions,
			recentArticles: user.articles.map((a) => ({
				id: a.id,
				title: a.title,
				newspaperName: a.newspaper.name,
				newspaperId: a.newspaper.id,
				createdAt: a.createdAt,
				upvoteCount: a.upvotes.length
			})),
			stats: {
				totalArticles,
				totalUpvotes,
				newspaperCount,
				averageUpvotes: totalArticles > 0 ? Math.round(totalUpvotes / totalArticles) : 0,
				mostActiveNewspaperId: mostActiveNewspaper?.[0],
				mostActiveNewspaperCount: mostActiveNewspaper?.[1] || 0
			}
		}
	};
};
