// src/routes/(authenticated)/(dock)/newspaper/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers, files, userProfiles, articles } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { and, eq, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
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

	// Check if current user is a journalist
	let userRole: "owner" | "editor" | "author" | null = null;
	if (account) {
		const membership = await db.query.journalists.findFirst({
			where: and(eq(journalists.userId, account.id), eq(journalists.newspaperId, newspaperId))
		});
		userRole = membership?.rank ?? null;
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
		articles: recentArticles.map((article) => ({
			id: article.id,
			title: article.title,
			publishDate: article.createdAt,
			upvoteCount: article.upvotes.length,
			authorName: article.author.profile?.name ?? "Unknown"
		})),
		userRole
	};
};
