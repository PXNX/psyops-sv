// src/routes/(authenticated)/(dock)/newspaper/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export type NewspaperEntry = {
	id: string;
	name: string;
	logo: string | null;
	rank: "author" | "editor" | "owner";
};

export const load: PageServerLoad = async ({ locals }) => {
	// Query newspapers the user is a journalist for
	const result = await db
		.select({
			id: newspapers.id,
			name: newspapers.name,
			logo: newspapers.logo,
			rank: journalists.rank
		})
		.from(journalists)
		.innerJoin(newspapers, eq(journalists.newspaperId, newspapers.id))
		.where(eq(journalists.userId, locals.account!.id));

	console.log(JSON.stringify(result));

	return {
		newspapers: result
	};
};
