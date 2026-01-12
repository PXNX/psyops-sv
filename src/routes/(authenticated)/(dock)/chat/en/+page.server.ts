// src/routes/(authenticated)/chat/en/+page.server.ts
import { db, messageNotifier } from "$lib/server/db";
import { chatMessages, accounts, userProfiles, files, politicalParties } from "$lib/server/schema";
import { eq, and, desc } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 100;

// Sanitize input to prevent XSS
function sanitizeInput(input: string): string {
	return input
		.replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
		.trim();
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

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

			return {
				id: msg.id,
				content: msg.content,
				sentAt: msg.sentAt.toISOString(),
				senderId: msg.senderId,
				senderName: msg.senderName || "Anonymous",
				senderLogo: senderLogoUrl,
				isFromCurrentUser: msg.senderId === account.id
			};
		})
	);

	return {
		messages: processedMessages.reverse(),
		currentUserId: account.id
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

		// Basic rate limiting check
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

		// Get all active users to notify (simplified - in production you'd want to track active connections)
		const recentActiveUsers = await db
			.selectDistinct({ userId: chatMessages.senderId })
			.from(chatMessages)
			.where(eq(chatMessages.messageType, "global"))
			.limit(100); // Notify last 100 active users

		const userIds = recentActiveUsers.map((u) => u.userId);

		// Notify all recently active users
		messageNotifier.notify(userIds, {
			messageType: "global"
		});

		return { success: true };
	}
};
