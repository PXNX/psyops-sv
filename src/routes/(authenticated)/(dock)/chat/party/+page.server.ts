// src/routes/(authenticated)/chat/party/+page.server.ts
import { db } from "$lib/server/db";
import {
	chatMessages,
	partyMembers,
	politicalParties,
	userProfiles,
	files,
	generalReports,
	userBlocks
} from "$lib/server/schema";
import { eq, and, desc, notInArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { Actions, PageServerLoad } from "./$types";

function sanitizeInput(input: string): string {
	return input.replace(/[<>]/g, "").trim();
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;
	if (!account) {
		return { party: null, messages: [] };
	}

	// Get user's party membership
	const membership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});

	if (!membership) {
		return { party: null, messages: [] };
	}

	// Get party details
	const party = await db.query.politicalParties.findFirst({
		where: eq(politicalParties.id, membership.partyId)
	});

	if (!party) {
		return { party: null, messages: [] };
	}

	// Get party logo
	let logoUrl = null;
	if (party.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, party.logo)
		});
		if (logoFile) {
			try {
				logoUrl = await getSignedDownloadUrl(logoFile.key);
			} catch {}
		}
	}

	// Get blocked users
	const blockedUsers =
		(await db.query.userBlocks?.findMany({
			where: eq(userBlocks.userId, account.id)
		})) || [];
	const blockedUserIds = blockedUsers.map((b) => b.blockedUserId);

	// Get messages (excluding blocked users)
	let messagesQuery = db
		.select({
			id: chatMessages.id,
			content: chatMessages.content,
			sentAt: chatMessages.sentAt,
			senderId: chatMessages.senderId
		})
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.messageType, "party"),
				eq(chatMessages.partyId, membership.partyId),
				eq(chatMessages.isDeleted, false)
			)
		)
		.$dynamic();

	// Exclude blocked users if any
	if (blockedUserIds.length > 0) {
		messagesQuery = messagesQuery.where(notInArray(chatMessages.senderId, blockedUserIds));
	}

	const messages = await messagesQuery.orderBy(desc(chatMessages.sentAt)).limit(100);

	// Process messages
	const processedMessages = await Promise.all(
		messages.map(async (msg) => {
			const senderProfile = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, msg.senderId)
			});

			let senderLogoUrl = null;
			if (senderProfile?.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, senderProfile.logo)
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
				senderName: senderProfile?.name || "Anonymous",
				senderLogo: senderLogoUrl,
				isFromCurrentUser: msg.senderId === account.id
			};
		})
	);

	return {
		party: {
			id: party.id,
			name: party.name,
			logo: logoUrl,
			memberCount: party.memberCount
		},
		messages: processedMessages.reverse()
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

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

		const content = sanitizeInput(rawContent);

		if (content.length === 0) {
			return fail(400, { error: "Message contains invalid characters" });
		}

		if (content.length > 500) {
			return fail(400, { error: "Message too long (max 500 characters)" });
		}

		// Rate limiting
		const recentMessage = await db.query.chatMessages.findFirst({
			where: and(eq(chatMessages.senderId, account.id), eq(chatMessages.messageType, "party")),
			orderBy: desc(chatMessages.sentAt)
		});

		if (recentMessage) {
			const timeSinceLastMessage = Date.now() - recentMessage.sentAt.getTime();
			if (timeSinceLastMessage < 2000) {
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
	},

	reportMessage: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		const formData = await request.formData();
		const messageId = formData.get("messageId") as string;
		const reportedUserId = formData.get("reportedUserId") as string;
		const violationType = formData.get("violationType") as string;
		const description = formData.get("description") as string;

		if (!messageId || !reportedUserId || !violationType) {
			return fail(400, { error: "Missing required fields" });
		}

		await db.insert(generalReports).values({
			targetType: "message",
			targetId: messageId,
			reporterId: account.id,
			reason: description || `Reported for ${violationType}`,
			violationType: violationType as any,
			status: "pending"
		});

		return { success: true, message: "Report submitted successfully" };
	},

	blockUser: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		const formData = await request.formData();
		const blockedUserId = formData.get("blockedUserId") as string;

		if (!blockedUserId) {
			return fail(400, { error: "Missing user ID" });
		}

		if (blockedUserId === account.id) {
			return fail(400, { error: "You cannot block yourself" });
		}

		// Check if already blocked
		const existing = await db.query.userBlocks?.findFirst({
			where: and(eq(userBlocks.userId, account.id), eq(userBlocks.blockedUserId, blockedUserId))
		});

		if (existing) {
			return fail(400, { error: "User is already blocked" });
		}

		await db.insert(userBlocks).values({
			userId: account.id,
			blockedUserId: blockedUserId
		});

		return { success: true, message: "User blocked successfully" };
	}
};
