// src/routes/(authenticated)/(dock)/user/[id]/networth/+page.server.ts
// A player's balance sheet: cash, shares, stockpiles and bonds, with the
// richest players board alongside it.
import { db } from "#lib/server/db.js";
import { accounts, userProfiles } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { netWorth, richestPlayers } from "#lib/server/services/economy/net-worth.js";

export const load: PageServerLoad = async ({ params }) => {
	const [account] = await db
		.select({ id: accounts.id, email: accounts.email })
		.from(accounts)
		.where(eq(accounts.id, params.id))
		.limit(1);
	if (!account) throw error(404, "User not found");

	const [[profile], worth, leaders] = await Promise.all([
		db.select({ name: userProfiles.name }).from(userProfiles).where(eq(userProfiles.accountId, params.id)).limit(1),
		netWorth(db, params.id),
		richestPlayers(db, 25)
	]);

	return {
		userId: params.id,
		userName: profile?.name || account.email.split("@")[0]!,
		worth,
		leaders
	};
};
