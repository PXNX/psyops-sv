// src/routes/(authenticated)/chat/party/+page.server.ts
import { db, messageNotifier } from "#lib/server/db.js";
import { chatMessages, partyMembers, politicalParties, userProfiles } from "#lib/server/schema.js";
import { eq, and, desc, notInArray, count } from "drizzle-orm";
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

async function membershipOf(userId: string) {
	return db.query.partyMembers.findFirst({ where: eq(partyMembers.userId, userId) });
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends("app:chat");
	const account = locals.account!;
	const empty = { party: null, messages: [], currentUserId: account.id, canModerate: canModerate(account) };

	const membership = await membershipOf(account.id);
	if (!membership) return empty;

	const party = await db.query.politicalParties.findFirst({
		where: eq(politicalParties.id, membership.partyId)
	});
	if (!party) return empty;

	const [logoUrl, [{ memberCount }], messages] = await Promise.all([
		getLogoUrl(party.logo),

		// The parties table has no member count column (the header used to say
		// "undefined members"), so count the memberships.
		db.select({ memberCount: count() }).from(partyMembers).where(eq(partyMembers.partyId, party.id)),

		// Messages with their sender's profile and role in this party; blocked senders are hidden.
		(async () => {
			const blockedIds = await blockedIdsOf(account.id);
			return db
				.select({
					id: chatMessages.id,
					content: chatMessages.content,
					sentAt: chatMessages.sentAt,
					senderId: chatMessages.senderId,
					senderName: userProfiles.name,
					senderLogo: userProfiles.logo,
					senderRole: partyMembers.role
				})
				.from(chatMessages)
				.leftJoin(userProfiles, eq(chatMessages.senderId, userProfiles.accountId))
				.leftJoin(partyMembers, and(eq(partyMembers.userId, chatMessages.senderId), eq(partyMembers.partyId, party.id)))
				.where(
					and(
						eq(chatMessages.messageType, "party"),
						eq(chatMessages.partyId, party.id),
						eq(chatMessages.isDeleted, false),
						blockedIds.length > 0 ? notInArray(chatMessages.senderId, blockedIds) : undefined
					)
				)
				.orderBy(desc(chatMessages.sentAt))
				.limit(100);
		})()
	]);

	const senderLogos = await Promise.all(messages.map((msg) => getLogoUrl(msg.senderLogo)));

	const processedMessages = messages.map((msg, i) => ({
		id: msg.id,
		content: msg.content,
		sentAt: msg.sentAt.toISOString(),
		senderId: msg.senderId,
		senderName: msg.senderName || "Anonymous",
		senderLogo: senderLogos[i],
		isFromCurrentUser: msg.senderId === account.id,
		isLeader: msg.senderRole === "leader"
	}));

	return {
		party: {
			id: party.id,
			name: party.name,
			logo: logoUrl,
			memberCount
		},
		messages: processedMessages.reverse(),
		currentUserId: account.id,
		canModerate: canModerate(account)
	};
};

async function notifyParty(partyId: number) {
	const members = await db.query.partyMembers.findMany({ where: eq(partyMembers.partyId, partyId) });
	messageNotifier.notify(
		members.map((m) => m.userId),
		{ messageType: "party" }
	);
}

export const actions: Actions = {
	send: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });

		const membership = await membershipOf(account.id);
		if (!membership) return fail(403, { error: "You must be a party member to send messages" });

		const { content, error } = readContent(await request.formData());
		if (error) return error;

		const blocked = await checkCanSend(account, "party");
		if (blocked) return blocked;

		const [inserted] = await db
			.insert(chatMessages)
			.values({ senderId: account.id, messageType: "party", partyId: membership.partyId, content })
			.returning({ id: chatMessages.id });

		await notifyParty(membership.partyId);
		return { success: true, id: inserted.id };
	},

	deleteMessage: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });

		const membership = await membershipOf(account.id);
		if (!membership) return fail(403, { error: "You are not in a party" });

		const { error } = await deleteMessage(account, await request.formData(), {
			type: "party",
			partyId: membership.partyId
		});
		if (error) return error;

		await notifyParty(membership.partyId);
		return { success: true };
	},

	reportMessage: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });

		const membership = await membershipOf(account.id);
		if (!membership) return fail(403, { error: "You are not in a party" });

		return reportMessage(account, await request.formData(), { type: "party", partyId: membership.partyId });
	},

	blockUser: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });
		const formData = await request.formData();
		return blockUser(account, (formData.get("blockedUserId") as string) || null);
	}
};
