// src/routes/(authenticated)/(fullscreen)/posts/new/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.account) {
		return { newspapers: [] };
	}

	// Query newspapers where the user is a journalist
	const userNewspapers = await db
		.select({
			id: newspapers.id,
			name: newspapers.name,
			avatar: newspapers.avatar,
			rank: journalists.rank
		})
		.from(journalists)
		.innerJoin(newspapers, eq(journalists.newspaperId, newspapers.id))
		.where(eq(journalists.userId, locals.account.id));

	return {
		newspapers: userNewspapers.map((n) => ({
			id: n.id,
			name: n.name,
			avatar: n.avatar,
			rank: n.rank
		}))
	};
};
