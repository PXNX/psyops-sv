#!/usr/bin/env bun
// tools/map/fit-projection.ts: one-off calibration of map → lat/lon.
//
// Fits the projection on regions whose stored coordinates agree with where
// they are drawn (outliers are rejected automatically) and writes
// tools/map/projection.json, which build.ts uses. Only needed again if the
// map artwork changes.
//
//   DATABASE_URL=... bun tools/map/fit-projection.ts
import { readFileSync, writeFileSync } from "fs";
import postgres from "postgres";
import { parsePath, readShapes, shapeCentroid } from "./geometry";
import { fitProjection } from "./projection";

const dir = import.meta.dir;
const registry = JSON.parse(readFileSync(`${dir}/regions.json`, "utf8")) as {
	regions: { id: number; shape: string }[];
};
const shapes = readShapes(readFileSync(`${dir}/worldmap.svg`, "utf8"));

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const rows =
	(await sql`select id, latitude::float as lat, longitude::float as lon from regions where latitude is not null`) as unknown as {
		id: number;
		lat: number;
		lon: number;
	}[];
await sql.end();

const shapeOf = new Map(registry.regions.map((r) => [r.id, r.shape]));
const refs = rows.flatMap((r) => {
	const d = shapes.get(shapeOf.get(r.id) ?? "");
	if (!d) return [];
	const c = shapeCentroid(parsePath(d));
	return [{ x: c.x, y: c.y, lat: r.lat, lon: r.lon }];
});
const projection = fitProjection(refs);
writeFileSync(`${dir}/projection.json`, JSON.stringify(projection, null, "\t") + "\n");
console.log(
	`Fitted on ${projection.inliers}/${refs.length} reference regions, median error ${projection.medianErrorKm} km`
);
