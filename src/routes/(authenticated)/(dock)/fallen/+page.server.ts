import { db } from "$lib/server/db";
import { states, blocs } from "$lib/server/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getLogoUrl } from "$lib/server/backblaze";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	// --- Fallen (capitulated) states ---
	const fallenStatesRaw = await db
		.select({
			id: states.id,
			name: states.name,
			logo: states.logo,
			population: states.population,
			createdAt: states.createdAt,
			capitulatedAt: states.capitulated_at,
			blocId: states.blocId,
			blocName: blocs.name,
			blocColor: blocs.color
		})
		.from(states)
		.leftJoin(blocs, eq(states.blocId, blocs.id))
		.where(eq(states.capitulated, true))
		.orderBy(desc(states.capitulated_at));

	const fallenStates = await Promise.all(
		fallenStatesRaw.map(async (s) => ({
			id: s.id,
			name: s.name,
			logo: await getLogoUrl(s.logo),
			population: s.population ?? 0,
			createdAt: s.createdAt,
			capitulatedAt: s.capitulatedAt,
			bloc: s.blocId && s.blocName ? { id: s.blocId, name: s.blocName, color: s.blocColor } : null
		}))
	);

	// --- Fallen (capitulated) blocs, with member state counts ---
	const memberCounts = await db
		.select({ blocId: states.blocId, count: sql<number>`count(*)::int` })
		.from(states)
		.groupBy(states.blocId);

	const memberCountMap = new Map<number, number>();
	for (const row of memberCounts) {
		if (row.blocId != null) memberCountMap.set(row.blocId, row.count);
	}

	const fallenBlocsRaw = await db
		.select()
		.from(blocs)
		.where(eq(blocs.capitulated, true))
		.orderBy(desc(blocs.capitulated_at));

	const fallenBlocs = await Promise.all(
		fallenBlocsRaw.map(async (b) => ({
			id: b.id,
			name: b.name,
			color: b.color,
			logo: await getLogoUrl(b.logo),
			memberStates: memberCountMap.get(b.id) ?? 0,
			createdAt: b.createdAt,
			capitulatedAt: b.capitulated_at
		}))
	);

	return { fallenStates, fallenBlocs };
};
