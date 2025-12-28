// src/routes/(authenticated)/chat/+page.server.ts
import { db } from "$lib/server/db";
import {
	chatMessages,
	accounts,
	userProfiles,
	files,
	residences,
	regions,
	states,
	partyMembers,
	politicalParties
} from "$lib/server/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account;
	if (!account) {
		return { messages: [], userInfo: null };
	}

	const chatType = url.searchParams.get("type") || "global";

	// Get user's residence to determine state
	const residence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id),
		with: {
			region: {
				with: {
					state: true
				}
			}
		}
	});

	// Get user's party membership
	const partyMembership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id),
		with: {
			party: true
		}
	});

	// Build query conditions
	let whereConditions;
	if (chatType === "state" && residence) {
		whereConditions = and(eq(chatMessages.messageType, "state"), eq(chatMessages.stateId, residence.region.state.id));
	} else if (chatType === "party" && partyMembership) {
		whereConditions = and(eq(chatMessages.messageType, "party"), eq(chatMessages.partyId, partyMembership.partyId));
	} else {
		whereConditions = eq(chatMessages.messageType, "global");
	}

	// Get messages
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
		.leftJoin(accounts, eq(chatMessages.senderId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(whereConditions)
		.orderBy(desc(chatMessages.sentAt))
		.limit(100);

	// Process logos
	const processedMessages = await Promise.all(
		messages.map(async (msg) => {
			let logoUrl = null;
			if (msg.senderLogo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, msg.senderLogo)
				});
				if (logoFile) {
					try {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {}
				}
			}
			return {
				...msg,
				senderLogo: logoUrl,
				sentAt: msg.sentAt.toISOString()
			};
		})
	);

	return {
		messages: processedMessages.reverse(),
		userInfo: {
			hasState: !!residence,
			stateId: residence?.region.state.id || null,
			stateName: residence?.region.state.name || null,
			hasParty: !!partyMembership,
			partyId: partyMembership?.partyId || null,
			partyName: partyMembership?.party.name || null
		},
		currentType: chatType
	};
};

export const actions: Actions = {
	sendMessage: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		const formData = await request.formData();
		const content = formData.get("content") as string;
		const messageType = formData.get("type") as "global" | "state" | "party";

		if (!content || content.trim().length === 0) {
			return fail(400, { error: "Message cannot be empty" });
		}

		if (content.length > 500) {
			return fail(400, { error: "Message too long (max 500 characters)" });
		}

		let stateId = null;
		let partyId = null;

		if (messageType === "state") {
			const residence = await db.query.residences.findFirst({
				where: eq(residences.userId, account.id),
				with: { region: true }
			});
			if (!residence) {
				return fail(400, { error: "You must be a resident to use state chat" });
			}
			stateId = residence.region.stateId;
		}

		if (messageType === "party") {
			const membership = await db.query.partyMembers.findFirst({
				where: eq(partyMembers.userId, account.id)
			});
			if (!membership) {
				return fail(400, { error: "You must be a party member to use party chat" });
			}
			partyId = membership.partyId;
		}

		await db.insert(chatMessages).values({
			senderId: account.id,
			messageType,
			stateId,
			partyId,
			content: content.trim()
		});

		return { success: true };
	}
};
