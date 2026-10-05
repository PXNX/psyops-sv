// src/routes/(authenticated)/(dock)/newspaper/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import { journalists, newspapers, userProfiles, articles, newspaperSubscriptions } from "#lib/server/schema.js";
import { error, fail } from "@sveltejs/kit";
import { and, eq, desc } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const newspaperId = parseInt(params.id);
	const account = locals.account;

	// Get newspaper with owner information
	const newspaper = await db.query.newspapers.findFirst({
		where: eq(newspapers.id, newspaperId),
		with: {
			journalists: {
				where: eq(journalists.rank, "owner"),
				with: {
					user: {
						with: {
							profile: true
						}
					}
				},
				limit: 1
			}
		}
	});

	if (!newspaper) {
		throw error(404, "Newspaper not found");
	}

	const owner = newspaper.journalists[0];
	if (!owner) {
		throw error(500, "Newspaper has no owner");
	}

	// Everything below only depends on the newspaper, so fetch it in parallel
	const [logoUrl, ownerLogoUrl, articlesWithLogos, allStaff, subscriptions, membership, subscription] =
		await Promise.all([
			// Get logo URL if exists
			getLogoUrl(newspaper.logo),
			// Get owner profile logo
			getLogoUrl(owner.user.profile?.logo),
			// Get recent articles with author logos
			(async () => {
				const recentArticles = await db.query.articles.findMany({
					where: eq(articles.newspaperId, newspaperId),
					orderBy: [desc(articles.createdAt)],
					limit: 10,
					with: {
						author: {
							with: {
								profile: true
							}
						},
						upvotes: true
					}
				});
				return Promise.all(
					recentArticles.map(async (article) => ({
						...article,
						authorLogoUrl: await getLogoUrl(article.author.profile?.logo)
					}))
				);
			})(),
			// Get staff count
			db.query.journalists.findMany({
				where: eq(journalists.newspaperId, newspaperId)
			}),
			// Get subscriber count
			db.query.newspaperSubscriptions.findMany({
				where: eq(newspaperSubscriptions.newspaperId, newspaperId)
			}),
			// Check if current user is a journalist
			account
				? db.query.journalists.findFirst({
						where: and(eq(journalists.userId, account.id), eq(journalists.newspaperId, newspaperId))
					})
				: undefined,
			// Check if user is subscribed
			account
				? db.query.newspaperSubscriptions.findFirst({
						where: and(
							eq(newspaperSubscriptions.userId, account.id),
							eq(newspaperSubscriptions.newspaperId, newspaperId)
						)
					})
				: undefined
		]);

	const staffCount = allStaff.length;
	const subscriberCount = subscriptions.length;
	const userRole: "owner" | "editor" | "author" | null = membership?.rank ?? null;
	const isSubscribed = !!subscription;

	return {
		newspaper: {
			id: newspaper.id,
			name: newspaper.name,
			logoUrl,
			background: newspaper.background,
			createdAt: newspaper.createdAt
		},
		owner: {
			id: owner.userId,
			name: owner.user.profile?.name ?? "Unknown",
			logoUrl: ownerLogoUrl
		},
		articles: articlesWithLogos.map((article) => ({
			id: article.id,
			title: article.title,
			publishDate: article.createdAt,
			upvoteCount: article.upvotes.length,
			authorName: article.author.profile?.name ?? "Unknown",
			authorLogo: article.authorLogoUrl
		})),
		userRole,
		isSubscribed,
		staffCount,
		subscriberCount
	};
};

export const actions: Actions = {
	subscribe: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const newspaperId = parseInt(params.id);

		// Check if already subscribed
		const existing = await db.query.newspaperSubscriptions.findFirst({
			where: and(eq(newspaperSubscriptions.userId, account.id), eq(newspaperSubscriptions.newspaperId, newspaperId))
		});

		if (existing) {
			return fail(400, { error: "Already subscribed" });
		}

		// Create subscription
		await db.insert(newspaperSubscriptions).values({
			userId: account.id,
			newspaperId
		});

		return { success: true };
	},

	unsubscribe: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const newspaperId = parseInt(params.id);

		// Delete subscription
		await db
			.delete(newspaperSubscriptions)
			.where(and(eq(newspaperSubscriptions.userId, account.id), eq(newspaperSubscriptions.newspaperId, newspaperId)));

		return { success: true };
	}
};
