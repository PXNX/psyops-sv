// src/routes/(authenticated)/chat/en/+page.server.ts
import { db } from "$lib/server/db";
import { chatMessages, accounts, userProfiles, files, politicalParties } from "$lib/server/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

// Sanitize input to prevent XSS
function sanitizeInput(input: string): string {
	return input
		.replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
		.trim();
}

// Extract and validate URLs from message
function extractUrls(text: string): string[] {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.match(urlRegex) || [];
}

// Get link preview data
async function getLinkPreview(url: string) {
	// Extract user ID
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
					logoUrl = await getSignedDownloadUrl(profile.logo!.key);
				} catch {}
			}
			return {
				type: "user",
				name: profile.name,
				logo: logoUrl
			};
		}
	}

	// Extract party ID
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
					logoUrl = await getSignedDownloadUrl(party.logo!.key);
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

	return null;
}

// Process messages with link previews
async function processMessages(messages: any[]) {
	return await Promise.all(
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

			// Check for link previews
			const urls = extractUrls(msg.content);
			let linkPreview = null;

			for (const url of urls) {
				const preview = await getLinkPreview(url);
				if (preview) {
					linkPreview = preview;
					break; // Only show first preview
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
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;
	if (!account) {
		return { messages: [] };
	}

	// Get latest messages
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
		.where(and(eq(chatMessages.messageType, "global"), eq(chatMessages.isDeleted, false)))
		.orderBy(desc(chatMessages.sentAt))
		.limit(PAGE_SIZE);

	const processedMessages = await processMessages(messages);

	return {
		messages: processedMessages.reverse()
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		const formData = await request.formData();
		const rawContent = formData.get("content") as string;

		if (!rawContent || rawContent.trim().length === 0) {
			return fail(400, { error: "Message cannot be empty" });
		}

		// Sanitize input to prevent XSS
		const content = sanitizeInput(rawContent);

		if (content.length === 0) {
			return fail(400, { error: "Message contains invalid characters" });
		}

		if (content.length > 500) {
			return fail(400, { error: "Message too long (max 500 characters)" });
		}

		// Basic rate limiting check (optional - add cooldown table)
		const recentMessage = await db.query.chatMessages.findFirst({
			where: and(eq(chatMessages.senderId, account.id), eq(chatMessages.messageType, "global")),
			orderBy: desc(chatMessages.sentAt)
		});

		if (recentMessage) {
			const timeSinceLastMessage = Date.now() - recentMessage.sentAt.getTime();
			if (timeSinceLastMessage < 2000) {
				// 2 second cooldown
				return fail(429, { error: "Please wait before sending another message" });
			}
		}

		await db.insert(chatMessages).values({
			senderId: account.id,
			messageType: "global",
			content
		});

		return { success: true };
	}
};
