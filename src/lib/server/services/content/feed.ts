// Article feeds (all posts, or only subscribed newspapers), paged by a
// createdAt cursor: each page holds articles older than the last one seen.
import { and, desc, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import { db } from "#lib/server/db.js";
import {
	accounts,
	articles,
	comments,
	files,
	newspaperSubscriptions,
	newspapers,
	upvotes,
	userProfiles
} from "#lib/server/schema.js";
import { getSignedDownloadUrl } from "#lib/server/backblaze.js";
import { coverImage, excerpt, readingMinutes } from "#lib/server/services/content/article-text.js";

export const FEED_PAGE_SIZE = 20;

async function logoUrl(fileId: number | null): Promise<string | null> {
	if (!fileId) return null;
	const file = await db.query.files.findFirst({ where: eq(files.id, fileId) });
	return file ? getSignedDownloadUrl(file.key) : null;
}

export async function fetchFeed(
	accountId: string,
	opts: { cursor?: string | null; subscribed?: boolean; limit?: number } = {}
) {
	const conditions: SQL[] = [];
	const pageSize = opts.limit && opts.limit > 0 ? Math.min(opts.limit, FEED_PAGE_SIZE) : FEED_PAGE_SIZE;

	if (opts.subscribed) {
		const subscriptions = await db
			.select({ newspaperId: newspaperSubscriptions.newspaperId })
			.from(newspaperSubscriptions)
			.where(eq(newspaperSubscriptions.userId, accountId));
		if (subscriptions.length === 0) return { articles: [], hasMore: false, nextCursor: null };
		conditions.push(
			inArray(
				articles.newspaperId,
				subscriptions.map((s) => s.newspaperId)
			)
		);
	}
	if (opts.cursor) {
		const cursorDate = new Date(opts.cursor);
		if (!Number.isNaN(cursorDate.getTime())) conditions.push(lt(articles.createdAt, cursorDate));
	}

	const rows = await db
		.select({
			id: articles.id,
			title: articles.title,
			content: articles.content,
			createdAt: articles.createdAt,
			authorId: articles.authorId,
			authorName: userProfiles.name,
			authorLogoFileId: userProfiles.logo,
			newspaperId: articles.newspaperId,
			newspaperName: newspapers.name,
			newspaperLogoFileId: newspapers.logo,
			upvoteCount: sql<number>`cast(count(${upvotes.id}) as int)`,
			commentCount: sql<number>`cast((select count(*) from ${comments} where ${comments.articleId} = ${articles.id}) as int)`
		})
		.from(articles)
		.leftJoin(accounts, eq(articles.authorId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.leftJoin(newspapers, eq(articles.newspaperId, newspapers.id))
		.leftJoin(upvotes, eq(articles.id, upvotes.articleId))
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(articles.id, userProfiles.name, userProfiles.logo, newspapers.name, newspapers.logo)
		.orderBy(desc(articles.createdAt))
		.limit(pageSize + 1); // one extra tells us whether there's a next page

	const hasMore = rows.length > pageSize;
	const page = hasMore ? rows.slice(0, pageSize) : rows;

	const items = await Promise.all(
		page.map(async (a) => {
			const [newspaperLogo, authorLogo] = await Promise.all([
				a.newspaperId ? logoUrl(a.newspaperLogoFileId) : null,
				logoUrl(a.authorLogoFileId)
			]);
			return {
				id: a.id,
				title: a.title,
				excerpt: excerpt(a.content, 180),
				cover: coverImage(a.content),
				minutes: readingMinutes(a.content),
				createdAt: a.createdAt,
				authorId: a.authorId,
				authorName: a.authorName,
				authorLogo,
				newspaperId: a.newspaperId,
				newspaperName: a.newspaperName,
				newspaperLogo,
				upvoteCount: a.upvoteCount,
				commentCount: a.commentCount,
				own: accountId === a.authorId
			};
		})
	);

	return {
		articles: items,
		hasMore,
		nextCursor: hasMore && page.length ? page[page.length - 1].createdAt.toISOString() : null
	};
}

export type FeedArticle = Awaited<ReturnType<typeof fetchFeed>>["articles"][number];
