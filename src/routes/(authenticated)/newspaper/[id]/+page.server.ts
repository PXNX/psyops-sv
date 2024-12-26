import { db, NEWSPAPER, USER } from "$lib/server/db";
import { jsonify, RecordId } from "surrealdb";
import type { RequestEvent } from "./$types";

export type NewspaperDetail = {
	id: RecordId<typeof NEWSPAPER>;
	name: string;
	avatar: string;
	createdAt: Date;
	owner: {
		id: RecordId<typeof USER>;
		name: string;
		avatar: string;
	};
};

export const load = async (event: RequestEvent) => {
	const [[newspaper]] = await db.query<[NewspaperDetail[]]>(
		"SELECT  ->newspaper.id.first() AS id, ->newspaper.name.first() AS name, ->newspaper.avatar.first() AS avatar, ->newspaper.createdAt.first() AS createdAt, <-user.{id,name,avatar}.first() AS owner FROM $newspaperId<-journalist WHERE rank = 'owner';$newspaperId",
		{
			newspaperId: new RecordId(NEWSPAPER, event.params.id)
		}
	);
	console.log(JSON.stringify(newspaper));
	const newspaperData = jsonify(newspaper);
	return { newspaper: newspaperData };
};
