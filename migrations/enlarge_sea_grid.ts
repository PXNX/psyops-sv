/**
 * One-off data migration for the sea-grid enlargement (90×45 → 60×30 hexes).
 *
 * Coordinates are stored as hex q/r, so every persisted position has to be
 * moved to the hex that now covers the same geographic point. We recover the
 * old centre in map space with the old constants, project it to lat/lon and
 * ask the current config which hex contains it.
 *
 *   CONFIRM_GRID_MIGRATION=1 bun migrations/enlarge_sea_grid.ts
 *
 * Run once after deploying the new code, before the game writes new hexes.
 */
import postgres from "postgres";
import { hexFromLatLon, WORLD_MAP_SIZE } from "#lib/config/index.js";
import { mapToLatLon } from "#lib/utils/military.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (process.env.CONFIRM_GRID_MIGRATION !== "1") {
	console.error("Set CONFIRM_GRID_MIGRATION=1 to run the sea-grid enlargement.");
	process.exit(1);
}

const OLD_MAX_Q = 89;
const OLD_MAX_R = 44;
const spanQ = OLD_MAX_Q;
const spanR = OLD_MAX_R;
const rows = spanR + 1;
const oldSize = Math.min(
	WORLD_MAP_SIZE.width / (spanQ + spanR / 2 + 1) / Math.sqrt(3),
	WORLD_MAP_SIZE.height / rows / 1.5
);
const colStep = Math.sqrt(3) * oldSize;
const rowStep = 1.5 * oldSize;
const y0 = (WORLD_MAP_SIZE.height - rows * rowStep) / 2;

/** Old hex → geographic centre → new hex. */
function convert(q: number, r: number) {
	const x = colStep * (q + r / 2);
	const y = y0 + rowStep * r;
	const ll = mapToLatLon(x, y);
	if (x > WORLD_MAP_SIZE.width - 30 && ll.lon < -170) ll.lon = 179.9;
	return hexFromLatLon(ll.lat, ll.lon);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

type CoordRow = { id: number; q: number; r: number };
type PathRow = { id: number; order_path: { q: number; r: number }[] | null };

const coordTables = [
	"sea_ports",
	"sea_docks",
	"fleet_ships",
	"naval_mines",
	"fleet_events",
	"sea_intel_missions",
	"air_missions",
	"fleet_hexes"
] as const;

await sql.begin(async (tx) => {
	for (const table of coordTables) {
		const rows = await tx.unsafe<CoordRow[]>(`select id, q, r from ${table} where q is not null and r is not null`);
		let changed = 0;
		for (const row of rows) {
			const next = convert(row.q, row.r);
			if (next.q === row.q && next.r === row.r) continue;
			await tx.unsafe(`update ${table} set q = $1, r = $2 where id = $3`, [next.q, next.r, row.id]);
			changed++;
		}
		console.log(`${table}: ${changed}/${rows.length} hexes converted`);
	}

	const ships = await tx.unsafe<PathRow[]>(`select id, order_path from fleet_ships where order_path is not null`);
	for (const ship of ships) {
		if (!Array.isArray(ship.order_path) || !ship.order_path.length) continue;
		const path = ship.order_path.map((h) => convert(h.q, h.r));
		await tx.unsafe(`update fleet_ships set order_path = $1::jsonb where id = $2`, [JSON.stringify(path), ship.id]);
	}
	console.log(`fleet_ships.order_path: ${ships.length} routes converted`);
});

await sql.end();
console.log("done");
