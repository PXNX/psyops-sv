// src/routes/(authenticated)/(dock)/user/[id]/career/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, articles } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	// Query account with profile, journalist positions, and articles
	const user = await db.query.accounts.findFirst({
		where: eq(accounts.id, params.id),
		with: {
			profile: true,
			journalists: {
				with: {
					newspaper: true
				}
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

	// Calculate career statistics
	const totalArticles = user.articles.length;
	const totalUpvotes = user.articles.reduce((sum, article) => sum + article.upvotes.length, 0);
	const newspaperCount = user.journalists.length;

	return {
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			name: user.profile?.name,
			avatar: user.profile?.avatar,
			bio: user.profile?.bio,
			createdAt: user.createdAt,
			// Career information
			newspapers: user.journalists.map((j) => ({
				id: j.newspaper.id,
				name: j.newspaper.name,
				avatar: j.newspaper.avatar,
				rank: j.rank,
				joinedAt: j.id // You might want to add a joinedAt timestamp to journalists table
			})),
			articles: user.articles.map((a) => ({
				id: a.id,
				title: a.title,
				newspaperName: a.newspaper.name,
				createdAt: a.createdAt,
				upvoteCount: a.upvotes.length
			})),
			stats: {
				totalArticles,
				totalUpvotes,
				newspaperCount,
				averageUpvotes: totalArticles > 0 ? Math.round(totalUpvotes / totalArticles) : 0
			}
		}
	};
};
