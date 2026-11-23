// Read the daily world snapshots as simple series for the trend graphs.
import { eq } from "drizzle-orm";
import { db as defaultDb, type Database } from "#lib/server/db.js";
import { regions, residences } from "#lib/server/schema.js";
import { listSnapshots } from "./world-snapshots.js";

export async function populationHistory(
	regionId: number,
	limit = 90,
	db: Database = defaultDb
): Promise<{ at: Date; value: number }[]> {
	const snapshots = await listSnapshots(db, limit);
	return snapshots
		.filter((s) => s.regions.some((r) => r.id === regionId && r.population != null))
		.map((s) => ({ at: s.capturedAt, value: s.regions.find((r) => r.id === regionId)!.population! }))
		.reverse();
}

export async function stateSeries(
	stateId: number,
	limit = 90,
	db: Database = defaultDb
): Promise<{ at: Date; civilians: number; power: number; usedPower: number; steel: number }[]> {
	const snapshots = await listSnapshots(db, limit);
	return snapshots
		.map((s) => {
			const row = s.states.find((st) => st.id === stateId);
			return row
				? {
						at: s.capturedAt,
						civilians: row.civilians ?? 0,
						power: row.power ?? 0,
						usedPower: row.usedPower ?? 0,
						steel: row.steel ?? 0
					}
				: null;
		})
		.filter((v): v is { at: Date; civilians: number; power: number; usedPower: number; steel: number } => v !== null)
		.reverse();
}

/**
 * Player residents in a state over time. New snapshots carry the exact count;
 * older ones are estimated from when today's residents arrived in their region
 * and whether that region belonged to the state on the day of the snapshot.
 */
export async function residentHistory(
	stateId: number,
	limit = 90,
	db: Database = defaultDb
): Promise<{ at: Date; value: number }[]> {
	const [snapshots, residentRows] = await Promise.all([
		listSnapshots(db, limit),
		db
			.select({
				regionId: residences.regionId,
				since: residences.regionChangedAt,
				stateId: regions.stateId
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
	]);
	const current = residentRows.filter((r) => r.stateId === stateId);
	const estimateOn = (day: Date, owner?: Map<number, number | null>) =>
		current.filter(
			(r) =>
				r.since.getTime() <= day.getTime() &&
				(!owner || owner.get(r.regionId) === stateId)
		).length;

	// Before the first daily snapshot there is nothing stored to read, so draw
	// the series from when today's residents arrived in the state instead.
	if (snapshots.length === 0) {
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);
		return Array.from({ length: limit }, (_, i) => {
			const day = new Date(today.getTime() - (limit - 1 - i) * 86_400_000);
			return { at: day, value: estimateOn(day) };
		});
	}

	return snapshots
		.map((s) => {
			const recorded = s.states.find((st) => st.id === stateId)?.residents;
			if (recorded != null) return { at: s.capturedAt, value: recorded };
			const owner = new Map(s.regions.map((r) => [r.id, r.stateId]));
			return { at: s.capturedAt, value: estimateOn(s.capturedAt, owner) };
		})
		.reverse();
}
