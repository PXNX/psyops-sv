// Who may order buildings directly, without a parliament vote: the
// president builds anything, the economy minister civilian buildings, the
// defense minister fortifications, and a region's governor anything in it.
import { and, eq } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { governors, ministers, parliamentMembers, presidents } from "#lib/server/schema.js";
import { BUILDING_TEMPLATES, VALID_BUILDING_TYPES, type BuildingType } from "#lib/config/index.js";

export type ConstructionRole = "president" | "governor" | "economy" | "defense";

const CIVILIAN: BuildingType[] = ["infrastructure", "school", "hospital", "power_plant"];

export async function canOrderConstruction(
	db: Database,
	userId: string,
	stateId: number,
	regionId: number
): Promise<{ roles: ConstructionRole[]; types: BuildingType[] }> {
	const [president, governor, ministries] = await Promise.all([
		db.query.presidents.findFirst({ where: and(eq(presidents.userId, userId), eq(presidents.stateId, stateId)) }),
		db.query.governors.findFirst({ where: and(eq(governors.userId, userId), eq(governors.regionId, regionId)) }),
		db.query.ministers.findMany({ where: and(eq(ministers.userId, userId), eq(ministers.stateId, stateId)) })
	]);

	const roles: ConstructionRole[] = [];
	if (president) roles.push("president");
	if (governor) roles.push("governor");
	for (const m of ministries) if (m.ministry === "economy" || m.ministry === "defense") roles.push(m.ministry);

	const types = new Set<BuildingType>();
	// Law-only buildings (the airbase) go through parliament, never a direct order.
	if (president || governor)
		VALID_BUILDING_TYPES.filter((t) => !BUILDING_TEMPLATES[t].lawOnly).forEach((t) => types.add(t));
	if (roles.includes("economy")) CIVILIAN.forEach((t) => types.add(t));
	if (roles.includes("defense")) {
		types.add("fortifications");
		types.add("radar");
	}
	return { roles, types: [...types] };
}

/** Whether the user may put proposals before this state's parliament. */
export async function canProposeIn(db: Database, userId: string, stateId: number): Promise<boolean> {
	const [member, minister, president] = await Promise.all([
		db.query.parliamentMembers.findFirst({
			where: and(eq(parliamentMembers.userId, userId), eq(parliamentMembers.stateId, stateId))
		}),
		db.query.ministers.findFirst({ where: and(eq(ministers.userId, userId), eq(ministers.stateId, stateId)) }),
		db.query.presidents.findFirst({ where: and(eq(presidents.userId, userId), eq(presidents.stateId, stateId)) })
	]);
	return !!(member || minister || president);
}
