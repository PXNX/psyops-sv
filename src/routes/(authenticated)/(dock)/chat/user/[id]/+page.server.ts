// src/routes/(authenticated)/chat/user/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	chatMessages,
	accounts,
	userProfiles,
	files
} from "$lib/server/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { fail, error } from "@sveltejs/kit";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	const account = locals.account;
	if (!account) {
		throw error(401, "Not authenticated");
	}

	const otherUserId = params.id;

	// Verify other user exists
	const otherUserAccount = await db.query.accounts.findFirst({
		where: eq(accounts.id, otherUserId)
	});

	if (!otherUserAccount) {
		return { otherUser: null, messages: [], currentUserId: account.id };
	}

	// Get other user's profile
	const otherUserProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, otherUserId),
		with: {
			logo: true
		}
	});

	let otherUserLogo = null;
	if (otherUserProfile?.logo) {
		try {
			otherUserLogo = await getSignedDownloadUrl(otherUserProfile.logo.key);
		} catch {}
	}

	// Get messages between the two users
	const messages = await db
		.select({
			id: chatMessages.id,
			content: chatMessages.content,
			sentAt: chatMessages.sentAt,
			senderId: chatMessages.senderId,
			recipientId: chatMessages.recipientId
		})
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.messageType, "direct"),
				eq(chatMessages.isDeleted, false),
				or(
					and(
						eq(chatMessages.senderId, account.id),
						eq(chatMessages.recipientId, otherUserId)
					),
					and(
						eq(chatMessages.senderId, otherUserId),
						eq(chatMessages.recipientId, account.id)
					)
				)
			)
		)
		.orderBy(desc(chatMessages.sentAt))
		.limit(100);

	// Get current user profile
	const currentUserProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id),
		with: {
			logo: true
		}
	});

	let currentUserLogo = null;
	if (currentUserProfile?.logo) {
		try {
			currentUserLogo = await getSignedDownloadUrl(currentUserProfile.logo.key);
		} catch {}
	}

	// Process messages
	const processedMessages = messages.map((msg) => ({
		...msg,
		isFromCurrentUser: msg.senderId === account.id,
		senderName: msg.senderId === account.id 
			? (currentUserProfile?.name || 'You')
			: (otherUserProfile?.name || 'Anonymous'),
		senderLogo: msg.senderId === account.id ? currentUserLogo : otherUserLogo,
		sentAt: msg.sentAt.toISOString()
	})).reverse();

	return {
		otherUser: {
			id: otherUserId,
			name: otherUserProfile?.name || 'Anonymous',
			logo: otherUserLogo
		},
		messages: processedMessages,
		currentUserId: account.id
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		const otherUserId = params.id;

		// Verify other user exists
		const otherUser = await db.query.accounts.findFirst({
			where: eq(accounts.id, otherUserId)
		});

		if (!otherUser) {
			return fail(404, { error: "User not found" });
		}

		// Can't message yourself
		if (otherUserId === account.id) {
			return fail(400, { error: "You cannot message yourself" });
		}

		const formData = await request.formData();
		const content = formData.get("content") as string;

		if (!content || content.trim().length === 0) {
			return fail(400, { error: "Message cannot be empty" });
		}

		if (content.length > 500) {
			return fail(400, { error: "Message too long (max 500 characters)" });
		}

		await db.insert(chatMessages).values({
			senderId: account.id,
			recipientId: otherUserId,
			messageType: "direct",
			content: content.trim()
		});

		return { success: true };
	}
};