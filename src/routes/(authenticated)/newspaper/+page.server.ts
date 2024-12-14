import type { PageServerLoad, Actions, RequestEvent } from "./$types";
import { jsonify } from "surrealdb";
import { Newspaper } from "$lib/server/newspaper";

import { extractId } from "$lib/util";
import { db } from "../../../lib/server/db";

export const load = async (event: RequestEvent): PageServerLoad => {
	const [newspapers] = db.query<Newspaper[]>(
		"SELECT *,<-journalist.rank.first() as rank FROM $userId->journalist->newspapers;",
		{
			userId: event.locals.user.id
		}
	);
	return { newspapers: newspapers.map((newspaper: Newspaper) => ({ ...newspaper, id: extractId(newspaper.id) })) };
};
