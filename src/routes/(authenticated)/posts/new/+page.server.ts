import type { PageServerLoad, Actions } from "./$types";
import { jsonify } from "surrealdb";
import { Newspaper } from "$lib/server/newspaper";
import { db } from "$lib/server/db";
import type { RequestEvent } from "./$types";
import { extractId } from "$lib/util";

export const load = async (event: RequestEvent) => {
	const [newspapers] = await db.query<Newspaper[]>(
		"SELECT *,<-journalist.rank.first() as rank FROM $userId->journalist->newspapers;",
		{ userId: event.locals.user.id }
	);

	return { newspapers: newspapers.map((newspaper: Newspaper) => ({ ...newspaper, id: extractId(newspaper.id) })) };
};
