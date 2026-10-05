// src/routes/(authenticated)/chat/+page.server.ts
import { db } from "#lib/server/db.js";
import { chatMessages, partyMembers, politicalParties, userProfiles, userBlocks } from "#lib/server/schema.js";
import { eq, and, desc, or } from "drizzle-orm";
import { getLogoUrl } from "#lib/server/backblaze.js";
import type { PageServerLoad } from "./$types";

// Current party (abbreviation + color) for a user, for the party tag shown next to their name.
async function getPartyTag(userId: string) {
	const membership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, userId)
	});
	if (!membership) return { abbreviation: null as string | null, color: null as string | null };

	const party = await db.query.politicalParties.findFirst({
		where: eq(politicalParties.id, membership.partyId)
	});
	return { abbreviation: party?.abbreviation ?? null, color: party?.color ?? null };
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends("app:chat");
	const account = locals.account!;

	// Global, party and direct chat overviews are independent, so build them in parallel
	const [globalChat, partyChat, directChats] = await Promise.all([
		// Global chat: last message → sender profile + party
		(async () => {
			const globalChat = {
				lastMessage: null as {
					content: string;
					senderName: string;
					senderPartyAbbreviation: string | null;
					senderPartyColor: string | null;
					sentAt: string;
				} | null,
				unreadCount: 0
			};

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

			if (globalLastMessage.length > 0) {
				const msg = globalLastMessage[0];
				const [senderProfile, senderParty] = await Promise.all([
					db.query.userProfiles.findFirst({
						where: eq(userProfiles.accountId, msg.senderId)
					}),
					getPartyTag(msg.senderId)
				]);

				globalChat.lastMessage = {
					content: msg.content,
					senderName: senderProfile?.name || "Anonymous",
					senderPartyAbbreviation: senderParty.abbreviation,
					senderPartyColor: senderParty.color,
					sentAt: msg.sentAt.toISOString()
				};
			}

			return globalChat;
		})(),

		// Party chat: membership → party → last message + logo
		(async () => {
			const partyMembership = await db.query.partyMembers.findFirst({
				where: eq(partyMembers.userId, account.id)
			});
			if (!partyMembership) return null;

			const party = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, partyMembership.partyId)
			});
			if (!party) return null;

			const [logoUrl, lastMessageData] = await Promise.all([
				getLogoUrl(party.logo),
				(async () => {
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

					if (lastMessage.length === 0) return null;
					const msg = lastMessage[0];
					const senderProfile = await db.query.userProfiles.findFirst({
						where: eq(userProfiles.accountId, msg.senderId)
					});

					return {
						content: msg.content,
						senderName: senderProfile?.name || "Anonymous",
						sentAt: msg.sentAt.toISOString()
					};
				})()
			]);

			return {
				partyId: partyMembership.partyId,
				name: party.name,
				logo: logoUrl,
				lastMessage: lastMessageData,
				unreadCount: 0
			};
		})(),

		// Direct chats: blocks + messages → per-partner details
		(async () => {
			const [userBlocksList, directMessages] = await Promise.all([
				// Get all blocks involving this user
				db.query.userBlocks.findMany({
					where: or(eq(userBlocks.userId, account.id), eq(userBlocks.blockedUserId, account.id))
				}),

				// Get all direct messages involving this user
				db
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
					.orderBy(desc(chatMessages.sentAt))
			]);

			// Create a set of blocked user IDs for quick lookup
			const blockedUserIds = new Set(
				userBlocksList.map((block) => (block.userId === account.id ? block.blockedUserId : block.userId))
			);

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
					const [{ otherUser, logoUrl }, otherUserParty] = await Promise.all([
						(async () => {
							const otherUser = await db.query.userProfiles.findFirst({
								where: eq(userProfiles.accountId, conv.otherUserId)
							});
							return { otherUser, logoUrl: await getLogoUrl(otherUser?.logo) };
						})(),
						getPartyTag(conv.otherUserId)
					]);

					// Check if this user is blocked
					const isBlocked = blockedUserIds.has(conv.otherUserId);

					return {
						otherUserId: conv.otherUserId,
						otherUserName: otherUser?.name || "Anonymous",
						otherUserPartyAbbreviation: otherUserParty.abbreviation,
						otherUserPartyColor: otherUserParty.color,
						otherUserLogo: logoUrl,
						lastMessage: {
							content: conv.lastMessage,
							sentAt: conv.lastSentAt.toISOString(),
							isFromCurrentUser: conv.isFromCurrentUser
						},
						unreadCount: 0,
						isBlocked
					};
				})
			);

			// Sort by last message time
			directChats.sort((a, b) => new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime());

			return directChats;
		})()
	]);

	return {
		globalChat,
		partyChat,
		directChats
	};
};
