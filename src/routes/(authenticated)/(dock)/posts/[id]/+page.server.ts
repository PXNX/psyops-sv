// src/routes/(authenticated)/(fullscreen)/posts/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import { articles, accounts, newspapers, upvotes, files, userProfiles, articleViews } from "#lib/server/schema.js";
import { eq, sql, and } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getSignedDownloadUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const articleId = parseInt(params.id);

	const [articleData] = await db
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
		.where(eq(articles.id, articleId))
		.groupBy(articles.id, userProfiles.name, files.key, newspapers.name)
		.limit(1);

	if (!articleData) {
		throw error(404, "Article not found");
	}

	// Upvote check, view tracking and author logo are independent, so run them in parallel
	const [hasUpvoted, , authorLogo] = await Promise.all([
		// Check if user has upvoted
		(async () => {
			if (!locals.account) return false;
			const [upvote] = await db
				.select()
				.from(upvotes)
				.where(and(eq(upvotes.userId, locals.account.id), eq(upvotes.articleId, articleId)))
				.limit(1);
			return !!upvote;
		})(),

		// Track article view
		// Only track if user is not the author
		(async () => {
			if (!locals.account || locals.account.id !== articleData.authorId) {
				await db.insert(articleViews).values({
					articleId,
					userId: locals.account?.id || null
				});
			}
		})(),

		articleData.authorLogoKey ? getSignedDownloadUrl(articleData.authorLogoKey) : null
	]);

	return {
		article: {
			...articleData,
			authorLogo
		},
		hasUpvoted,
		isAuthor: locals.account?.id === articleData.authorId
	};
};

export const actions: Actions = {
	upvote: async ({ locals, params }) => {
		const account = locals.account!;

		const articleId = parseInt(params.id);

		try {
			// Check if already upvoted
			const [existing] = await db
				.select()
				.from(upvotes)
				.where(and(eq(upvotes.userId, account.id), eq(upvotes.articleId, articleId)))
				.limit(1);

			if (existing) {
				// Remove upvote
				await db.delete(upvotes).where(and(eq(upvotes.userId, account.id), eq(upvotes.articleId, articleId)));
				return { success: true, upvoted: false };
			} else {
				// Add upvote
				await db.insert(upvotes).values({
					userId: account.id,
					articleId
				});
				return { success: true, upvoted: true };
			}
		} catch (err) {
			console.error("Upvote error:", err);
			return fail(500, { error: "Failed to process upvote" });
		}
	}
};
