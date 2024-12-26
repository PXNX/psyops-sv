import type { PageServerLoad, RequestEvent } from "./$types";

import { getDb, NEWSPAPER } from "$lib/server/db";
import { extractId } from "$lib/util";
import type { RecordId } from "surrealdb";

export type NewspaperEntry = {
	id: RecordId<typeof NEWSPAPER>;
	name: string;
	avatar: string;
	rank: string;
};

export const load: PageServerLoad = async (event: RequestEvent) => {
	const db = await getDb();
	const [newspapers] = await db.query<[NewspaperEntry[]]>(
		"SELECT id,name,avatar,<-journalist.rank.first() as rank FROM $userId->journalist->newspaper;",
		{
			userId: event.locals.account!.id
		}
	);
	console.log(JSON.stringify(newspapers));
	return { newspapers: newspapers.map((newspaper: NewspaperEntry) => ({ ...newspaper, id: extractId(newspaper.id) })) };
};
