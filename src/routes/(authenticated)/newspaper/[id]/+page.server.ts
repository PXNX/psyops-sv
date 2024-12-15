import type { PageServerLoad, Actions } from "./$types";
import { jsonify, RecordId } from "surrealdb";
import type { Newspaper } from "$lib/server/newspaper";
import { db } from "$lib/server/db";
import type { RequestEvent } from "./$types";
import { extractId } from "$lib/util";

export const load = async (event: RequestEvent) => {
	const newspaper = await db.select<Newspaper>(new RecordId("newspaper", event.params.id));

	return { newspaper: { ...newspaper, id: extractId(newspaper.id) } };
};
