// src/routes/(authenticated)/chat/en/load-more/+server.ts
import { db } from "$lib/server/db";
import { chatMessages, userProfiles, files, politicalParties } from "$lib/server/schema";
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

export const GET: RequestHandler = async ({ locals, url }) => {
	const account = locals.account;
	if (!account) {
		throw error(401, "Not authenticated");
	}

	const beforeId = url.searchParams.get("before");
	if (!beforeId) {
		throw error(400, "Missing 'before' parameter");
	}

	// Validate beforeId is a number
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
