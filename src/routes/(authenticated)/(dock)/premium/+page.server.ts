// src/routes/(authenticated)/(dock)/premium/+page.server.ts
import { db } from "$lib/server/db";
import { userProfiles, userWallets, accounts } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";
import { PREMIUM_PLANS } from "$lib/config";
import {
	buyPremiumWithCurrency,
	getPremiumStatus,
	giftPremium,
	setPremiumAutomation
} from "$lib/server/service/premium";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const status = await getPremiumStatus(account.id);
	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));
	const [profile] = await db
		.select({ telegramUsername: userProfiles.telegramUsername })
		.from(userProfiles)
		.where(eq(userProfiles.accountId, account.id));

	return {
		status,
		plans: Object.values(PREMIUM_PLANS),
		balance: wallet?.balance ?? 0,
		telegramLinked: !!profile?.telegramUsername,
		botUsername: publicEnv.PUBLIC_TELEGRAM_BOT_USERNAME || null
	};
};

export const actions: Actions = {
	buy: async ({ request, locals }) => {
		const account = locals.account!;
		const planId = (await request.formData()).get("planId") as string;

		const result = await buyPremiumWithCurrency(account.id, planId);
		if (!result.success) {
			return fail(400, { error: result.error });
		}
		return { success: true, message: "Premium membership activated!" };
	},

	gift: async ({ request, locals }) => {
		const account = locals.account!;
		const formData = await request.formData();
		const planId = formData.get("planId") as string;
		const recipientId = (formData.get("recipientId") as string)?.trim();

		if (!recipientId) {
			return fail(400, { error: "Enter the recipient's user ID" });
		}

		const recipient = await db.query.accounts.findFirst({ where: eq(accounts.id, recipientId) });
		if (!recipient) {
			return fail(400, { error: "No user found with that ID" });
		}

		const result = await giftPremium(account.id, recipientId, planId);
		if (!result.success) {
			return fail(400, { error: result.error });
		}
		return { success: true, message: "Premium membership gifted!" };
	},

	toggleAutomation: async ({ request, locals }) => {
		const account = locals.account!;
		const enabled = (await request.formData()).get("enabled") === "true";
		await setPremiumAutomation(account.id, enabled);
		return { success: true };
	}
};
