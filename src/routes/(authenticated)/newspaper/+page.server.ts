import type { Newspaper } from "$lib/server/newspaper";
import type { PageServerLoad, RequestEvent } from "./$types";

import { db } from "$lib/server/db";
import { extractId } from "$lib/util";

export const load: PageServerLoad = async (event: RequestEvent) => {
	const [newspapers] = await db.query<[Newspaper[]]>(
		"SELECT *,<-journalist.rank.first() as rank FROM $userId->journalist->newspaper;",
		{
			userId: event.locals.account!.id
		}
	);
	return { newspapers: newspapers.map((newspaper: Newspaper) => ({ ...newspaper, id: extractId(newspaper.id) })) };
};
