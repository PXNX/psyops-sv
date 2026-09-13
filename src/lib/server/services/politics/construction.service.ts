// Applies the region stat bonus for a completed building and flips it out of
// the "under construction" queue. Buildings sit pending for BUILDING_TEMPLATES'
// constructionTime before their bonus counts, mirroring how productionQueue /
// militaryUnits.trainingCompletesAt gate their own completions.
import { db } from "$lib/server/db";
import { eq, and, lte } from "drizzle-orm";
import { stateBuildings, regions } from "$lib/server/schema";

function regionStatBonusFor(
	buildingType: string
): Partial<Record<"hospitals" | "education" | "economy" | "fortifications", number>> | null {
	switch (buildingType) {
		case "hospital":
			return { hospitals: 1 };
		case "school":
			return { education: 10 };
		case "power_plant":
			return { economy: 1 };
		default:
			return null;
	}
}

export async function completePendingConstructions(filter: { stateId?: number; regionId?: number }): Promise<number> {
	const conditions = [
		eq(stateBuildings.isUnderConstruction, true),
		lte(stateBuildings.constructionCompletesAt, new Date())
	];
	if (filter.stateId !== undefined) conditions.push(eq(stateBuildings.stateId, filter.stateId));
	if (filter.regionId !== undefined) conditions.push(eq(stateBuildings.regionId, filter.regionId));

	const due = await db
		.select()
		.from(stateBuildings)
		.where(and(...conditions));

	for (const building of due) {
		const bonus = regionStatBonusFor(building.buildingType);
		if (bonus) {
			const [region] = await db.select().from(regions).where(eq(regions.id, building.regionId));
			if (region) {
				const statUpdates: Record<string, number> = {};
				for (const [key, amount] of Object.entries(bonus)) {
					statUpdates[key] = ((region as any)[key] ?? 0) + (amount as number);
				}
				await db.update(regions).set(statUpdates).where(eq(regions.id, building.regionId));
			}
		}

		await db.update(stateBuildings).set({ isUnderConstruction: false }).where(eq(stateBuildings.id, building.id));
	}

	return due.length;
}
