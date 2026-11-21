// src/routes/(authenticated)/(dock)/posts/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import { articles, accounts, newspapers, upvotes, files, userProfiles, articleViews } from "#lib/server/schema.js";
import { eq, sql, and } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getLogoUrl, getSignedDownloadUrl } from "#lib/server/backblaze.js";
import { readingMinutes } from "#lib/server/services/content/article-text.js";
import { sanitizeArticleHtml } from "#lib/utils/safe-html.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const articleId = Number(params.id);
	if (!Number.isInteger(articleId)) throw error(404, "Article not found");

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
			newspaperLogoId: newspapers.logo,
			upvoteCount: sql<number>`cast(count(${upvotes.id}) as int)`
		})
		.from(articles)
		.leftJoin(accounts, eq(articles.authorId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.leftJoin(files, eq(userProfiles.logo, files.id))
		.leftJoin(newspapers, eq(articles.newspaperId, newspapers.id))
		.leftJoin(upvotes, eq(articles.id, upvotes.articleId))
		.where(eq(articles.id, articleId))
		.groupBy(articles.id, userProfiles.name, files.key, newspapers.name, newspapers.logo)
		.limit(1);

	if (!articleData) {
		throw error(404, "Article not found");
	}

	// Upvote check, view tracking and author logo are independent, so run them in parallel
	const [hasUpvoted, , authorLogo, newspaperLogo] = await Promise.all([
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

		articleData.authorLogoKey ? getSignedDownloadUrl(articleData.authorLogoKey) : null,

		articleData.newspaperId ? getLogoUrl(articleData.newspaperLogoId) : null
	]);

	return {
		article: {
			...articleData,
			// Never hand raw stored HTML to the browser — sanitise it here as
			// well as in SafeHtml, so even SSR output is safe.
			content: sanitizeArticleHtml(articleData.content),
			authorLogo,
			newspaperLogo,
			minutes: readingMinutes(articleData.content)
		},
		hasUpvoted,
		isAuthor: locals.account?.id === articleData.authorId
	};
};

export const actions: Actions = {
	upvote: async ({ locals, params }) => {
		const account = locals.account!;

		const articleId = Number(params.id);
		if (!Number.isInteger(articleId)) return fail(404, { error: "Article not found" });

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
