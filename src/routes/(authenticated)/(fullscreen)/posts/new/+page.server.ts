import { getDb } from "$lib/server/db";
import type { Newspaper } from "$lib/server/newspaper";
import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	const db = await getDb();
	const newspapers = await db.query<Newspaper[]>(
		"SELECT *,<-journalist.rank.first() as rank FROM $userId->journalist->newspaper;",
		{ userId: event.locals.account?.id }
	);

	return {
		newspapers: [
			{ id: "1", name: "The Sun", rank: "owner" },
			{ id: "2", name: "The Times", rank: "owner" }
		]
	}; // { newspapers: newspapers?.map((newspaper: Newspaper) => ({ ...newspaper, id: extractId(newspaper?.id) })) };
};
