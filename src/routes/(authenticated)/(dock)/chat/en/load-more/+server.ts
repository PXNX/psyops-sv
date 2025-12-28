// src/routes/(authenticated)/chat/en/load-more/+server.ts
import { db } from "$lib/server/db";
import {
	chatMessages,
	userProfiles,
	files,
	politicalParties,
	newspapers,
	states,
	blocs,
	articles
} from "$lib/server/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { json, error } from "@sveltejs/kit";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { RequestHandler } from "./$types";

const PAGE_SIZE = 20;

function extractUrls(text: string): string[] {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.match(urlRegex) || [];
}

async function getLinkPreview(url: string) {
	try {
		// User preview
		const userMatch = url.match(/\/user\/([a-zA-Z0-9_-]+)/);
		if (userMatch) {
			const userId = userMatch[1];
			const profile = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, userId),
				with: { logo: true }
			});

			if (profile) {
				let logoUrl = null;
				if (profile.logo) {
					try {
						logoUrl = await getSignedDownloadUrl(profile.logo.key);
					} catch {}
				}
				return {
					type: "user",
					name: profile.name,
					logo: logoUrl
				};
			}
		}

		// Party preview
		const partyMatch = url.match(/\/party\/(\d+)/);
		if (partyMatch) {
			const partyId = parseInt(partyMatch[1]);
			const party = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, partyId),
				with: { logo: true }
			});

			if (party) {
				let logoUrl = null;
				if (party.logo) {
					try {
						logoUrl = await getSignedDownloadUrl(party.logo.key);
					} catch {}
				}
				return {
					type: "party",
					name: party.name,
					logo: logoUrl,
					memberCount: party.memberCount
				};
			}
		}

		// Newspaper preview
		const newspaperMatch = url.match(/\/newspaper\/(\d+)/);
		if (newspaperMatch) {
			const newspaperId = parseInt(newspaperMatch[1]);
			const newspaper = await db.query.newspapers.findFirst({
				where: eq(newspapers.id, newspaperId),
				with: { logo: true }
			});

			if (newspaper) {
				let logoUrl = null;
				if (newspaper.logo) {
					try {
						logoUrl = await getSignedDownloadUrl(newspaper.logo.key);
					} catch {}
				}
				return {
					type: "newspaper",
					name: newspaper.name,
					logo: logoUrl
				};
			}
		}

		// State preview
		const stateMatch = url.match(/\/state\/(\d+)/);
		if (stateMatch) {
			const stateId = parseInt(stateMatch[1]);
			const state = await db.query.states.findFirst({
				where: eq(states.id, stateId),
				with: { logo: true }
			});

			if (state) {
				let logoUrl = null;
				if (state.logo) {
					try {
						logoUrl = await getSignedDownloadUrl(state.logo.key);
					} catch {}
				}
				return {
					type: "state",
					name: state.name,
					logo: logoUrl,
					population: state.population
				};
			}
		}

		// Bloc preview
		const blocMatch = url.match(/\/bloc\/(\d+)/);
		if (blocMatch) {
			const blocId = parseInt(blocMatch[1]);
			const bloc = await db.query.blocs.findFirst({
				where: eq(blocs.id, blocId)
			});

			if (bloc) {
				return {
					type: "bloc",
					name: bloc.name,
					color: bloc.color
				};
			}
		}

		// Article preview
		const articleMatch = url.match(/\/article\/(\d+)/);
		if (articleMatch) {
			const articleId = parseInt(articleMatch[1]);
			const article = await db.query.articles.findFirst({
				where: eq(articles.id, articleId),
				with: {
					newspaper: { with: { logo: true } },
					author: true
				}
			});

			if (article) {
				let logoUrl = null;
				if (article.newspaper?.logo) {
					try {
						logoUrl = await getSignedDownloadUrl(article.newspaper.logo.key);
					} catch {}
				}

				// Get author profile
				let authorName = "Unknown";
				if (article.author) {
					const authorProfile = await db.query.userProfiles.findFirst({
						where: eq(userProfiles.accountId, article.authorId)
					});
					authorName = authorProfile?.name || "Unknown";
				}

				return {
					type: "article",
					title: article.title,
					newspaperName: article.newspaper?.name,
					authorName,
					logo: logoUrl
				};
			}
		}
	} catch (err) {
		console.error("Error getting link preview:", err);
	}

	return null;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const account = locals.account;
	if (!account) {
		throw error(401, "Not authenticated");
	}

	const beforeId = url.searchParams.get("before");
	if (!beforeId) {
		throw error(400, "Missing 'before' parameter");
	}

	const beforeIdNum = parseInt(beforeId);
	if (isNaN(beforeIdNum)) {
		throw error(400, "Invalid 'before' parameter");
	}

	// Get messages before the specified ID
	const messages = await db
		.select({
			id: chatMessages.id,
			content: chatMessages.content,
			sentAt: chatMessages.sentAt,
			senderId: chatMessages.senderId,
			senderName: userProfiles.name,
			senderLogo: userProfiles.logo
		})
		.from(chatMessages)
		.leftJoin(userProfiles, eq(chatMessages.senderId, userProfiles.accountId))
		.where(
			and(eq(chatMessages.messageType, "global"), eq(chatMessages.isDeleted, false), lt(chatMessages.id, beforeIdNum))
		)
		.orderBy(desc(chatMessages.sentAt))
		.limit(PAGE_SIZE);

	// Process messages
	const processedMessages = await Promise.all(
		messages.map(async (msg) => {
			let senderLogoUrl = null;
			if (msg.senderLogo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, msg.senderLogo)
				});
				if (logoFile) {
					try {
						senderLogoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {}
				}
			}

			const urls = extractUrls(msg.content);
			let linkPreview = null;

			for (const url of urls) {
				const preview = await getLinkPreview(url);
				if (preview) {
					linkPreview = preview;
					break;
				}
			}

			return {
				...msg,
				senderLogo: senderLogoUrl,
				sentAt: msg.sentAt.toISOString(),
				linkPreview
			};
		})
	);

	return json(processedMessages.reverse());
};
