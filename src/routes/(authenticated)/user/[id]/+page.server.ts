import { db } from "$lib/server/db";
import type { User } from "$lib/server/user";
import { error } from "@sveltejs/kit";
import { jsonify, RecordId } from "surrealdb";
import type { PageServerLoad, RequestEvent } from "./$types";

export const load: PageServerLoad = async (event: RequestEvent) => {
	const user = await db.select<User>(new RecordId("user", event.params.id));
	if (!user) {
		error(404);
	}
	const dataUser = jsonify(user);
	console.log("user/id: " + dataUser);
	return { user: dataUser };
};
