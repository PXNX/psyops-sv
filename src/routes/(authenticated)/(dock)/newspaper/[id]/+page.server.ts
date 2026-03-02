// src/routes/(authenticated)/(dock)/newspaper/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers, files, userProfiles, articles, newspaperSubscriptions } from "$lib/server/schema";
import { error, fail } from "@sveltejs/kit";
import { and, eq, desc } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

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

	// Get logo URL if exists
	let logoUrl = null;
	if (newspaper.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, newspaper.logo)
		});
		if (logoFile) {
			try {
				logoUrl = await getSignedDownloadUrl(logoFile.key);
			} catch {
				logoUrl = null;
			}
		}
	}

	// Get owner profile logo
	let ownerLogoUrl = null;
	if (owner.user.profile?.logo) {
		const ownerLogoFile = await db.query.files.findFirst({
			where: eq(files.id, owner.user.profile.logo)
		});
		if (ownerLogoFile) {
			try {
				ownerLogoUrl = await getSignedDownloadUrl(ownerLogoFile.key);
			} catch {
				ownerLogoUrl = null;
			}
		}
	}

	// Get recent articles
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

	// Get author logos for articles
	const articlesWithLogos = await Promise.all(
		recentArticles.map(async (article) => {
			let authorLogoUrl = null;
			if (article.author.profile?.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, article.author.profile.logo)
				});
				if (logoFile) {
					try {
						authorLogoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {
						authorLogoUrl = null;
					}
				}
			}
			return { ...article, authorLogoUrl };
		})
	);

	// Get staff count
	const allStaff = await db.query.journalists.findMany({
		where: eq(journalists.newspaperId, newspaperId)
	});
	const staffCount = allStaff.length;

	// Get subscriber count
	const subscriptions = await db.query.newspaperSubscriptions.findMany({
		where: eq(newspaperSubscriptions.newspaperId, newspaperId)
	});
	const subscriberCount = subscriptions.length;

	// Check if current user is a journalist
	let userRole: "owner" | "editor" | "author" | null = null;
	let isSubscribed = false;
	if (account) {
		const membership = await db.query.journalists.findFirst({
			where: and(eq(journalists.userId, account.id), eq(journalists.newspaperId, newspaperId))
		});
		userRole = membership?.rank ?? null;

		// Check if user is subscribed
		const subscription = await db.query.newspaperSubscriptions.findFirst({
			where: and(
				eq(newspaperSubscriptions.userId, account.id),
				eq(newspaperSubscriptions.newspaperId, newspaperId)
			)
		});
		isSubscribed = !!subscription;
	}

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
			where: and(
				eq(newspaperSubscriptions.userId, account.id),
				eq(newspaperSubscriptions.newspaperId, newspaperId)
			)
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
			.where(
				and(
					eq(newspaperSubscriptions.userId, account.id),
					eq(newspaperSubscriptions.newspaperId, newspaperId)
				)
			);

		return { success: true };
	}
};
