// src/routes/(authenticated)/chat/party/+page.server.ts
import { db, messageNotifier } from "#lib/server/db.js";
import {
	chatMessages,
	partyMembers,
	politicalParties,
	userProfiles,
	generalReports,
	userBlocks
} from "#lib/server/schema.js";
import { eq, and, desc, notInArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { getLogoUrl } from "#lib/server/backblaze.js";
import type { Actions, PageServerLoad } from "./$types";

function sanitizeInput(input: string): string {
	return input.replace(/[<>]/g, "").trim();
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends("app:chat");
	const account = locals.account;
	if (!account) {
		return { party: null, messages: [], currentUserId: null };
	}

	// Get user's party membership
	const membership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});

	if (!membership) {
		return { party: null, messages: [], currentUserId: account.id };
	}

	// Get party details
	const party = await db.query.politicalParties.findFirst({
		where: eq(politicalParties.id, membership.partyId)
	});

	if (!party) {
		return { party: null, messages: [], currentUserId: account.id };
	}

	// Logo and messages only depend on the party, so fetch them in parallel
	const [logoUrl, messages] = await Promise.all([
		// Get party logo
		getLogoUrl(party.logo),

		// Blocked users → messages (excluding blocked users)
		(async () => {
			const blockedUsers =
				(await db.query.userBlocks?.findMany({
					where: eq(userBlocks.userId, account.id)
				})) || [];
			const blockedUserIds = blockedUsers.map((b) => b.blockedUserId);

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

			return messagesQuery.orderBy(desc(chatMessages.sentAt)).limit(100);
		})()
	]);

	// Process messages
	const processedMessages = await Promise.all(
		messages.map(async (msg) => {
			const [{ senderProfile, senderLogoUrl }, senderMembership] = await Promise.all([
				(async () => {
					const senderProfile = await db.query.userProfiles.findFirst({
						where: eq(userProfiles.accountId, msg.senderId)
					});
					return { senderProfile, senderLogoUrl: await getLogoUrl(senderProfile?.logo) };
				})(),

				// Check if sender is party leader
				db.query.partyMembers.findFirst({
					where: and(eq(partyMembers.userId, msg.senderId), eq(partyMembers.partyId, membership.partyId))
				})
			]);

			return {
				id: msg.id,
				content: msg.content,
				sentAt: msg.sentAt.toISOString(),
				senderId: msg.senderId,
				senderName: senderProfile?.name || "Anonymous",
				senderLogo: senderLogoUrl,
				isFromCurrentUser: msg.senderId === account.id,
				isLeader: senderMembership?.role === "leader"
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

		// Get all party members to notify
		const allMembers = await db.query.partyMembers.findMany({
			where: eq(partyMembers.partyId, membership.partyId)
		});

		const memberIds = allMembers.map((m) => m.userId);

		// Notify all party members
		messageNotifier.notify(memberIds, {
			messageType: "party"
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
	}
};
