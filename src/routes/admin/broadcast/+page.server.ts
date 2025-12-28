// src/routes/(authenticated)/admin/broadcast/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, inboxMessages } from "$lib/server/schema";
import { error, fail, redirect } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get total user count
	const [userCountResult] = await db.select({ count: sql<number>`count(*)::int` }).from(accounts);

	return {
		totalUsers: userCountResult?.count || 0
	};
};

export const actions: Actions = {
	sendBroadcast: async ({ request, locals }) => {
		const account = locals.account!;

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
			// Get all user IDs
			const users = await db.select({ id: accounts.id }).from(accounts);

			// Create inbox message for each user
			const messages = users.map((user) => ({
				recipientId: user.id,
				senderId: account.id,
				messageType: "system" as const,
				subject,
				content,
				isRead: false
			}));

			// Batch insert (be careful with large user bases - might want to chunk this)
			if (messages.length > 0) {
				// For large databases, you might want to chunk this into smaller batches
				const BATCH_SIZE = 1000;
				for (let i = 0; i < messages.length; i += BATCH_SIZE) {
					const batch = messages.slice(i, i + BATCH_SIZE);
					await db.insert(inboxMessages).values(batch);
				}
			}

			return {
				success: true,
				recipientCount: messages.length,
				message: `Broadcast sent to ${messages.length} user${messages.length !== 1 ? "s" : ""}!`
			};
		} catch (err) {
			console.error("Error sending broadcast:", err);
			return fail(500, { error: "Failed to send broadcast" });
		}
	}
};
