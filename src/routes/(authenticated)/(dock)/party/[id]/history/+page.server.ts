import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { db } from "#lib/server/db.js";
import { politicalParties } from "#lib/server/schema.js";
import { historyFor } from "#lib/server/services/military/history.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [party] = await db
		.select({ name: politicalParties.name })
		.from(politicalParties)
		.where(eq(politicalParties.id, id));
	if (!party) error(404, "Party not found");
	return { id, title: party.name, entries: await historyFor(db, "party", id, { oldestFirst: true }) };
};
