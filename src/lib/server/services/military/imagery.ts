// src/lib/server/services/military/imagery.ts
// What the imagery renderer needs beyond a report's findings: the region's
// position and terrain, and strikes on it in the two days before the pass.
// Callers pass only reports the viewer's side may read (sideReports).
import { and, gte, inArray, lte } from "drizzle-orm";
import type { Database } from "../../db";
import { regions, strikes, type IntelReport } from "../../schema";
import { regionTerrain } from "#lib/config/index.js";
import { toImageryInput, type ImageryContext, type ImageryInput } from "#lib/utils/sensor-image.js";

const HOUR = 3600_000;
/** Strikes older than this before a pass leave no marks worth drawing. */
const STRIKE_WINDOW_H = 48;

type Report = Pick<IntelReport, "id" | "regionId" | "sensor" | "findings" | "observedAt">;

/** Per report: the region context its frame is drawn with. */
export async function imageryContexts(db: Database, reports: Report[]): Promise<Map<number, ImageryContext>> {
	if (!reports.length) return new Map();
	const regionIds = [...new Set(reports.map((r) => r.regionId))];
	const times = reports.map((r) => r.observedAt.getTime());
	const [regionRows, strikeRows] = await Promise.all([
		db
			.select({
				id: regions.id,
				lat: regions.latitude,
				lon: regions.longitude,
				terrain: regions.terrain,
				infrastructure: regions.infrastructure
			})
			.from(regions)
			.where(inArray(regions.id, regionIds)),
		db
			.select({
				id: strikes.id,
				regionId: strikes.regionId,
				target: strikes.target,
				weapon: strikes.weapon,
				outcome: strikes.outcome,
				createdAt: strikes.createdAt
			})
			.from(strikes)
			.where(
				and(
					inArray(strikes.regionId, regionIds),
					gte(strikes.createdAt, new Date(Math.min(...times) - STRIKE_WINDOW_H * HOUR)),
					lte(strikes.createdAt, new Date(Math.max(...times)))
				)
			)
	]);
	const regionById = new Map(regionRows.map((r) => [r.id, r]));
	const contexts = reports.map((r): [number, ImageryContext] => {
		const region = regionById.get(r.regionId);
		const at = r.observedAt.getTime();
		return [
			r.id,
			{
				lat: region?.lat != null ? Number(region.lat) : null,
				lon: region?.lon != null ? Number(region.lon) : null,
				terrain: region ? regionTerrain(region) : "plains",
				strikes: strikeRows
					.filter((s) => s.regionId === r.regionId && s.createdAt.getTime() <= at)
					.filter((s) => at - s.createdAt.getTime() <= STRIKE_WINDOW_H * HOUR)
					.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
					.map((s) => ({
						id: s.id,
						target: s.target,
						weapon: s.weapon,
						outcome: s.outcome,
						hoursBefore: Math.round(((at - s.createdAt.getTime()) / HOUR) * 10) / 10
					}))
			}
		];
	});
	return new Map(contexts);
}

/** Reports ready for the renderer. */
export async function imageryInputs(db: Database, reports: Report[]): Promise<ImageryInput[]> {
	const ctx = await imageryContexts(db, reports);
	return reports.map((r) => toImageryInput(r, ctx.get(r.id)!));
}
