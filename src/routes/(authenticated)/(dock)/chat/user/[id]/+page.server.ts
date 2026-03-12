// src/routes/(authenticated)/chat/user/[id]/+page.server.ts
import { db, messageNotifier } from "$lib/server/db";
import {
	chatMessages,
	accounts,
	userProfiles,
	files,
	generalReports,
	userBlocks,
	residences,
	partyMembers
} from "$lib/server/schema";
import { sendPushNotificationToUser } from "$lib/server/services/push-notification.service";
import { eq, and, or, desc } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	const account = locals.account!;
	const otherUserId = params.id;

	// Verify other user exists
	const otherUserAccount = await db.query.accounts.findFirst({
		where: eq(accounts.id, otherUserId)
	});

	if (!otherUserAccount) {
		return {
			otherUser: null,
			messages: [],
			currentUserId: account.id,
			isBlocked: false,
			blockedByCurrentUser: false
		};
	}

	// Get other user's profile
	const otherUserProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, otherUserId)
	});

	// Get other user's logo file separately if it exists
	let otherUserLogo = null;
	if (otherUserProfile?.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, otherUserProfile.logo)
		});
		if (logoFile) {
			try {
				otherUserLogo = await getSignedDownloadUrl(logoFile.key);
			} catch {}
		}
	}

	// Check if user has blocked the other user or vice versa
	const blockCheck = await db.query.userBlocks?.findFirst({
		where: or(
			and(eq(userBlocks.userId, account.id), eq(userBlocks.blockedUserId, otherUserId)),
			and(eq(userBlocks.userId, otherUserId), eq(userBlocks.blockedUserId, account.id))
		)
	});

	// Get messages between the two users (even if blocked, so users can see history)
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
					and(eq(chatMessages.senderId, account.id), eq(chatMessages.recipientId, otherUserId)),
					and(eq(chatMessages.senderId, otherUserId), eq(chatMessages.recipientId, account.id))
				)
			)
		)
		.orderBy(desc(chatMessages.sentAt))
		.limit(100);

	// Get current user profile
	const currentUserProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	// Get current user's logo file separately if it exists
	let currentUserLogo = null;
	if (currentUserProfile?.logo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, currentUserProfile.logo)
		});
		if (logoFile) {
			try {
				currentUserLogo = await getSignedDownloadUrl(logoFile.key);
			} catch {}
		}
	}

	// Process messages
	const processedMessages = messages
		.map((msg) => ({
			...msg,
			isFromCurrentUser: msg.senderId === account.id,
			senderName:
				msg.senderId === account.id ? currentUserProfile?.name || "You" : otherUserProfile?.name || "Anonymous",
			senderLogo: msg.senderId === account.id ? currentUserLogo : otherUserLogo,
			sentAt: msg.sentAt.toISOString()
		}))
		.reverse();

	// Determine if blocked and by whom
	const isBlocked = !!blockCheck;
	const blockedByCurrentUser = blockCheck ? blockCheck.userId === account.id : false;

	return {
		otherUser: {
			id: otherUserId,
			name: otherUserProfile?.name || "Anonymous",
			logo: otherUserLogo
		},
		messages: processedMessages,
		currentUserId: account.id,
		isBlocked,
		blockedByCurrentUser
	};
};

export const actions: Actions = {
	postMessage: async ({ request, locals, params }) => {
		const account = locals.account!;
		const otherUserId = params.id;

		console.log("MESSAGE ACTION CALLED", { from: account.id, to: otherUserId });

		// Check if blocked
		const blockCheck = await db.query.userBlocks?.findFirst({
			where: or(
				and(eq(userBlocks.userId, account.id), eq(userBlocks.blockedUserId, otherUserId)),
				and(eq(userBlocks.userId, otherUserId), eq(userBlocks.blockedUserId, account.id))
			)
		});

		if (blockCheck) {
			console.log("BLOCKED");
			return fail(403, { error: "Cannot send messages to this user" });
		}

		// Verify other user exists
		const otherUser = await db.query.accounts.findFirst({
			where: eq(accounts.id, otherUserId)
		});

		if (!otherUser) {
			console.log("USER NOT FOUND");
			return fail(404, { error: "User not found" });
		}

		// Can't message yourself
		if (otherUserId === account.id) {
			console.log("SELF MESSAGE");
			return fail(400, { error: "You cannot message yourself" });
		}

		const formData = await request.formData();
		const content = formData.get("content") as string;

		console.log("MESSAGE CONTENT:", content);

		if (!content || content.trim().length === 0) {
			console.log("EMPTY MESSAGE");
			return fail(400, { error: "Message cannot be empty" });
		}

		if (content.length > 500) {
			console.log("MESSAGE TOO LONG");
			return fail(400, { error: "Message too long (max 500 characters)" });
		}

		// Insert message
		console.log("INSERTING MESSAGE");
		await db.insert(chatMessages).values({
			senderId: account.id,
			recipientId: otherUserId,
			messageType: "direct",
			content: content.trim()
		});
		console.log("MESSAGE INSERTED");

		// Notify both users (sender and recipient) instantly
		console.log("NOTIFYING USERS:", [account.id, otherUserId]);
		messageNotifier.notify([account.id, otherUserId], {
			messageType: "direct"
		});
		console.log("NOTIFICATION SENT");

		// Get sender's display name for the push notification
		const senderProfile = await db.query.userProfiles.findFirst({
			where: eq(userProfiles.accountId, account.id)
		});
		const senderName = senderProfile?.name || "Someone";

		// Send push notification to the recipient
		await sendPushNotificationToUser(otherUserId, {
			title: "💬 New Message",
			body: `${senderName}: ${content.trim().slice(0, 100)}${content.trim().length > 100 ? "…" : ""}`,
			icon: "/favicon.png",
			badge: "/badge.png",
			data: {
				url: `/chat/user/${account.id}`,
				tag: `chat-${account.id}`
			}
		});

		return { success: true };
	},

	reportMessage: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const targetId = formData.get("targetId") as string;
		const violationType = formData.get("violationType") as string;
		const reason = formData.get("reason") as string;

		if (!targetId || !violationType || !reason) {
			return fail(400, { error: "Missing required fields" });
		}

		await db.insert(generalReports).values({
			targetType: "account",
			targetId: targetId,
			reporterId: account.id,
			reason: reason.trim(),
			violationType: violationType as any,
			status: "pending"
		});

		return { success: true, message: "Report submitted successfully" };
	},

	blockUser: async ({ request, locals, params }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const blockedUserId = (formData.get("blockedUserId") as string) || params.id;

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
	},

	unblockUser: async ({ request, locals, params }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const blockedUserId = (formData.get("blockedUserId") as string) || params.id;

		if (!blockedUserId) {
			return fail(400, { error: "Missing user ID" });
		}

		// Find and delete the block
		const existing = await db.query.userBlocks?.findFirst({
			where: and(eq(userBlocks.userId, account.id), eq(userBlocks.blockedUserId, blockedUserId))
		});

		if (!existing) {
			return fail(400, { error: "User is not blocked" });
		}

		await db.delete(userBlocks).where(eq(userBlocks.id, existing.id));

		return { success: true, message: "User unblocked successfully" };
	}
};
