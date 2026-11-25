// Who may order buildings directly, without a parliament vote: the
// president builds anything, the economy minister civilian buildings, the
// defense minister fortifications (all paid by the state), and a region's
// governor the civilian works in GOVERNOR_BUILDINGS, paid by the region.
// Law-only buildings (the airbase) are never a direct order.
import { and, eq } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { governors, ministers, parliamentMembers, presidents } from "#lib/server/schema.js";
import {
	BUILDING_TEMPLATES,
	GOVERNOR_BUILDINGS,
	VALID_BUILDING_TYPES,
	isGovernorBuilding,
	type BuildingType
} from "#lib/config/index.js";

export type ConstructionRole = "president" | "governor" | "economy" | "defense";

const CIVILIAN: BuildingType[] = ["infrastructure", "school", "hospital", "power_plant"];

export async function canOrderConstruction(
	db: Database,
	userId: string,
	stateId: number,
	regionId: number
): Promise<{
	roles: ConstructionRole[];
	/** Everything the user may order here, whoever pays. */
	types: BuildingType[];
	/** What they may order paid by the state (treasury and state stockpile). */
	stateTypes: BuildingType[];
	/** What they may order as governor, paid by the region (budget and regional stockpile). */
	regionTypes: BuildingType[];
}> {
	const [president, governor, ministries] = await Promise.all([
		db.query.presidents.findFirst({ where: and(eq(presidents.userId, userId), eq(presidents.stateId, stateId)) }),
		db.query.governors.findFirst({ where: and(eq(governors.userId, userId), eq(governors.regionId, regionId)) }),
		db.query.ministers.findMany({ where: and(eq(ministers.userId, userId), eq(ministers.stateId, stateId)) })
	]);

	const roles: ConstructionRole[] = [];
	if (president) roles.push("president");
	if (governor) roles.push("governor");
	for (const m of ministries) if (m.ministry === "economy" || m.ministry === "defense") roles.push(m.ministry);

	const stateTypes = new Set<BuildingType>();
	// Law-only buildings (the airbase) go through parliament, never a direct order.
	if (president) VALID_BUILDING_TYPES.filter((t) => !BUILDING_TEMPLATES[t].lawOnly).forEach((t) => stateTypes.add(t));
	if (roles.includes("economy")) CIVILIAN.forEach((t) => stateTypes.add(t));
	if (roles.includes("defense")) {
		stateTypes.add("fortifications");
		stateTypes.add("radar");
	}
	const regionTypes = governor ? GOVERNOR_BUILDINGS.filter(isGovernorBuilding) : [];
	return {
		roles,
		types: [...new Set([...stateTypes, ...regionTypes])],
		stateTypes: [...stateTypes],
		regionTypes
	};
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
