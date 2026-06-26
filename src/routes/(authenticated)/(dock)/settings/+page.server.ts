// src/routes/(authenticated)/(dock)/settings/+page.server.ts
import { db } from "$lib/server/db";
import { userProfiles, accounts } from "$lib/server/schema";
import { redirect, fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const profile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	return {
		profile: {
			email: account.email,
			name: profile?.name,
			notifyNewspaperPosts: account.notifyNewspaperPosts,
			notifyDirectMessages: account.notifyDirectMessages,
			notifyWarDeclarations: account.notifyWarDeclarations,
			notifyBattleResults: account.notifyBattleResults,
			notifyElections: account.notifyElections,
			notifyTravelComplete: account.notifyTravelComplete,
			notifyShiftComplete: account.notifyShiftComplete,
			notifyMarketSales: account.notifyMarketSales,
			notifyNewProposals: account.notifyNewProposals,
			theme: profile?.theme ?? "dark",
			loadImages: profile?.loadImages ?? true
		}
	};
};

export const actions: Actions = {
	logout: async () => {
		return redirect(302, "/auth/logout");
	},
	updateNotifications: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();

		const updates: Record<string, any> = { updatedAt: new Date() };

		const notificationFields = [
			"notifyNewspaperPosts",
			"notifyDirectMessages",
			"notifyWarDeclarations",
			"notifyBattleResults",
			"notifyElections",
			"notifyTravelComplete",
			"notifyShiftComplete",
			"notifyMarketSales",
			"notifyNewProposals"
		];

		for (const field of notificationFields) {
			const value = formData.get(field);
			if (value !== null) {
				updates[field] = value === "true";
			}
		}

		try {
			await db
				.update(accounts)
				.set(updates)
				.where(eq(accounts.id, account.id));

			return { success: true };
		} catch (err) {
			console.error("Update notifications error:", err);
			return fail(500, { error: "Failed to update notification settings" });
		}
	},
	updateSettings: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const theme = formData.get("theme") as string;
		const loadImages = formData.get("loadImages") === "true";

		try {
			await db
				.update(userProfiles)
				.set({
					theme: theme || "dark",
					loadImages,
					updatedAt: new Date()
				})
				.where(eq(userProfiles.accountId, account.id));

			return { success: true };
		} catch (err) {
			console.error("Update settings error:", err);
			return fail(500, { error: "Failed to update settings" });
		}
	}
};
