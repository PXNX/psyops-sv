// Read the daily world snapshots as simple series for the trend graphs.
import { db as defaultDb, type Database } from "#lib/server/db.js";
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
