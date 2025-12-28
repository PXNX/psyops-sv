// src/routes/(authenticated)/chat/party/+page.server.ts
import { db } from "$lib/server/db";
import { chatMessages, partyMembers, politicalParties, userProfiles, files } from "$lib/server/schema";
import { eq, and, desc } from "drizzle-orm";
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

async function extractUrls(text: string): string[] {
	const account = locals.account;
	if (!account) {
		return { party: null, messages: [] };
	}

	// Get user's party membership
	const membership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id),
		with: {
			party: {
				with: {
					logo: true
				}
			}
		}
	});

	if (!membership) {
		return { party: null, messages: [] };
	}

	// Get party logo
	let logoUrl = null;
	if (membership.party.logo) {
		try {
			logoUrl = await getSignedDownloadUrl(membership.party.logo.key);
		} catch {}
	}

	// Get messages
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
			and(
				eq(chatMessages.messageType, "party"),
				eq(chatMessages.partyId, membership.partyId),
				eq(chatMessages.isDeleted, false)
			)
		)
		.orderBy(desc(chatMessages.sentAt))
		.limit(PAGE_SIZE);

	// Process logos and link previews
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

	return {
		party: {
			id: membership.party.id,
			name: membership.party.name,
			logo: logoUrl,
			memberCount: membership.party.memberCount
		},
		messages: processedMessages.reverse()
	};
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		// Verify party membership
		const membership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (!membership) {
			return fail(403, { error: "You must be a party member to send messages" });
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

		// Basic rate limiting
		const recentMessage = await db.query.chatMessages.findFirst({
			where: and(eq(chatMessages.senderId, account.id), eq(chatMessages.messageType, "party")),
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
			messageType: "party",
			partyId: membership.partyId,
			content: content.trim()
		});

		return { success: true };
	}
};
