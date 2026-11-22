/**
 * One-off data migration for the sea-grid refinement (16×11 → 90×45 hexes).
 *
 * The grid is now laid out in world-map space and lat/lon is derived from it,
 * so old stored coordinates cannot be converted with a simple scale factor.
 * For each row we take the *old* hex centre in lat/lon and ask the new grid
 * which hex covers that point. Every ship, port, mine and mission therefore
 * stays at the same geographic position.
 *
 * Run once, from the repo root, after deploying the new code:
 *
 *   bun migrations/refine_sea_grid.ts
 *
 * The script refuses to do anything unless CONFIRM_GRID_MIGRATION=1 is set.
 * It is safe to re-run only before the new code has written any hexes.
 */
import postgres from "postgres";
import { hexFromLatLon, hexKey } from "#lib/config/index.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (process.env.CONFIRM_GRID_MIGRATION !== "1") {
	console.error("Set CONFIRM_GRID_MIGRATION=1 to run the sea-grid migration.");
	process.exit(1);
}

const OLD_MAX_Q = 15;
const OLD_MAX_R = 10;

/** Old hex → geographic centre → new hex. */
function convert(q: number, r: number): { q: number; r: number } {
	const lat = 90 - (r / OLD_MAX_R) * 180;
	// Longitude 180 wraps to the map's left edge; nudge it to the right edge so
	//the old last column does not collapse onto the old first column.
	const lon = q === OLD_MAX_Q ? 179.9 : -180 + (q / OLD_MAX_Q) * 360;
	return hexFromLatLon(lat, lon);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

type CoordRow = { id: number; q: number; r: number };
type PathRow = { id: number; order_path: { q: number; r: number }[] | null };

const coordTables = ["sea_ports", "sea_docks", "fleet_ships", "naval_mines", "fleet_events", "sea_intel_missions", "air_missions"] as const;

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
	let paths = 0;
	for (const ship of ships) {
		if (!Array.isArray(ship.order_path) || ship.order_path.length === 0) continue;
		const path = ship.order_path.map((h) => convert(h.q, h.r));
		await tx.unsafe(`update fleet_ships set order_path = $1 where id = $2`, [JSON.stringify(path), ship.id]);
		paths++;
	}
	console.log(`fleet_ships.order_path: ${paths} routes converted`);

	// Sanity check: every surviving hex coordinate must be inside the grid.
	const { minQ, maxQ, minR, maxR } = await import("#lib/config/index.js").then((m) => m.HEX_BOUNDS);
	for (const table of coordTables) {
		const [bad] = await tx.unsafe<{ c: number }[]>(
			`select count(*)::int as c from ${table} where q < ${minQ} or q > ${maxQ} or r < ${minR} or r > ${maxR}`
		);
		if (bad!.c) throw new Error(`${table}: ${bad!.c} rows outside the refined grid`);
	}
	console.log(`grid ${minQ}..${maxQ} / ${minR}..${maxR}: all rows in bounds`);
});

await sql.end();
console.log("done", hexKey(convert(0, 0)));
