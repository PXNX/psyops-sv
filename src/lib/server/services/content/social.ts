// Social layer for posts: polls, comments and community karma. Karma is
// earned here; civilian reputation is computed separately from world opinion.
import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import {
	articles,
	commentVotes,
	comments,
	generalReports,
	pollVotes,
	polls,
	userProfiles
} from "#lib/server/schema.js";

export class SocialError extends Error {}

/** Community karma from community upvotes, never from civilian opinion. */
export async function adjustKarma(db: Database, userId: string, delta: number) {
	await db
		.update(userProfiles)
		.set({ karma: sql`${userProfiles.karma} + ${delta}` })
		.where(eq(userProfiles.accountId, userId));
}

export async function loadPoll(db: Database, articleId: number, userId?: string) {
	const [poll] = await db.select().from(polls).where(eq(polls.articleId, articleId));
	if (!poll) return null;
	const votes = await db.select({ optionIndex: pollVotes.optionIndex }).from(pollVotes).where(eq(pollVotes.pollId, poll.id));
	const counts = poll.options.map((_, i) => votes.filter((v) => v.optionIndex === i).length);
	return {
		id: poll.id,
		question: poll.question,
		options: poll.options,
		counts,
		total: votes.length,
		myVote: userId ? (await db.select().from(pollVotes).where(and(eq(pollVotes.pollId, poll.id), eq(pollVotes.userId, userId))).limit(1))[0]?.optionIndex ?? null : null,
		closed: poll.closesAt ? poll.closesAt.getTime() <= Date.now() : false
	};
}

export async function votePoll(db: Database, userId: string, pollId: number, optionIndex: number) {
	const [poll] = await db.select().from(polls).where(eq(polls.id, pollId));
	if (!poll) throw new SocialError("That poll does not exist.");
	if (poll.closesAt && poll.closesAt.getTime() <= Date.now()) throw new SocialError("That poll has closed.");
	if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length)
		throw new SocialError("Choose one of the options.");
	const [existing] = await db
		.select()
		.from(pollVotes)
		.where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
		.limit(1);
	if (existing) {
		await db.update(pollVotes).set({ optionIndex }).where(eq(pollVotes.id, existing.id));
	} else {
		await db.insert(pollVotes).values({ pollId, userId, optionIndex });
	}
}

export async function loadComments(db: Database, articleId: number, userId?: string) {
	const rows = await db
		.select({
			id: comments.id,
			content: comments.content,
			createdAt: comments.createdAt,
			authorId: comments.authorId,
			authorName: userProfiles.name,
			votes: sql<number>`cast(count(${commentVotes.id}) as int)`
		})
		.from(comments)
		.leftJoin(userProfiles, eq(comments.authorId, userProfiles.accountId))
		.leftJoin(commentVotes, eq(comments.id, commentVotes.commentId))
		.where(eq(comments.articleId, articleId))
		.groupBy(comments.id, userProfiles.name)
		.orderBy(desc(comments.createdAt))
		.limit(100);
	const mine = userId
		? new Set(
				(
					await db
						.select({ commentId: commentVotes.commentId })
						.from(commentVotes)
						.where(eq(commentVotes.userId, userId))
				).map((v) => v.commentId)
			)
		: new Set<number>();
	return rows.map((row) => ({ ...row, hasVoted: mine.has(row.id) }));
}

export async function addComment(db: Database, userId: string, articleId: number, raw: string) {
	const content = raw.trim();
	if (content.length < 2) throw new SocialError("Write a comment first.");
	if (content.length > 2000) throw new SocialError("Comments are limited to 2000 characters.");
	const [article] = await db.select({ authorId: articles.authorId }).from(articles).where(eq(articles.id, articleId));
	if (!article) throw new SocialError("That post does not exist.");
	const [row] = await db.insert(comments).values({ articleId, authorId: userId, content }).returning();
	return row!;
}

export async function toggleCommentVote(db: Database, userId: string, commentId: number) {
	const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
	if (!comment) throw new SocialError("That comment does not exist.");
	const [existing] = await db
		.select()
		.from(commentVotes)
		.where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, userId)))
		.limit(1);
	if (existing) {
		await db.delete(commentVotes).where(eq(commentVotes.id, existing.id));
		if (comment.authorId !== userId) await adjustKarma(db, comment.authorId, -1);
		return { voted: false };
	}
	await db.insert(commentVotes).values({ commentId, userId });
	if (comment.authorId !== userId) await adjustKarma(db, comment.authorId, 1);
	return { voted: true };
}

export async function reportComment(db: Database, userId: string, commentId: number, reason: string) {
	const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
	if (!comment) throw new SocialError("That comment does not exist.");
	await db.insert(generalReports).values({
		targetType: "comment",
		targetId: String(commentId),
		reporterId: userId,
		reason: reason.slice(0, 500) || "Reported by a reader"
	});
}
