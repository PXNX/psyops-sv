// src/routes/(authenticated)/(dock)/user/richest/+page.server.ts
// The server-wide net worth ranking. Names link to profiles, not balance sheets.
import { db } from "#lib/server/db.js";
import { richestPlayers } from "#lib/server/services/economy/net-worth.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => ({
	players: await richestPlayers(db, 50),
	viewerId: locals.account!.id
});
