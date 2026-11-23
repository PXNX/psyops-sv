import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { db } from "#lib/server/db.js";
import { states } from "#lib/server/schema.js";
import { historyFor } from "#lib/server/services/military/history.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [state] = await db.select({ name: states.name }).from(states).where(eq(states.id, id));
	if (!state) error(404, "State not found");
	return { id, title: state.name, entries: await historyFor(db, "state", id) };
};
