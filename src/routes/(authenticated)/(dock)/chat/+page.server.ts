// src/routes/(authenticated)/chat/+page.server.ts
import { db } from "$lib/server/db";
import { chatMessages, partyMembers, politicalParties, userProfiles, files, accounts } from "$lib/server/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;
	if (!account) {
		return { globalChat: null, partyChat: null, directChats: [] };
	}

	// Get last message in global chat
	const globalLastMessage = await db
		.select({
			id: chatMessages.id,
			content: chatMessages.content,
			sentAt: chatMessages.sentAt,
			senderId: chatMessages.senderId
		})
		.from(chatMessages)
		.where(and(eq(chatMessages.messageType, "global"), eq(chatMessages.isDeleted, false)))
		.orderBy(desc(chatMessages.sentAt))
		.limit(1);

	let globalChat = {
		lastMessage: null as { content: string; senderName: string; sentAt: string } | null,
		unreadCount: 0
	};

	if (globalLastMessage.length > 0) {
		const msg = globalLastMessage[0];
		const senderProfile = await db.query.userProfiles.findFirst({
			where: eq(userProfiles.accountId, msg.senderId)
		});

		globalChat.lastMessage = {
			content: msg.content,
			senderName: senderProfile?.name || "Anonymous",
			sentAt: msg.sentAt.toISOString()
		};
	}

	// Get user's party membership
	const partyMembership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});

	let partyChat = null;
	if (partyMembership) {
		// Get party details
		const party = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.id, partyMembership.partyId)
		});

		if (party) {
			// Get last message in party chat
			const lastMessage = await db
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
						eq(chatMessages.partyId, partyMembership.partyId),
						eq(chatMessages.isDeleted, false)
					)
				)
				.orderBy(desc(chatMessages.sentAt))
				.limit(1);

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

			let lastMessageData = null;
			if (lastMessage.length > 0) {
				const msg = lastMessage[0];
				const senderProfile = await db.query.userProfiles.findFirst({
					where: eq(userProfiles.accountId, msg.senderId)
				});

				lastMessageData = {
					content: msg.content,
					senderName: senderProfile?.name || "Anonymous",
					sentAt: msg.sentAt.toISOString()
				};
			}

			partyChat = {
				partyId: partyMembership.partyId,
				name: party.name,
				logo: logoUrl,
				lastMessage: lastMessageData,
				unreadCount: 0
			};
		}
	}

	// Get direct message conversations
	const sentMessages = await db
		.select({
			otherUserId: chatMessages.recipientId,
			lastMessage: sql<string>`MAX(${chatMessages.content})`,
			lastSentAt: sql<Date>`MAX(${chatMessages.sentAt})`,
			isFromCurrentUser: sql<boolean>`true`
		})
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.messageType, "direct"),
				eq(chatMessages.senderId, account.id),
				eq(chatMessages.isDeleted, false)
			)
		)
		.groupBy(chatMessages.recipientId);

	const receivedMessages = await db
		.select({
			otherUserId: chatMessages.senderId,
			lastMessage: sql<string>`MAX(${chatMessages.content})`,
			lastSentAt: sql<Date>`MAX(${chatMessages.sentAt})`,
			isFromCurrentUser: sql<boolean>`false`
		})
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.messageType, "direct"),
				eq(chatMessages.recipientId, account.id),
				eq(chatMessages.isDeleted, false)
			)
		)
		.groupBy(chatMessages.senderId);

	// Combine and deduplicate conversations
	const allConversations = [...sentMessages, ...receivedMessages];
	const conversationMap = new Map();

	for (const conv of allConversations) {
		if (!conv.otherUserId) continue; // Skip if no recipient

		const existing = conversationMap.get(conv.otherUserId);
		if (!existing || new Date(conv.lastSentAt) > new Date(existing.lastSentAt)) {
			conversationMap.set(conv.otherUserId, conv);
		}
	}

	const directChats = await Promise.all(
		Array.from(conversationMap.values()).map(async (conv) => {
			const otherUser = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, conv.otherUserId!)
			});

			let logoUrl = null;
			if (otherUser?.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, otherUser.logo)
				});
				if (logoFile) {
					try {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {}
				}
			}

			return {
				otherUserId: conv.otherUserId!,
				otherUserName: otherUser?.name || "Anonymous",
				otherUserLogo: logoUrl,
				lastMessage: {
					content: conv.lastMessage,
					sentAt: conv.lastSentAt.toISOString(),
					isFromCurrentUser: conv.isFromCurrentUser
				},
				unreadCount: 0
			};
		})
	);

	// Sort by last message time
	directChats.sort((a, b) => new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime());

	return {
		globalChat,
		partyChat,
		directChats
	};
};
