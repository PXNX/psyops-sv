// Airbases: regions where a state has finished the law-enacted airbase
// building and still holds the ground. Squadrons are stationed and fly only
// from these; ranges are measured from the base (config/game/range.config.ts).
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "../../db";
import { regions } from "../../schema";
import { nearestAirbase, regionHex, type Hex } from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export interface Airbase {
	regionId: number;
	hex: Hex;
}

/** The state's operational airbases. */
export async function airbasesOf(db: Db, stateId: number): Promise<Airbase[]> {
	const rows = await db
		.select({ id: regions.id, latitude: regions.latitude, longitude: regions.longitude })
		.from(regions)
		.where(and(eq(regions.stateId, stateId), gt(regions.airbase, 0)));
	return rows.map((r) => ({ regionId: r.id, hex: regionHex(r) }));
}

/** Where a new squadron raised in `regionId` is stationed: that region if it
 *  has an airbase, else the state's nearest one; null when it has none. */
export async function stationFor(db: Db, stateId: number, regionId: number): Promise<number | null> {
	const bases = await airbasesOf(db, stateId);
	if (bases.some((b) => b.regionId === regionId)) return regionId;
	const [home] = await db
		.select({ latitude: regions.latitude, longitude: regions.longitude })
		.from(regions)
		.where(eq(regions.id, regionId));
	if (!home) return bases[0]?.regionId ?? null;
	return nearestAirbase(regionHex(home), bases)?.regionId ?? null;
}
