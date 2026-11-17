// src/lib/server/service/residency.ts
import { eq } from "drizzle-orm";
import { db } from "#lib/server/db.js";
import { regions, residences } from "#lib/server/schema.js";
import type { Residency } from "./voterEligibility";

/** A user's residency: their home region's state and since when they live there. */
export async function getResidency(userId: string): Promise<Residency | null> {
	const [row] = await db
		.select({ stateId: regions.stateId, since: residences.homeRegionChangedAt })
		.from(residences)
		.innerJoin(regions, eq(residences.homeRegionId, regions.id))
		.where(eq(residences.userId, userId))
		.limit(1);
	return row ?? null;
}
