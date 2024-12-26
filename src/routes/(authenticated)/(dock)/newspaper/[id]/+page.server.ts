import { getDb, NEWSPAPER, USER } from "$lib/server/db";
import { Gap, RecordId, surql } from "surrealdb";
import type { RequestEvent } from "./$types";

export type NewspaperDetail = {
	newspaper: {
		id: RecordId<typeof NEWSPAPER>;
		name: string;
		avatar: string;
		createdAt: Date;
	};
	owner: {
		id: RecordId<typeof USER>;
		name: string;
		avatar: string;
	};
};

const newspaperId = new Gap<RecordId<typeof NEWSPAPER>>();
const query = surql`SELECT ->newspaper.{id,name,avatar,createdAt}.first() AS newspaper, <-user.{id,name,avatar}.first() AS owner FROM ${newspaperId}<-journalist WHERE rank = 'owner'`;

export const load = async (event: RequestEvent) => {
	const db = await getDb();
	const [[newspaper]] = await db.query<[NewspaperDetail[]]>(query, [
		newspaperId.fill(new RecordId(NEWSPAPER, event.params.id))
	]);

	console.log(event.params.id, JSON.stringify(newspaper));
	return {
		owner: {
			...newspaper.owner,
			id: newspaper.owner.id.id
		},
		newspaper: { ...newspaper.newspaper, id: newspaper.newspaper.id.id }
	};
};
