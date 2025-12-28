// src/routes/(authenticated)/(fullscreen)/posts/+page.server.ts
import { db } from "$lib/server/db";
import { articles, accounts, newspapers, upvotes, files, userProfiles } from "$lib/server/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ locals }) => {
	// Query articles with author info and upvote counts
	const articlesData = await db
		.select({
			id: articles.id,
			title: articles.title,
			content: articles.content,
			createdAt: articles.createdAt,
			authorId: articles.authorId,
			authorName: userProfiles.name,
			authorLogoKey: files.key,
			newspaperId: articles.newspaperId,
			newspaperName: newspapers.name,
			upvoteCount: sql<number>`cast(count(${upvotes.id}) as int)`
		})
		.from(articles)
		.leftJoin(accounts, eq(articles.authorId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.leftJoin(files, eq(userProfiles.logo, files.id))
		.leftJoin(newspapers, eq(articles.newspaperId, newspapers.id))
		.leftJoin(upvotes, eq(articles.id, upvotes.articleId))
		.groupBy(articles.id, userProfiles.name, files.key, newspapers.name)
		.orderBy(desc(articles.createdAt))
		.limit(50);

	// Get signed URLs for logos
	const articlesWithUrls = await Promise.all(
		articlesData.map(async (article) => ({
			...article,
			authorLogo: article.authorLogoKey ? await getSignedDownloadUrl(article.authorLogoKey) : null
		}))
	);

	// Get user's upvoted articles if logged in
	let userUpvotes: number[] = [];
	if (locals.account) {
		const upvotedArticles = await db
			.select({ articleId: upvotes.articleId })
			.from(upvotes)
			.where(eq(upvotes.userId, locals.account.id));
		userUpvotes = upvotedArticles.map((u) => u.articleId);
	}

	return {
		articles: articlesWithUrls,
		userUpvotes
	};
};
