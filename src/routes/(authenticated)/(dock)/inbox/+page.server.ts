// src/routes/(authenticated)/inbox/+page.server.ts
import { db } from "$lib/server/db";
import { residences, regions, partyMembers, presidents, inboxMessages, accounts } from "$lib/server/schema";
import { eq, desc, and } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;
	if (!account) {
		return {
			canBroadcastState: false,
			canBroadcastParty: false
		};
	}

	// Check if user is president
	const presidency = await db.query.presidents.findFirst({
		where: eq(presidents.userId, account.id)
	});

	// Check if user is party leader
	const partyLeadership = await db.query.partyMembers.findFirst({
		where: and(eq(partyMembers.userId, account.id), eq(partyMembers.role, "leader"))
	});

	return {
		canBroadcastState: !!presidency,
		canBroadcastParty: !!partyLeadership,
		stateId: presidency?.stateId,
		partyId: partyLeadership?.partyId
	};
};

export const actions: Actions = {
	broadcastState: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		// Check if user is president
		const presidency = await db.query.presidents.findFirst({
			where: eq(presidents.userId, account.id)
		});

		if (!presidency) {
			return fail(403, { error: "Only presidents can send state broadcasts" });
		}

		const formData = await request.formData();
		const subject = formData.get("subject") as string;
		const content = formData.get("content") as string;

		if (!subject || !content) {
			return fail(400, { error: "Subject and content are required" });
		}

		if (subject.length > 200) {
			return fail(400, { error: "Subject too long (max 200 characters)" });
		}

		if (content.length > 2000) {
			return fail(400, { error: "Content too long (max 2000 characters)" });
		}

		// Get all residents of the state
		const residents = await db
			.select({ userId: residences.userId })
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.where(eq(regions.stateId, presidency.stateId));

		// Create inbox message for each resident
		const messages = residents.map((resident) => ({
			recipientId: resident.userId,
			senderId: account.id,
			messageType: "state_broadcast" as const,
			stateId: presidency.stateId,
			subject,
			content,
			isRead: false
		}));

		if (messages.length > 0) {
			await db.insert(inboxMessages).values(messages);
		}

		return { success: true, recipientCount: messages.length };
	},

	broadcastParty: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		// Check if user is party leader
		const membership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.userId, account.id), eq(partyMembers.role, "leader"))
		});

		if (!membership) {
			return fail(403, { error: "Only party leaders can send party broadcasts" });
		}

		const formData = await request.formData();
		const subject = formData.get("subject") as string;
		const content = formData.get("content") as string;

		if (!subject || !content) {
			return fail(400, { error: "Subject and content are required" });
		}

		if (subject.length > 200) {
			return fail(400, { error: "Subject too long (max 200 characters)" });
		}

		if (content.length > 2000) {
			return fail(400, { error: "Content too long (max 2000 characters)" });
		}

		// Get all party members
		const members = await db
			.select({ userId: partyMembers.userId })
			.from(partyMembers)
			.where(eq(partyMembers.partyId, membership.partyId));

		// Create inbox message for each member
		const messages = members.map((member) => ({
			recipientId: member.userId,
			senderId: account.id,
			messageType: "party_broadcast" as const,
			partyId: membership.partyId,
			subject,
			content,
			isRead: false
		}));

		if (messages.length > 0) {
			await db.insert(inboxMessages).values(messages);
		}

		return { success: true, recipientCount: messages.length };
	}
};
