// src/routes/(authenticated)/(dock)/posts/subscribed/+page.server.ts
import { db } from "$lib/server/db";
import { articles, accounts, newspapers, upvotes, files, userProfiles, newspaperSubscriptions } from "$lib/server/schema";
import { eq, desc, sql, lt, inArray } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { json } from "@sveltejs/kit";

const PAGE_SIZE = 20;

async function fetchSubscribedArticles(cursor: string | null, accountId: string) {
    // Get user's subscribed newspaper IDs
    const subscriptions = await db
        .select({ newspaperId: newspaperSubscriptions.newspaperId })
        .from(newspaperSubscriptions)
        .where(eq(newspaperSubscriptions.userId, accountId));

    const subscribedIds = subscriptions.map(s => s.newspaperId);

    if (subscribedIds.length === 0) {
        return {
            articles: [],
            hasMore: false,
            nextCursor: null
        };
    }

    // Build the query
    let query = db
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
            upvoteCount: sql<number>`cast(count(${upvotes.id}) as int)`
        })
        .from(articles)
        .leftJoin(accounts, eq(articles.authorId, accounts.id))
        .leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
        .leftJoin(newspapers, eq(articles.newspaperId, newspapers.id))
        .leftJoin(upvotes, eq(articles.id, upvotes.articleId))
        .where(inArray(articles.newspaperId, subscribedIds))
        .groupBy(
            articles.id,
            articles.title,
            articles.content,
            articles.createdAt,
            articles.authorId,
            articles.newspaperId,
            userProfiles.name,
            userProfiles.logo,
            newspapers.name,
            newspapers.logo
        )
        .orderBy(desc(articles.createdAt))
        .limit(PAGE_SIZE + 1);

    // If cursor is provided, only fetch articles older than the cursor
    if (cursor) {
        const cursorDate = new Date(cursor);
        query = query.where(lt(articles.createdAt, cursorDate)) as any;
    }

    const articlesData = await query;

    // Check if there are more articles
    const hasMore = articlesData.length > PAGE_SIZE;
    const articlesToReturn = hasMore ? articlesData.slice(0, PAGE_SIZE) : articlesData;

    // Get signed URLs for logos
    const articlesWithUrls = await Promise.all(
        articlesToReturn.map(async (article) => {
            let authorLogo: string | null = null;
            let newspaperLogo: string | null = null;

            // Get newspaper logo
            if (article.newspaperId && article.newspaperLogoFileId) {
                const logoFile = await db.query.files.findFirst({
                    where: eq(files.id, article.newspaperLogoFileId)
                });
                if (logoFile) {
                    newspaperLogo = await getSignedDownloadUrl(logoFile.key);
                }
            }

            // Get author logo
            if (article.authorLogoFileId) {
                const logoFile = await db.query.files.findFirst({
                    where: eq(files.id, article.authorLogoFileId)
                });
                if (logoFile) {
                    authorLogo = await getSignedDownloadUrl(logoFile.key);
                }
            }

            return {
                id: article.id,
                title: article.title,
                content: article.content,
                createdAt: article.createdAt,
                authorId: article.authorId,
                authorName: article.authorName,
                authorLogo,
                newspaperId: article.newspaperId,
                newspaperName: article.newspaperName,
                newspaperLogo,
                upvoteCount: article.upvoteCount,
                own: accountId === article.authorId
            };
        })
    );

    // Calculate next cursor
    const nextCursor =
        hasMore && articlesToReturn.length > 0
            ? articlesToReturn[articlesToReturn.length - 1].createdAt.toISOString()
            : null;

    return {
        articles: articlesWithUrls,
        hasMore,
        nextCursor
    };
}

export const load: PageServerLoad = async ({ locals }) => {
    const account = locals.account!;

    const result = await fetchSubscribedArticles(null, account.id);

    // Get user's upvoted articles
    const upvotedArticles = await db
        .select({ articleId: upvotes.articleId })
        .from(upvotes)
        .where(eq(upvotes.userId, account.id));
    const userUpvotes = upvotedArticles.map((u) => u.articleId);

    return {
        ...result,
        userUpvotes
    };
};

export const actions = {
    loadMore: async ({ request, locals }) => {
        const account = locals.account!;
        const formData = await request.formData();
        const cursor = formData.get("cursor") as string | null;

        const result = await fetchSubscribedArticles(cursor, account.id);

        return json(result);
    }
} satisfies Actions;
