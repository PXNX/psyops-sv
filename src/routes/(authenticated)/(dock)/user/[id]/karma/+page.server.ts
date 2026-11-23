// src/routes/(authenticated)/(dock)/user/[id]/karma/+page.server.ts
// Where a player's community karma came from. Karma is a stored counter, so we
// show it as the authoritative total alongside the live vote rows that feed it.
import { error } from "@sveltejs/kit";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	accounts,
	articles,
	commentVotes,
	comments,
	upvotes,
	userProfiles
} from "#lib/server/schema.js";

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.id;

	const [profile] = await db
		.select({
			id: accounts.id,
			name: userProfiles.name,
			logo: userProfiles.logo,
			karma: userProfiles.karma
		})
		.from(accounts)
		.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
		.where(eq(accounts.id, userId))
		.limit(1);
	if (!profile) error(404, "User not found");

	// Self-votes never awarded karma, so exclude them everywhere.
	const [articleTotals, commentTotals, topArticles, topComments] = await Promise.all([
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(upvotes)
			.innerJoin(articles, eq(upvotes.articleId, articles.id))
			.where(and(eq(articles.authorId, userId), sql`${upvotes.userId} <> ${articles.authorId}`)),
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(commentVotes)
			.innerJoin(comments, eq(commentVotes.commentId, comments.id))
			.where(and(eq(comments.authorId, userId), sql`${commentVotes.userId} <> ${comments.authorId}`)),
		db
			.select({
				id: articles.id,
				title: articles.title,
				createdAt: articles.createdAt,
				votes: sql<number>`count(${upvotes.id}) filter (where ${upvotes.userId} <> ${articles.authorId})::int`
			})
			.from(articles)
			.leftJoin(upvotes, eq(upvotes.articleId, articles.id))
			.where(eq(articles.authorId, userId))
			.groupBy(articles.id)
			.orderBy(desc(sql`count(${upvotes.id}) filter (where ${upvotes.userId} <> ${articles.authorId})`))
			.limit(25),
		db
			.select({
				id: comments.id,
				content: comments.content,
				createdAt: comments.createdAt,
				articleId: articles.id,
				articleTitle: articles.title,
				votes: sql<number>`count(${commentVotes.id}) filter (where ${commentVotes.userId} <> ${comments.authorId})::int`
			})
			.from(comments)
			.leftJoin(articles, eq(articles.id, comments.articleId))
			.leftJoin(commentVotes, eq(commentVotes.commentId, comments.id))
			.where(eq(comments.authorId, userId))
			.groupBy(comments.id, articles.id, articles.title)
			.orderBy(desc(sql`count(${commentVotes.id}) filter (where ${commentVotes.userId} <> ${comments.authorId})`))
			.limit(25)
	]);

	const articleVotes = Number(articleTotals[0]?.total ?? 0);
	const votesOnComments = Number(commentTotals[0]?.total ?? 0);

	return {
		user: {
			id: profile.id,
			name: profile.name,
			logo: await getLogoUrl(profile.logo)
		},
		karma: profile.karma ?? 0,
		articleVotes,
		votesOnComments,
		articles: topArticles.map((a) => ({
			id: a.id,
			title: a.title,
			createdAt: a.createdAt.toISOString(),
			votes: Number(a.votes ?? 0)
		})),
		comments: topComments.map((c) => ({
			id: c.id,
			content: c.content,
			createdAt: c.createdAt.toISOString(),
			articleId: c.articleId,
			articleTitle: c.articleTitle,
			votes: Number(c.votes ?? 0)
		}))
	};
};
