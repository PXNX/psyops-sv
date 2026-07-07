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
			loadImages: profile?.loadImages ?? true,
			telegramUsername: profile?.telegramUsername,
			telegramId: profile?.telegramId
		}
	};
};

export const actions: Actions = {
	logout: async () => {
		return redirect(302, "/auth/logout");
	},
	disconnectTelegram: async ({ locals }) => {
		const account = locals.account!;

		try {
			await db
				.update(userProfiles)
				.set({
					telegramId: null,
					telegramUsername: null,
					updatedAt: new Date()
				})
				.where(eq(userProfiles.accountId, account.id));

			return { success: true };
		} catch (err) {
			console.error("Telegram disconnect error:", err);
			return fail(500, { error: "Failed to disconnect Telegram account" });
		}
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
			await db.update(accounts).set(updates).where(eq(accounts.id, account.id));

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
	},
	deleteAccount: async ({ request, locals, cookies }) => {
		const account = locals.account;

		// The session may already be gone (e.g. the account was deleted on a
		// previous attempt). Treat that as success and send the user home instead
		// of dereferencing a null account.
		if (!account) {
			cookies.delete("session", { path: "/" });
			return redirect(302, "/");
		}

		const formData = await request.formData();
		const confirmation = formData.get("confirmation");

		if (confirmation !== "DELETE") {
			return fail(400, { deleteError: "Please type DELETE to confirm account deletion." });
		}

		try {
			await db.delete(accounts).where(eq(accounts.id, account.id));
			cookies.delete("session", { path: "/" });
		} catch (err) {
			console.error("Delete account error:", err);
			return fail(500, { deleteError: "Failed to delete account. Please try again." });
		}

		// redirect() signals via a thrown control-flow object, so it must live
		// outside the try/catch above — otherwise the successful redirect is caught
		// and logged as an error instead of redirecting the user.
		return redirect(302, "/");
	}
};
