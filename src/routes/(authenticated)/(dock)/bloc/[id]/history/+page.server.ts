import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { db } from "#lib/server/db.js";
import { blocs } from "#lib/server/schema.js";
import { historyFor } from "#lib/server/services/military/history.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [bloc] = await db.select({ name: blocs.name }).from(blocs).where(eq(blocs.id, id));
	if (!bloc) error(404, "Bloc not found");
	return { id, title: bloc.name, entries: await historyFor(db, "bloc", id) };
};
