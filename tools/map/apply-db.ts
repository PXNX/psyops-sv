#!/usr/bin/env bun
// tools/map/apply-db.ts: loads the build output into a database.
//
//   DATABASE_URL=... bun tools/map/apply-db.ts           # dry run: show what would change
//   DATABASE_URL=... bun tools/map/apply-db.ts --check   # run it all, then roll back
//   DATABASE_URL=... bun tools/map/apply-db.ts --apply   # do it, in one transaction
//
// - inserts regions that don't exist yet (id, latitude, longitude);
// - sets latitude/longitude of existing regions to their position on the map
//   (ownership, buildings, resources etc. are left alone);
// - replaces region_borders with tools/map/data/borders.json;
// - adds resource deposits a region doesn't have yet (existing deposits keep
//   what has been mined from them).
import { readFileSync } from "fs";
import postgres from "postgres";
import { haversineKm } from "./projection";

const dir = import.meta.dir;
const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check");
class Rollback extends Error {}

interface RegionRow {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
}
interface BorderRow {
	regionId: number;
	neighborId: number;
	distanceKm: number;
}
const regions = JSON.parse(readFileSync(`${dir}/data/regions.json`, "utf8")) as RegionRow[];
const borders = JSON.parse(readFileSync(`${dir}/data/borders.json`, "utf8")) as BorderRow[];
const deposits = JSON.parse(readFileSync(`${dir}/data/deposits.json`, "utf8")) as {
	regionId: number;
	resourceType: string;
	capacity: number;
}[];

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
try {
	const current = new Map(
		((await sql`select id, latitude::float as lat, longitude::float as lon from regions`) as any[]).map((r) => [
			r.id as number,
			r
		])
	);
	const [{ count: borderCount }] = await sql`select count(*)::int from region_borders`;

	const toInsert = regions.filter((r) => !current.has(r.id));
	const moves = regions
		.filter((r) => current.has(r.id))
		.map((r) => {
			const c = current.get(r.id)!;
			return { ...r, km: haversineKm(c.lat, c.lon, r.latitude, r.longitude) };
		});
	const orphans = [...current.keys()].filter((id) => !regions.some((r) => r.id === id));

	console.log(`Regions: ${regions.length} on the map, ${current.size} in the database`);
	console.log(`  insert ${toInsert.length} new (${toInsert[0]?.id ?? "-"}…${toInsert.at(-1)?.id ?? "-"})`);
	console.log(
		`  move ${moves.filter((m) => m.km > 1).length} existing to their map position ` +
			`(${moves.filter((m) => m.km > 1000).length} by more than 1,000 km)`
	);
	if (orphans.length) console.log(`  ⚠ in the database but not on the map (left untouched): ${orphans.join(", ")}`);
	console.log(`Borders: replace ${borderCount} with ${borders.length}`);
	const existingDeposits = new Set(
		((await sql`select region_id, resource_type from region_deposits`) as any[]).map(
			(d) => `${d.region_id}:${d.resource_type}`
		)
	);
	const newDeposits = deposits.filter((d) => !existingDeposits.has(`${d.regionId}:${d.resourceType}`));
	console.log(`Deposits: add ${newDeposits.length} (${existingDeposits.size} already exist and are left as they are)`);

	if (!apply && !check) {
		console.log("\nDry run. Re-run with --check (write + roll back) or --apply.");
	} else {
		const run = sql.begin(async (tx) => {
			for (const r of toInsert) {
				await tx`insert into regions (id, latitude, longitude) values (${r.id}, ${r.latitude}, ${r.longitude})`;
			}
			for (const r of moves) {
				await tx`update regions set latitude = ${r.latitude}, longitude = ${r.longitude} where id = ${r.id}`;
			}
			// Keep the identity sequence ahead of the explicit ids we inserted.
			await tx`select setval(pg_get_serial_sequence('regions', 'id'), (select max(id) from regions))`;

			await tx`delete from region_borders`;
			for (let i = 0; i < borders.length; i += 500) {
				const chunk = borders.slice(i, i + 500).map((b) => ({
					region_id: b.regionId,
					neighbor_id: b.neighborId,
					distance_km: b.distanceKm
				}));
				await tx`insert into region_borders ${tx(chunk, "region_id", "neighbor_id", "distance_km")}`;
			}
			const [after] =
				await tx`select (select count(*)::int from regions) as regions, (select count(*)::int from region_borders) as borders`;
			console.log(`\nInside the transaction: ${after!.regions} regions, ${after!.borders} borders`);
			if (check) throw new Rollback();
		});
		try {
			await run;
			console.log("Applied.");
		} catch (err) {
			if (!(err instanceof Rollback)) throw err;
			console.log("Check passed, rolled back: nothing was changed.");
		}
	}
} finally {
	await sql.end();
}
