import { db } from "$lib/server/db";
import { broadcasts, partyMembers, presidents } from "$lib/server/schema";
import { eq, and, desc } from "drizzle-orm";
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

	const presidency = await db.query.presidents.findFirst({
		where: eq(presidents.userId, account.id)
	});

	const partyLeadership = await db.query.partyMembers.findFirst({
		where: and(eq(partyMembers.userId, account.id), eq(partyMembers.role, "leader"))
	});

	let activeStateBroadcast = null;
	if (presidency) {
		activeStateBroadcast = await db.query.broadcasts.findFirst({
			where: and(
				eq(broadcasts.broadcastType, "state"),
				eq(broadcasts.stateId, presidency.stateId),
				eq(broadcasts.isActive, true)
			),
			orderBy: [desc(broadcasts.createdAt)],
			with: { issuer: { with: { profile: true } } }
		});
	}

	let activePartyBroadcast = null;
	if (partyLeadership) {
		activePartyBroadcast = await db.query.broadcasts.findFirst({
			where: and(
				eq(broadcasts.broadcastType, "party"),
				eq(broadcasts.partyId, partyLeadership.partyId),
				eq(broadcasts.isActive, true)
			),
			orderBy: [desc(broadcasts.createdAt)],
			with: { issuer: { with: { profile: true } } }
		});
	}

	return {
		canBroadcastState: !!presidency,
		canBroadcastParty: !!partyLeadership,
		stateId: presidency?.stateId,
		partyId: partyLeadership?.partyId,
		activeStateBroadcast,
		activePartyBroadcast
	};
};

export const actions: Actions = {
	broadcastState: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

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

		try {
			// Deactivate existing active state broadcast for this state
			await db
				.update(broadcasts)
				.set({ isActive: false })
				.where(
					and(
						eq(broadcasts.broadcastType, "state"),
						eq(broadcasts.stateId, presidency.stateId),
						eq(broadcasts.isActive, true)
					)
				);

			await db.insert(broadcasts).values({
				broadcastType: "state",
				title: subject,
				content,
				issuedBy: account.id,
				stateId: presidency.stateId,
				isActive: true
			});

			return { success: true };
		} catch (err) {
			console.error("Error sending state broadcast:", err);
			return fail(500, { error: "Failed to send broadcast" });
		}
	},

	broadcastParty: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

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

		try {
			// Deactivate existing active party broadcast for this party
			await db
				.update(broadcasts)
				.set({ isActive: false })
				.where(
					and(
						eq(broadcasts.broadcastType, "party"),
						eq(broadcasts.partyId, membership.partyId),
						eq(broadcasts.isActive, true)
					)
				);

			await db.insert(broadcasts).values({
				broadcastType: "party",
				title: subject,
				content,
				issuedBy: account.id,
				partyId: membership.partyId,
				isActive: true
			});

			return { success: true };
		} catch (err) {
			console.error("Error sending party broadcast:", err);
			return fail(500, { error: "Failed to send broadcast" });
		}
	},

	revokeStateBroadcast: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });

		const presidency = await db.query.presidents.findFirst({
			where: eq(presidents.userId, account.id)
		});
		if (!presidency) return fail(403, { error: "Only presidents can revoke state broadcasts" });

		const formData = await request.formData();
		const broadcastId = Number(formData.get("broadcastId"));
		if (!broadcastId) return fail(400, { error: "Broadcast ID required" });

		await db.update(broadcasts).set({ isActive: false }).where(eq(broadcasts.id, broadcastId));
		return { success: true };
	},

	revokePartyBroadcast: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) return fail(401, { error: "Not authenticated" });

		const membership = await db.query.partyMembers.findFirst({
			where: and(eq(partyMembers.userId, account.id), eq(partyMembers.role, "leader"))
		});
		if (!membership) return fail(403, { error: "Only party leaders can revoke party broadcasts" });

		const formData = await request.formData();
		const broadcastId = Number(formData.get("broadcastId"));
		if (!broadcastId) return fail(400, { error: "Broadcast ID required" });

		await db.update(broadcasts).set({ isActive: false }).where(eq(broadcasts.id, broadcastId));
		return { success: true };
	}
};
