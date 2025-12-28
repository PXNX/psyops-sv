// src/routes/(authenticated)/chat/en/events/+server.ts
import { db } from "$lib/server/db";
import { chatMessages, userProfiles, files } from "$lib/server/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { RequestHandler } from "./$types";

// Helper function to extract URLs
function extractUrls(text: string): string[] {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.match(urlRegex) || [];
}

// Get link preview data
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
					author: { with: { profile: true } }
				}
			});

			if (article) {
				let logoUrl = null;
				if (article.newspaper.logo) {
					try {
						logoUrl = await getSignedDownloadUrl(article.newspaper.logo.key);
					} catch {}
				}
				return {
					type: "article",
					title: article.title,
					newspaperName: article.newspaper.name,
					authorName: article.author.profile?.name,
					logo: logoUrl
				};
			}
		}
	} catch (err) {
		console.error("Error getting link preview:", err);
	}

	return null;
}

// Process message with link preview
async function processMessage(msg: any) {
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
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const account = locals.account;
	if (!account) {
		throw error(401, "Not authenticated");
	}

	// Get the last message ID the client has seen
	const lastIdParam = url.searchParams.get("lastId");
	const lastId = lastIdParam ? parseInt(lastIdParam) : 0;

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			// Function to send SSE message
			const sendEvent = (data: any) => {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			// Send initial heartbeat
			sendEvent({ type: "connected" });

			// Poll for new messages every 2 seconds
			const intervalId = setInterval(async () => {
				try {
					const newMessages = await db
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
							and(
								eq(chatMessages.messageType, "global"),
								eq(chatMessages.isDeleted, false),
								gt(chatMessages.id, lastId)
							)
						)
						.orderBy(desc(chatMessages.sentAt))
						.limit(50);

					if (newMessages.length > 0) {
						const processedMessages = await Promise.all(newMessages.map((msg) => processMessage(msg)));

						sendEvent({
							type: "messages",
							data: processedMessages.reverse()
						});

						// Update lastId for next poll
						lastId = Math.max(...newMessages.map((m) => m.id));
					}

					// Send heartbeat every 30 seconds to keep connection alive
					if (Date.now() % 30000 < 2000) {
						sendEvent({ type: "heartbeat" });
					}
				} catch (err) {
					console.error("SSE error:", err);
					sendEvent({ type: "error", message: "Failed to fetch messages" });
				}
			}, 2000);

			// Cleanup on connection close
			return () => {
				clearInterval(intervalId);
			};
		}
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive"
		}
	});
};
