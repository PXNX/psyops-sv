// src/routes/(authenticated)/(dock)/newspaper/[id]/statistics/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers, newspaperSubscriptions, articles, articleViews, upvotes } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { and, eq, gte, sql, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const newspaperId = parseInt(params.id);
    const account = locals.account;

    if (!account) {
        throw error(401, "Unauthorized");
    }

    // Check if current user is owner or editor
    const membership = await db.query.journalists.findFirst({
        where: and(eq(journalists.userId, account.id), eq(journalists.newspaperId, newspaperId))
    });

    if (!membership || (membership.rank !== "owner" && membership.rank !== "editor")) {
        throw error(403, "Only newspaper owners and editors can view statistics");
    }

    // Get newspaper details
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId)
    });

    if (!newspaper) {
        throw error(404, "Newspaper not found");
    }

    // Get total subscriber count
    const [subscriberCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(newspaperSubscriptions)
        .where(eq(newspaperSubscriptions.newspaperId, newspaperId));

    // Get subscriber growth over time (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const subscriberGrowth = await db
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
        .orderBy(sql`DATE(${newspaperSubscriptions.subscribedAt})`);

    // Calculate cumulative growth
    let cumulative = (subscriberCount?.count || 0) - subscriberGrowth.reduce((sum, day) => sum + day.count, 0);
    const cumulativeGrowth = subscriberGrowth.map((day) => {
        cumulative += day.count;
        return {
            date: day.date,
            count: cumulative
        };
    });

    // Get total article views
    const articleIds = await db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.newspaperId, newspaperId));

    const articleIdList = articleIds.map((a) => a.id);

    let totalViews = 0;
    let totalLikes = 0;
    let viewsOverTime: { date: string; count: number }[] = [];

    if (articleIdList.length > 0) {
        // Get total views using inArray instead of ANY
        const viewCountResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(articleViews)
            .where(sql`${articleViews.articleId} IN (${sql.join(articleIdList.map(id => sql`${id}`), sql`, `)})`)
            .execute();
        totalViews = viewCountResult[0]?.count || 0;

        // Get total likes using inArray instead of ANY
        const likeCountResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(upvotes)
            .where(sql`${upvotes.articleId} IN (${sql.join(articleIdList.map(id => sql`${id}`), sql`, `)})`)
            .execute();
        totalLikes = likeCountResult[0]?.count || 0;

        // Get views over time (last 30 days)
        viewsOverTime = await db
            .select({
                date: sql<string>`DATE(${articleViews.viewedAt})`,
                count: sql<number>`count(*)::int`
            })
            .from(articleViews)
            .where(
                and(
                    sql`${articleViews.articleId} IN (${sql.join(articleIdList.map(id => sql`${id}`), sql`, `)})`,
                    gte(articleViews.viewedAt, thirtyDaysAgo)
                )
            )
            .groupBy(sql`DATE(${articleViews.viewedAt})`)
            .orderBy(sql`DATE(${articleViews.viewedAt})`)
            .execute();
    }

    // Get article performance stats
    const articleStats = await db
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
        .limit(10);

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
