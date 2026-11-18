// src/routes/(authenticated)/chat/user/[id]/+page.server.ts
import { db, messageNotifier } from "#lib/server/db.js";
import { chatMessages, accounts, userProfiles, userBlocks, partyMembers, politicalParties } from "#lib/server/schema.js";
import { sendNotificationIfEnabled } from "#lib/server/services/push-notification.service.js";
import { eq, and, or, desc } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	blockUser,
	canModerate,
	checkCanSend,
	deleteMessage,
	readContent,
	reportMessage,
	unblockUser
} from "../../chat.server";
import type { Actions, PageServerLoad } from "./$types";

function findBlock(a: string, b: string) {
	return db.query.userBlocks.findFirst({
		where: or(
			and(eq(userBlocks.userId, a), eq(userBlocks.blockedUserId, b)),
			and(eq(userBlocks.userId, b), eq(userBlocks.blockedUserId, a))
		)
	});
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	depends("app:chat");
	const account = locals.account!;
	const otherUserId = params.id;

	// There is no conversation with yourself.
	if (otherUserId === account.id) redirect(303, "/chat");

	const otherUserAccount = await db.query.accounts.findFirst({
		where: eq(accounts.id, otherUserId)
	});

	if (!otherUserAccount) {
		return {
			otherUser: null,
			messages: [],
			currentUserId: account.id,
			canModerate: canModerate(account),
			isBlocked: false,
			blockedByCurrentUser: false
		};
	}

	// Profiles, party, block status and messages are independent, so fetch them in parallel
	const [
		{ profile: otherUserProfile, logo: otherUserLogo },
		otherUserParty,
		blockCheck,
		messages,
		{ profile: currentUserProfile, logo: currentUserLogo }
	] = await Promise.all([
		(async () => {
			const profile = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, otherUserId)
			});
			return { profile, logo: await getLogoUrl(profile?.logo) };
		})(),

		// Current party (abbreviation + color) for the other user, for the party tag next to their name.
		(async () => {
			const otherUserMembership = await db.query.partyMembers.findFirst({
				where: eq(partyMembers.userId, otherUserId)
			});
			if (!otherUserMembership) return null;
			return db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, otherUserMembership.partyId)
			});
		})(),

		findBlock(account.id, otherUserId),

		// Messages between the two users (even if blocked, so users can see history)
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
					or(
						and(eq(chatMessages.senderId, account.id), eq(chatMessages.recipientId, otherUserId)),
						and(eq(chatMessages.senderId, otherUserId), eq(chatMessages.recipientId, account.id))
					)
				)
			)
			.orderBy(desc(chatMessages.sentAt))
			.limit(100),

		(async () => {
			const profile = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.accountId, account.id)
			});
			return { profile, logo: await getLogoUrl(profile?.logo) };
		})()
	]);

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

	return {
		otherUser: {
			id: otherUserId,
			name: otherUserProfile?.name || "Anonymous",
			logo: otherUserLogo,
			partyAbbreviation: otherUserParty?.abbreviation ?? null,
			partyColor: otherUserParty?.color ?? null
		},
		messages: processedMessages,
		currentUserId: account.id,
		canModerate: canModerate(account),
		isBlocked: !!blockCheck,
		blockedByCurrentUser: blockCheck ? blockCheck.userId === account.id : false
	};
};

export const actions: Actions = {
	postMessage: async ({ request, locals, params }) => {
		const account = locals.account!;
		const otherUserId = params.id;

		if (otherUserId === account.id) return fail(400, { error: "You cannot message yourself" });

		const [blockCheck, otherUser] = await Promise.all([
			findBlock(account.id, otherUserId),
			db.query.accounts.findFirst({ where: eq(accounts.id, otherUserId) })
		]);
		if (!otherUser) return fail(404, { error: "User not found" });
		if (blockCheck) return fail(403, { error: "Cannot send messages to this user" });

		const { content, error } = readContent(await request.formData());
		if (error) return error;

		const blocked = await checkCanSend(account, "direct");
		if (blocked) return blocked;

		const [inserted] = await db
			.insert(chatMessages)
			.values({ senderId: account.id, recipientId: otherUserId, messageType: "direct", content })
			.returning({ id: chatMessages.id });

		// Notify both users (sender and recipient) instantly
		messageNotifier.notify([account.id, otherUserId], { messageType: "direct" });

		const senderProfile = await db.query.userProfiles.findFirst({
			where: eq(userProfiles.accountId, account.id)
		});
		const senderName = senderProfile?.name || "Someone";

		await sendNotificationIfEnabled(otherUserId, "notifyDirectMessages", {
			title: "💬 New Message",
			body: `${senderName}: ${content.slice(0, 100)}${content.length > 100 ? "…" : ""}`,
			icon: "/favicon.png",
			badge: "/badge.png",
			data: {
				url: `/chat/user/${account.id}`,
				tag: `chat-${account.id}`
			}
		});

		return { success: true, id: inserted.id };
	},

	deleteMessage: async ({ request, locals, params }) => {
		const account = locals.account!;
		const { error } = await deleteMessage(account, await request.formData(), {
			type: "direct",
			userIds: [account.id, params.id]
		});
		if (error) return error;

		messageNotifier.notify([account.id, params.id], { messageType: "direct" });
		return { success: true };
	},

	// Reports a single message. The old handler expected account-report fields
	// (targetId/reason) that the report sheet never sent, so every report failed.
	reportMessage: async ({ request, locals, params }) => {
		const account = locals.account!;
		return reportMessage(account, await request.formData(), {
			type: "direct",
			userIds: [account.id, params.id]
		});
	},

	blockUser: async ({ request, locals, params }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const result = await blockUser(account, (formData.get("blockedUserId") as string) || params.id);
		messageNotifier.notify([account.id, params.id], { messageType: "direct" });
		return result;
	},

	unblockUser: async ({ request, locals, params }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const result = await unblockUser(account, (formData.get("blockedUserId") as string) || params.id);
		messageNotifier.notify([account.id, params.id], { messageType: "direct" });
		return result;
	}
};
