import type { PageServerLoad, Actions, RequestEvent } from "./$types";
import { jsonify } from "surrealdb";
import type { Newspaper } from "$lib/server/newspaper";

import { extractId } from "$lib/util";
import { db } from "$lib/server/db";

export const load: PageServerLoad = async (event: RequestEvent) => {
	const [newspapers] = await db.query<[Newspaper[]]>(
		"SELECT *,<-journalist.rank.first() as rank FROM $userId->journalist->newspaper;",
		{
			userId: event.locals.user!.id
		}
	);
	return { newspapers: newspapers.map((newspaper: Newspaper) => ({ ...newspaper, id: extractId(newspaper.id) })) };
};
