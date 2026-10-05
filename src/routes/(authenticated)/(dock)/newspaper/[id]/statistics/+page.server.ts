// src/routes/(authenticated)/(dock)/newspaper/[id]/statistics/+page.server.ts
import { db } from "#lib/server/db.js";
import {
	journalists,
	newspapers,
	newspaperSubscriptions,
	articles,
	articleViews,
	upvotes
} from "#lib/server/schema.js";
import { error } from "@sveltejs/kit";
import { and, eq, gte, sql, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const newspaperId = parseInt(params.id);
	const account = locals.account;

	if (!account) {
		throw error(401, "Unauthorized");
	}

	// Membership and newspaper lookups run in parallel; each check fails as soon as its inputs resolve
	const membershipCheck = db.query.journalists
		.findFirst({
			where: and(eq(journalists.userId, account.id), eq(journalists.newspaperId, newspaperId))
		})
		.then((membership) => {
			// Check if current user is owner or editor
			if (!membership || (membership.rank !== "owner" && membership.rank !== "editor")) {
				error(403, "Only newspaper owners and editors can view statistics");
			}
		});

	const [, newspaper] = await Promise.all([
		membershipCheck,
		// Get newspaper details (403 takes precedence)
		Promise.all([
			membershipCheck,
			db.query.newspapers.findFirst({
				where: eq(newspapers.id, newspaperId)
			})
		]).then(([, n]) => n ?? error(404, "Newspaper not found"))
	]);

	// Get subscriber growth over time (last 30 days, grouped by day)
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Get total article views, likes and views over time
	const articleTotalsPromise = (async () => {
		const articleIds = await db.select({ id: articles.id }).from(articles).where(eq(articles.newspaperId, newspaperId));

		const articleIdList = articleIds.map((a) => a.id);

		if (articleIdList.length === 0) {
			return { totalViews: 0, totalLikes: 0, viewsOverTime: [] as { date: string; count: number }[] };
		}

		const [viewCountResult, likeCountResult, viewsOverTime] = await Promise.all([
			// Get total views using inArray instead of ANY
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(articleViews)
				.where(
					sql`${articleViews.articleId} IN (${sql.join(
						articleIdList.map((id) => sql`${id}`),
						sql`, `
					)})`
				)
				.execute(),
			// Get total likes using inArray instead of ANY
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(upvotes)
				.where(
					sql`${upvotes.articleId} IN (${sql.join(
						articleIdList.map((id) => sql`${id}`),
						sql`, `
					)})`
				)
				.execute(),
			// Get views over time (last 30 days)
			db
				.select({
					date: sql<string>`DATE(${articleViews.viewedAt})`,
					count: sql<number>`count(*)::int`
				})
				.from(articleViews)
				.where(
					and(
						sql`${articleViews.articleId} IN (${sql.join(
							articleIdList.map((id) => sql`${id}`),
							sql`, `
						)})`,
						gte(articleViews.viewedAt, thirtyDaysAgo)
					)
				)
				.groupBy(sql`DATE(${articleViews.viewedAt})`)
				.orderBy(sql`DATE(${articleViews.viewedAt})`)
				.execute()
		]);

		return {
			totalViews: viewCountResult[0]?.count || 0,
			totalLikes: likeCountResult[0]?.count || 0,
			viewsOverTime
		};
	})();

	const [[subscriberCount], subscriberGrowth, { totalViews, totalLikes, viewsOverTime }, articleStats] =
		await Promise.all([
			// Get total subscriber count
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(newspaperSubscriptions)
				.where(eq(newspaperSubscriptions.newspaperId, newspaperId)),
			db
				.select({
					date: sql<string>`DATE(${newspaperSubscriptions.subscribedAt})`,
					count: sql<number>`count(*)::int`
				})
				.from(newspaperSubscriptions)
				.where(
					and(
						eq(newspaperSubscriptions.newspaperId, newspaperId),
						gte(newspaperSubscriptions.subscribedAt, thirtyDaysAgo)
					)
				)
				.groupBy(sql`DATE(${newspaperSubscriptions.subscribedAt})`)
				.orderBy(sql`DATE(${newspaperSubscriptions.subscribedAt})`),
			articleTotalsPromise,
			// Get article performance stats
			db
				.select({
					id: articles.id,
					title: articles.title,
					createdAt: articles.createdAt,
					views: sql<number>`(SELECT count(*)::int FROM ${articleViews} WHERE ${articleViews.articleId} = ${articles.id})`,
					likes: sql<number>`(SELECT count(*)::int FROM ${upvotes} WHERE ${upvotes.articleId} = ${articles.id})`
				})
				.from(articles)
				.where(eq(articles.newspaperId, newspaperId))
				.orderBy(desc(articles.createdAt))
				.limit(10)
		]);

	// Calculate cumulative growth
	let cumulative = (subscriberCount?.count || 0) - subscriberGrowth.reduce((sum, day) => sum + day.count, 0);
	const cumulativeGrowth = subscriberGrowth.map((day) => {
		cumulative += day.count;
		return {
			date: day.date,
			count: cumulative
		};
	});

	return {
		newspaper: {
			id: newspaper.id,
			name: newspaper.name
		},
		stats: {
			totalSubscribers: subscriberCount?.count || 0,
			totalViews,
			totalLikes,
			subscriberGrowth: cumulativeGrowth,
			viewsOverTime,
			topArticles: articleStats.map((article) => ({
				id: article.id,
				title: article.title,
				publishDate: article.createdAt,
				views: article.views,
				likes: article.likes
			}))
		}
	};
};
