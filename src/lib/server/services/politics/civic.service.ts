// src/lib/server/services/politics/civic.service.ts
// A wealthy player can fund civic buildings directly. Completing one raises
// civilian opinion in its region, which is how money becomes local influence.
// State buildings and strike casualties feed into the same opinion score.

import { and, eq, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { regions, strikes } from "../../schema";
import { civicProjects } from "../../schema-investments";
import { debitWallet } from "../../money";
import {
	CIVIC_BUILDINGS,
	OPINION_CONFIG,
	OPINION_FROM_STATE_BUILDINGS,
	isCivicBuildingType,
	type CivicBuildingType
} from "#lib/config/game/civic.config.js";
import { opinionLossFromHardship, type RegionNeeds } from "#lib/config/game/civilian-supply.config.js";
import { regionsCivilianNeeds } from "../civilians/supply.js";

const DAY = 86_400_000;

export class CivicError extends Error {}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Fund a civic building. The wallet is debited now; goodwill lands on completion. */
export async function startCivicProject(
	db: Database,
	{ userId, regionId, type, now = new Date() }: { userId: string; regionId: number; type: string; now?: Date }
) {
	if (!isCivicBuildingType(type)) throw new CivicError("Unknown civic building.");
	const building = CIVIC_BUILDINGS[type];
	const [region] = await db.select({ id: regions.id }).from(regions).where(eq(regions.id, regionId)).limit(1);
	if (!region) throw new CivicError("That region does not exist.");
	const [pending] = await db
		.select({ id: civicProjects.id })
		.from(civicProjects)
		.where(
			and(
				eq(civicProjects.userId, userId),
				eq(civicProjects.regionId, regionId),
				eq(civicProjects.buildingType, type),
				isNull(civicProjects.completedAt)
			)
		)
		.limit(1);
	if (pending) throw new CivicError("You already have one of those under construction here.");

	return db.transaction(async (tx) => {
		await debitWallet(tx, userId, building.cost);
		const [project] = await tx
			.insert(civicProjects)
			.values({
				userId,
				regionId,
				buildingType: type,
				completed: false,
				startedAt: now,
				completesAt: new Date(now.getTime() + building.days * DAY)
			})
			.returning();
		return project!;
	});
}

/** Finish every project whose ribbon-cutting date has arrived. */
export async function completeCivicProjects(db: Database, now = new Date()) {
	const finished = await db
		.update(civicProjects)
		.set({ completed: true, completedAt: now })
		.where(and(eq(civicProjects.completed, false), lte(civicProjects.completesAt, now)))
		.returning({ id: civicProjects.id, userId: civicProjects.userId, regionId: civicProjects.regionId });
	return { completed: finished.length, projects: finished };
}

/**
 * Civilian opinion 0-100: a neutral baseline, state services and private
 * patronage lifting it, fortifications and civilian casualties dragging it down.
 */
export async function regionOpinion(
	db: Database,
	regionId: number,
	now = new Date(),
	needs?: RegionNeeds
): Promise<number> {
	await completeCivicProjects(db, now);
	const [region] = await db.select().from(regions).where(eq(regions.id, regionId)).limit(1);
	if (!region) return OPINION_CONFIG.BASE;
	const [civic, casualties] = await Promise.all([
		db
			.select({ buildingType: civicProjects.buildingType, total: sql<number>`count(*)`.mapWith(Number) })
			.from(civicProjects)
			.where(and(eq(civicProjects.regionId, regionId), eq(civicProjects.completed, true)))
			.groupBy(civicProjects.buildingType),
		db
			.select({ total: sql<number>`coalesce(sum(${strikes.civilianCasualties}), 0)`.mapWith(Number) })
			.from(strikes)
			.where(eq(strikes.regionId, regionId))
	]);

	// State ratings are stored as decimals in the DB; coerce them to numbers.
	const levels = ["infrastructure", "economy", "education", "hospitals", "fortifications", "radar"] as const;
	let score = OPINION_CONFIG.BASE;
	for (const key of levels) {
		score += (Number(region[key] ?? 0) || 0) * (OPINION_FROM_STATE_BUILDINGS[key] ?? 0);
	}
	for (const row of civic) {
		if (!isCivicBuildingType(row.buildingType)) continue;
		score += row.total * CIVIC_BUILDINGS[row.buildingType as CivicBuildingType].opinion;
	}
	const casualtyPenalty = Math.min(
		OPINION_CONFIG.MAX_CASUALTY_PENALTY,
		((casualties[0]?.total ?? 0) / 1000) * OPINION_CONFIG.CASUALTY_PENALTY_PER_THOUSAND
	);
	return clamp(score - casualtyPenalty - opinionLossFromHardship(needs?.hardship ?? 0));
}

/** Opinion across several regions in one pass (for lists and the map). */
export async function regionOpinions(
	db: Database,
	regionIds: number[],
	now = new Date(),
	sharedNeeds?: Map<number, RegionNeeds>
) {
	// One batched pass supplies every region's basic needs for the penalty,
	// unless a caller that also needs the hardship has already done it.
	const needs = sharedNeeds ?? (await regionsCivilianNeeds(db, regionIds, now));
	const out = new Map<number, number>();
	for (const id of new Set(regionIds)) out.set(id, await regionOpinion(db, id, now, needs.get(id)));
	return out;
}

/** What one patron has built and how much goodwill it bought. */
export async function patronage(db: Database, userId: string, now = new Date()) {
	await completeCivicProjects(db, now);
	const projects = await db.select().from(civicProjects).where(eq(civicProjects.userId, userId));
	const goodwill = projects.reduce((sum, p) => {
		if (!p.completedAt || !isCivicBuildingType(p.buildingType)) return sum;
		return sum + CIVIC_BUILDINGS[p.buildingType as CivicBuildingType].opinion;
	}, 0);
	return { projects, goodwill, completed: projects.filter((p) => p.completedAt).length };
}
