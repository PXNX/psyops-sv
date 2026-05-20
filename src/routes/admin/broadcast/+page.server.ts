import { db } from "$lib/server/db";
import { broadcasts } from "$lib/server/schema";
import { fail } from "@sveltejs/kit";
import { eq, and, desc } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const activeBroadcast = await db.query.broadcasts.findFirst({
		where: and(eq(broadcasts.broadcastType, "system"), eq(broadcasts.isActive, true)),
		orderBy: [desc(broadcasts.createdAt)],
		with: { issuer: { with: { profile: true } } }
	});

	const recentBroadcasts = await db.query.broadcasts.findMany({
		where: eq(broadcasts.broadcastType, "system"),
		orderBy: [desc(broadcasts.createdAt)],
		limit: 10,
		with: { issuer: { with: { profile: true } } }
	});

	return {
		activeBroadcast,
		recentBroadcasts
	};
};

export const actions: Actions = {
	sendBroadcast: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const title = formData.get("subject") as string;
		const content = formData.get("content") as string;

		if (!title || !content) {
			return fail(400, { error: "Subject and content are required" });
		}

		if (title.length > 200) {
			return fail(400, { error: "Subject too long (max 200 characters)" });
		}

		if (content.length > 2000) {
			return fail(400, { error: "Content too long (max 2000 characters)" });
		}

		try {
			// Deactivate any existing active system broadcasts
			await db
				.update(broadcasts)
				.set({ isActive: false })
				.where(and(eq(broadcasts.broadcastType, "system"), eq(broadcasts.isActive, true)));

			await db.insert(broadcasts).values({
				broadcastType: "system",
				title,
				content,
				issuedBy: account.id,
				isActive: true
			});

			return { success: true, message: "System broadcast published!" };
		} catch (err) {
			console.error("Error sending broadcast:", err);
			return fail(500, { error: "Failed to send broadcast" });
		}
	},

	revokeBroadcast: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const broadcastId = Number(formData.get("broadcastId"));

		if (!broadcastId) {
			return fail(400, { error: "Broadcast ID is required" });
		}

		try {
			await db.update(broadcasts).set({ isActive: false }).where(eq(broadcasts.id, broadcastId));
			return { success: true, message: "Broadcast revoked." };
		} catch (err) {
			console.error("Error revoking broadcast:", err);
			return fail(500, { error: "Failed to revoke broadcast" });
		}
	}
};
