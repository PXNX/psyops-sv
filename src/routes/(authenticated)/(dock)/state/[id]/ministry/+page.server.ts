// The state's cabinet at a glance: all eight ministries, their holders and
// the desks each one administers. Office holding is public information.
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { ministers, presidents, states, userProfiles } from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { MINISTRIES, MINISTRY_META, roleLabel } from "#lib/config/index.js";

export const load: PageServerLoad = async ({ params }) => {
	const stateId = Number(params.id);
	if (!Number.isInteger(stateId)) error(404, "State not found");

	const [state] = await db.select({ id: states.id, name: states.name }).from(states).where(eq(states.id, stateId)).limit(1);
	if (!state) error(404, "State not found");

	const [rows, presidency] = await Promise.all([
		db
			.select({
				ministry: ministers.ministry,
				userId: ministers.userId,
				name: userProfiles.name,
				logo: userProfiles.logo,
				appointedAt: ministers.appointedAt
			})
			.from(ministers)
			.innerJoin(userProfiles, eq(userProfiles.accountId, ministers.userId))
			.where(eq(ministers.stateId, stateId)),
		db
			.select({
				userId: presidents.userId,
				name: userProfiles.name,
				logo: userProfiles.logo,
				term: presidents.term,
				electedAt: presidents.electedAt
			})
			.from(presidents)
			.innerJoin(userProfiles, eq(userProfiles.accountId, presidents.userId))
			.where(eq(presidents.stateId, stateId))
			.limit(1)
	]);

	const avatarUrls = new Map<string, string | null>();
	for (const row of [...rows, ...presidency]) {
		if (!avatarUrls.has(row.userId)) avatarUrls.set(row.userId, await getLogoUrl(row.logo));
	}

	return {
		state,
		president: presidency[0]
			? {
					...presidency[0],
					avatar: avatarUrls.get(presidency[0].userId) ?? null,
					electedAt: presidency[0].electedAt.toISOString()
				}
			: null,
		offices: MINISTRIES.map((ministry) => {
			const holder = rows.find((r) => r.ministry === ministry);
			return {
				ministry,
				...MINISTRY_META[ministry],
				portfolioLabel: roleLabel(MINISTRY_META[ministry].portfolio),
				holder: holder
					? {
							id: holder.userId,
							name: holder.name,
							avatar: avatarUrls.get(holder.userId) ?? null,
							appointedAt: holder.appointedAt.toISOString()
						}
					: null
			};
		})
	};
};
