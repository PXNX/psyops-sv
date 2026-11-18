// src/routes/(authenticated)/chat/en/+page.server.ts
import { db, messageNotifier } from "#lib/server/db.js";
import { chatMessages, userProfiles, politicalParties, partyMembers } from "#lib/server/schema.js";
import { eq, and, desc, inArray, notInArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	blockUser,
	blockedIdsOf,
	canModerate,
	checkCanSend,
	deleteMessage,
	readContent,
	reportMessage
} from "../chat.server";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 100;

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends("app:chat");
	const account = locals.account!;

	// Messages from people this user blocked are hidden, as the block sheet promises.
	const blockedIds = await blockedIdsOf(account.id);

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
				eq(chatMessages.messageType, "global"),
				eq(chatMessages.isDeleted, false),
				blockedIds.length > 0 ? notInArray(chatMessages.senderId, blockedIds) : undefined
			)
		)
		.orderBy(desc(chatMessages.sentAt))
		.limit(PAGE_SIZE);

	// Current party (abbreviation + color) for each sender, for the party tag next to their name.
	const senderIds = Array.from(new Set(messages.map((m) => m.senderId)));
	const partyBySenderId = new Map<string, { abbreviation: string | null; color: string }>();

	// Sender parties and logos are independent, so fetch them in parallel
	const [, senderLogoUrls] = await Promise.all([
		(async () => {
			if (senderIds.length === 0) return;
			const membershipRows = await db
				.select({
					userId: partyMembers.userId,
					abbreviation: politicalParties.abbreviation,
					color: politicalParties.color
				})
				.from(partyMembers)
				.innerJoin(politicalParties, eq(partyMembers.partyId, politicalParties.id))
				.where(inArray(partyMembers.userId, senderIds));

			for (const row of membershipRows) {
				partyBySenderId.set(row.userId, { abbreviation: row.abbreviation, color: row.color });
			}
		})(),
		Promise.all(messages.map((msg) => getLogoUrl(msg.senderLogo)))
	]);

	const processedMessages = messages.map((msg, i) => ({
		id: msg.id,
		content: msg.content,
		sentAt: msg.sentAt.toISOString(),
		senderId: msg.senderId,
		senderName: msg.senderName || "Anonymous",
		senderLogo: senderLogoUrls[i],
		senderPartyAbbreviation: partyBySenderId.get(msg.senderId)?.abbreviation ?? null,
		senderPartyColor: partyBySenderId.get(msg.senderId)?.color ?? null,
		isFromCurrentUser: msg.senderId === account.id
	}));

	return {
		messages: processedMessages.reverse(),
		currentUserId: account.id,
		canModerate: canModerate(account)
	};
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });

		const { content, error } = readContent(await request.formData());
		if (error) return error;

		const blocked = await checkCanSend(account, "global");
		if (blocked) return blocked;

		const [inserted] = await db
			.insert(chatMessages)
			.values({ senderId: account.id, messageType: "global", content })
			.returning({ id: chatMessages.id });

		// Everyone with an open chat stream sees the global channel, not only
		// people who posted in it before.
		messageNotifier.notifyAll({ messageType: "global" });

		return { success: true, id: inserted.id };
	},

	deleteMessage: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });

		const { error } = await deleteMessage(account, await request.formData(), { type: "global" });
		if (error) return error;

		messageNotifier.notifyAll({ messageType: "global" });
		return { success: true };
	},

	reportMessage: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });
		return reportMessage(account, await request.formData(), { type: "global" });
	},

	blockUser: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });
		const formData = await request.formData();
		return blockUser(account, (formData.get("blockedUserId") as string) || null);
	}
};
