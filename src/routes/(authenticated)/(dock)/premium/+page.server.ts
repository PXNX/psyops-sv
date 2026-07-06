// src/routes/(authenticated)/(dock)/premium/+page.server.ts
import { db } from "$lib/server/db";
import { userProfiles } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { env as publicEnv } from "$env/dynamic/public";
import { PREMIUM_PLANS } from "$lib/config";
import { getPremiumStatus, setPremiumAutomation } from "$lib/server/service/premium";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const status = await getPremiumStatus(account.id);
	const [profile] = await db
		.select({ telegramUsername: userProfiles.telegramUsername })
		.from(userProfiles)
		.where(eq(userProfiles.accountId, account.id));

	return {
		status,
		plans: Object.values(PREMIUM_PLANS),
		telegramLinked: !!profile?.telegramUsername,
		botUsername: publicEnv.PUBLIC_TELEGRAM_BOT_USERNAME || null
	};
};

export const actions: Actions = {
	toggleAutomation: async ({ request, locals }) => {
		const account = locals.account!;
		const enabled = (await request.formData()).get("enabled") === "true";
		await setPremiumAutomation(account.id, enabled);
		return { success: true };
	}
};
