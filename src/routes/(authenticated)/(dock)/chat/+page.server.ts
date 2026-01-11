// src/routes/(authenticated)/chat/+page.server.ts
import { db } from "$lib/server/db";
import { chatMessages, partyMembers, politicalParties, userProfiles, files } from "$lib/server/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

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
		const party = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.id, partyMembership.partyId)
		});

		if (party) {
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

	// Get all direct messages involving this user
	const directMessages = await db
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
				or(eq(chatMessages.senderId, account.id), eq(chatMessages.recipientId, account.id))
			)
		)
		.orderBy(desc(chatMessages.sentAt));

	// Group by conversation partner
	const conversationMap = new Map<
		string,
		{
			otherUserId: string;
			lastMessage: string;
			lastSentAt: Date;
			isFromCurrentUser: boolean;
		}
	>();

	for (const msg of directMessages) {
		const otherUserId = msg.senderId === account.id ? msg.recipientId : msg.senderId;
		if (!otherUserId) continue;

		if (!conversationMap.has(otherUserId)) {
			conversationMap.set(otherUserId, {
				otherUserId,
				lastMessage: msg.content,
				lastSentAt: msg.sentAt,
				isFromCurrentUser: msg.senderId === account.id
			});
		}
	}

	// Fetch user details for each conversation
	const directChats = await Promise.all(
		Array.from(conversationMap.values()).map(async (conv) => {
			const otherUser = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, conv.otherUserId)
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
				otherUserId: conv.otherUserId,
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
