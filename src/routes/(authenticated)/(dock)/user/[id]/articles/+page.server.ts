// src/routes/(authenticated)/(dock)/user/[id]/articles/+page.server.ts
import { db } from "$lib/server/db";
import { articles, newspapers, upvotes, accounts, userProfiles, files } from "$lib/server/schema";
import { eq, desc, asc, sql, count, and, like, inArray } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const userId = params.id; // This is a string (text type in DB)

	const sortBy = (url.searchParams.get("sort") || "date") as "date" | "rating";
	const sortOrder = (url.searchParams.get("order") || "desc") as "asc" | "desc";
	const searchQuery = url.searchParams.get("q") || "";
	const currentPage = parseInt(url.searchParams.get("page") || "1");

	if (currentPage < 1) {
		error(400, "Invalid page number");
	}

	// Get user info with profile
	const userAccount = await db.query.accounts.findFirst({
		where: eq(accounts.id, userId),
		with: {
			profile: {
				with: {
					logoFile: true
				}
			}
		}
	});

	if (!userAccount) {
		error(404, "User not found");
	}

	// Build where conditions
	const whereConditions = [eq(articles.authorId, userId)];
	if (searchQuery) {
		whereConditions.push(like(articles.title, `%${searchQuery}%`));
	}

	// Get total count
	const totalCountResult = await db
		.select({ count: count() })
		.from(articles)
		.where(and(...whereConditions));

	const totalArticles = totalCountResult[0]?.count || 0;

	// Calculate offset
	const offset = (currentPage - 1) * PAGE_SIZE;

	// For date sorting, we can do it in the database
	// For rating sorting, we need to fetch all matching articles and sort in memory
	let articlesData;

	if (sortBy === "date") {
		// Simple date sorting in database
		articlesData = await db
			.select({
				id: articles.id,
				title: articles.title,
				createdAt: articles.createdAt,
				newspaperId: articles.newspaperId,
				newspaperName: newspapers.name
			})
			.from(articles)
			.leftJoin(newspapers, eq(articles.newspaperId, newspapers.id))
			.where(and(...whereConditions))
			.orderBy(sortOrder === "asc" ? asc(articles.createdAt) : desc(articles.createdAt))
			.limit(PAGE_SIZE)
			.offset(offset);
	} else {
		// For rating sort, get all matching articles (for this page + sorting)
		// We'll fetch more than needed and sort by upvote count
		const allArticles = await db
			.select({
				id: articles.id,
				title: articles.title,
				createdAt: articles.createdAt,
				newspaperId: articles.newspaperId,
				newspaperName: newspapers.name
			})
			.from(articles)
			.leftJoin(newspapers, eq(articles.newspaperId, newspapers.id))
			.where(and(...whereConditions))
			.orderBy(desc(articles.createdAt)); // Default ordering

		if (allArticles.length === 0) {
			articlesData = [];
		} else {
			// Get upvote counts for all articles
			const allArticleIds = allArticles.map((a) => a.id);
			const upvoteCounts = await db
				.select({
					articleId: upvotes.articleId,
					count: count()
				})
				.from(upvotes)
				.where(inArray(upvotes.articleId, allArticleIds))
				.groupBy(upvotes.articleId);

			const upvoteMap = new Map(upvoteCounts.map((uc) => [uc.articleId, Number(uc.count)]));

			// Add upvote counts and sort
			const articlesWithCounts = allArticles.map((article) => ({
				...article,
				upvoteCount: upvoteMap.get(article.id) || 0
			}));

			// Sort by upvote count
			articlesWithCounts.sort((a, b) => {
				const diff = a.upvoteCount - b.upvoteCount;
				return sortOrder === "asc" ? diff : -diff;
			});

			// Paginate after sorting
			articlesData = articlesWithCounts.slice(offset, offset + PAGE_SIZE);
		}
	}

	// Get upvote counts for the final articles
	const articleIds = articlesData.map((a) => a.id);
	let upvoteMap = new Map<number, number>();

	if (articleIds.length > 0 && sortBy === "date") {
		const upvoteCounts = await db
			.select({
				articleId: upvotes.articleId,
				count: count()
			})
			.from(upvotes)
			.where(inArray(upvotes.articleId, articleIds))
			.groupBy(upvotes.articleId);

		upvoteMap = new Map(upvoteCounts.map((uc) => [uc.articleId, Number(uc.count)]));
	}

	// Get user's logo if available
	let userLogo: string | null = null;
	if (userAccount.profile?.logoFile?.key) {
		userLogo = await getSignedDownloadUrl(userAccount.profile.logoFile.key);
	}

	// Combine articles with upvote counts
	const articlesWithUpvotes = articlesData.map((article) => ({
		id: article.id,
		title: article.title,
		createdAt: article.createdAt.toISOString(),
		newspaperId: article.newspaperId,
		newspaperName: article.newspaperName,
		upvoteCount: "upvoteCount" in article ? article.upvoteCount : upvoteMap.get(article.id) || 0
	}));

	return {
		user: {
			id: userAccount.id,
			name: userAccount.profile?.name || null,
			logo: userLogo
		},
		articles: articlesWithUpvotes,
		totalArticles,
		currentPage,
		pageSize: PAGE_SIZE,
		sortBy,
		sortOrder,
		searchQuery,
		isOwnProfile: locals.account?.id === userId
	};
};
