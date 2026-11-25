// src/routes/(authenticated)/(dock)/user/[id]/history/+page.server.ts
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { accounts, userProfiles } from "#lib/server/schema.js";
import { historyFor } from "#lib/server/services/military/history.js";

export const load: PageServerLoad = async ({ params }) => {
	const [account] = await db
		.select({ id: accounts.id, email: accounts.email })
		.from(accounts)
		.where(eq(accounts.id, params.id))
		.limit(1);
	if (!account) error(404, "User not found");
	const [profile] = await db
		.select({ name: userProfiles.name })
		.from(userProfiles)
		.where(eq(userProfiles.accountId, params.id))
		.limit(1);
	return {
		id: account.id,
		title: profile?.name || account.email.split("@")[0]!,
		entries: await historyFor(db, "user", account.id, { oldestFirst: true })
	};
};
