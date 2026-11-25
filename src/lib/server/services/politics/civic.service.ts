// src/lib/server/services/politics/civic.service.ts
// A wealthy player can fund civic buildings directly. Completing one raises
// civilian opinion in its region, which is how money becomes local influence.
// State buildings and strike casualties feed into the same opinion score.

import { and, asc, count, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { regions, strikes, userProfiles } from "../../schema";
import { civicProjects } from "../../schema-investments";
import { debitWallet } from "../../money";
import {
	CIVIC_BUILDINGS,
	CIVIC_DEDICATION,
	CIVIC_MAX_TIER,
	OPINION_CONFIG,
	OPINION_FROM_STATE_BUILDINGS,
	allocateCivicOpinion,
	civicBuildingOpinion,
	civicInvested,
	civicSaturation,
	civicUpgradeCost,
	civicUpgradeDays,
	isCivicBuildingType,
	parsePlaque,
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
	if (!Number.isSafeInteger(regionId) || regionId <= 0) throw new CivicError("That region does not exist.");
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

/**
 * A finished building the caller owns, or a CivicError saying why not. With a
 * `regionId` (a region's patronage page) the building must also stand there.
 */
async function ownedFinishedProject(db: Database, userId: string, projectId: number, regionId?: number) {
	if (!Number.isSafeInteger(projectId) || projectId <= 0) throw new CivicError("Choose one of your buildings.");
	const [project] = await db.select().from(civicProjects).where(eq(civicProjects.id, projectId)).limit(1);
	if (!project || project.userId !== userId) throw new CivicError("That building is not yours.");
	if (regionId != null && project.regionId !== regionId) throw new CivicError("That building stands elsewhere.");
	if (!project.completedAt) throw new CivicError("Wait for the ribbon-cutting first.");
	if (!isCivicBuildingType(project.buildingType)) throw new CivicError("Unknown civic building.");
	return { ...project, buildingType: project.buildingType as CivicBuildingType };
}

/**
 * Expand a finished building to its next tier. Paid now; the building keeps
 * its current goodwill while the expansion is built, then gains the new tier.
 */
export async function upgradeCivicProject(
	db: Database,
	{
		userId,
		projectId,
		regionId,
		now = new Date()
	}: { userId: string; projectId: number; regionId?: number; now?: Date }
) {
	await completeCivicProjects(db, now);
	const project = await ownedFinishedProject(db, userId, projectId, regionId);
	if (project.upgradeCompletesAt) throw new CivicError("An expansion is already under way.");
	if (project.tier >= CIVIC_MAX_TIER) throw new CivicError("This building is already a landmark.");
	const toTier = project.tier + 1;
	const cost = civicUpgradeCost(project.buildingType, toTier);
	const completesAt = new Date(now.getTime() + civicUpgradeDays(project.buildingType, toTier) * DAY);

	return db.transaction(async (tx) => {
		// Guard on the tier we read so two quick clicks can't both pay.
		const [updated] = await tx
			.update(civicProjects)
			.set({ upgradeCompletesAt: completesAt })
			.where(
				and(
					eq(civicProjects.id, project.id),
					eq(civicProjects.tier, project.tier),
					isNull(civicProjects.upgradeCompletesAt)
				)
			)
			.returning();
		if (!updated) throw new CivicError("An expansion is already under way.");
		await debitWallet(tx, userId, cost);
		return { project: updated, toTier, cost };
	});
}

/** Buy the naming rights: engrave a plaque on a finished building. */
export async function dedicateCivicProject(
	db: Database,
	{
		userId,
		projectId,
		plaque,
		regionId,
		now = new Date()
	}: { userId: string; projectId: number; plaque: unknown; regionId?: number; now?: Date }
) {
	const parsed = parsePlaque(plaque);
	if (!parsed.ok) throw new CivicError(parsed.error);
	await completeCivicProjects(db, now);
	const project = await ownedFinishedProject(db, userId, projectId, regionId);
	if (project.plaque === parsed.text) throw new CivicError("The plaque already says that.");

	return db.transaction(async (tx) => {
		await debitWallet(tx, userId, CIVIC_DEDICATION.COST);
		const [updated] = await tx
			.update(civicProjects)
			.set({ plaque: parsed.text, dedicatedAt: now })
			.where(eq(civicProjects.id, project.id))
			.returning();
		return updated!;
	});
}

/** Finish every project and expansion whose ribbon-cutting date has arrived. */
export async function completeCivicProjects(db: Database, now = new Date()) {
	const [finished] = await Promise.all([
		db
			.update(civicProjects)
			.set({ completed: true, completedAt: now })
			.where(and(eq(civicProjects.completed, false), lte(civicProjects.completesAt, now)))
			.returning({ id: civicProjects.id, userId: civicProjects.userId, regionId: civicProjects.regionId }),
		db
			.update(civicProjects)
			.set({
				tier: sql`least(${civicProjects.tier} + 1, ${CIVIC_MAX_TIER})`,
				upgradedAt: sql`${civicProjects.upgradeCompletesAt}`,
				upgradeCompletesAt: null
			})
			.where(and(isNotNull(civicProjects.upgradeCompletesAt), lte(civicProjects.upgradeCompletesAt, now)))
	]);
	return { completed: finished.length, projects: finished };
}

export interface CivicAllocation {
	projectId: number;
	userId: string;
	regionId: number;
	buildingType: CivicBuildingType;
	/** Opinion the building is worth alone (tier and plaque included). */
	value: number;
	/** Its place in the region's opening order (0 = first). */
	rank: number;
	multiplier: number;
	/** What it actually adds to regional opinion after saturation. */
	effective: number;
}

/**
 * How every finished civic building in the given regions contributes to
 * opinion once saturation is applied. Buildings count in the order they
 * opened, so the first in a town is worth the most.
 */
export async function civicAllocations(db: Database, regionIds: number[]): Promise<Map<number, CivicAllocation[]>> {
	const out = new Map<number, CivicAllocation[]>();
	const ids = [...new Set(regionIds)];
	if (!ids.length) return out;
	const rows = await db
		.select()
		.from(civicProjects)
		.where(and(inArray(civicProjects.regionId, ids), eq(civicProjects.completed, true)))
		.orderBy(asc(civicProjects.completedAt), asc(civicProjects.id));
	const byRegion = new Map<number, typeof rows>();
	for (const row of rows) {
		if (!isCivicBuildingType(row.buildingType)) continue;
		const list = byRegion.get(row.regionId) ?? [];
		list.push(row);
		byRegion.set(row.regionId, list);
	}
	for (const [regionId, list] of byRegion) {
		const values = list.map((r) => civicBuildingOpinion(r.buildingType as CivicBuildingType, r.tier, !!r.plaque));
		const { each } = allocateCivicOpinion(values);
		out.set(
			regionId,
			list.map((r, i) => ({
				projectId: r.id,
				userId: r.userId,
				regionId,
				buildingType: r.buildingType as CivicBuildingType,
				value: values[i]!,
				rank: i,
				multiplier: civicSaturation(i),
				effective: each[i]!
			}))
		);
	}
	return out;
}

/**
 * Civic buildings per region that a new one would queue behind (finished or
 * still being built), so a planner can show the saturated value up front.
 */
export async function civicCrowding(db: Database): Promise<Map<number, number>> {
	const rows = await db
		.select({ regionId: civicProjects.regionId, n: count() })
		.from(civicProjects)
		.groupBy(civicProjects.regionId);
	return new Map(rows.map((r) => [r.regionId, Number(r.n)]));
}

export interface OpinionComponent {
	key: string;
	label: string;
	detail: string;
	points: number;
}

export interface OpinionBreakdown {
	score: number;
	raw: number;
	components: OpinionComponent[];
}

/**
 * Civilian opinion 0-100 with the arithmetic behind it: a neutral baseline,
 * state services and private patronage lifting it, fortifications and civilian
 * casualties dragging it down. Every caller of `regionOpinion` shares this
 * computation, so a breakdown can never drift from the number on the profile.
 */
export async function regionOpinionBreakdown(
	db: Database,
	regionId: number,
	now = new Date(),
	needs?: RegionNeeds
): Promise<OpinionBreakdown | null> {
	await completeCivicProjects(db, now);
	const [region] = await db.select().from(regions).where(eq(regions.id, regionId)).limit(1);
	if (!region) return null;
	const [allocations, casualties] = await Promise.all([
		civicAllocations(db, [regionId]),
		db
			.select({ total: sql<number>`coalesce(sum(${strikes.civilianCasualties}), 0)`.mapWith(Number) })
			.from(strikes)
			.where(eq(strikes.regionId, regionId))
	]);

	const levels = [
		"infrastructure",
		"economy",
		"education",
		"hospitals",
		"fortifications",
		"radar",
		"connectivity"
	] as const;
	const components: OpinionComponent[] = [
		{ key: "base", label: "Neutral baseline", detail: "everyone starts here", points: OPINION_CONFIG.BASE }
	];
	let score = OPINION_CONFIG.BASE;

	// State ratings are stored as decimals in the DB; coerce them to numbers.
	for (const key of levels) {
		const level = Number(region[key] ?? 0) || 0;
		const weight = OPINION_FROM_STATE_BUILDINGS[key] ?? 0;
		if (!weight) continue;
		const points = level * weight;
		score += points;
		components.push({
			key: `state_${key}`,
			label: `State ${key}`,
			detail: `level ${level} × ${weight}`,
			points
		});
	}
	// Private patronage, saturated in opening order, summed per building type.
	const civicByType = new Map<CivicBuildingType, { n: number; value: number; effective: number }>();
	for (const a of allocations.get(regionId) ?? []) {
		const agg = civicByType.get(a.buildingType) ?? { n: 0, value: 0, effective: 0 };
		agg.n += 1;
		agg.value += a.value;
		agg.effective += a.effective;
		civicByType.set(a.buildingType, agg);
	}
	for (const [type, agg] of civicByType) {
		const building = CIVIC_BUILDINGS[type];
		const points = Math.round(agg.effective);
		score += points;
		const saturated = agg.effective < agg.value - 0.01;
		components.push({
			key: `civic_${type}`,
			label: `${building.icon} ${building.name}`,
			detail: `${agg.n} built, worth ${agg.value}${saturated ? ` (${Math.round((agg.effective / agg.value) * 100)}% after saturation)` : ""}`,
			points
		});
	}

	const casualtyCount = casualties[0]?.total ?? 0;
	const casualtyPenalty = Math.min(
		OPINION_CONFIG.MAX_CASUALTY_PENALTY,
		(casualtyCount / 1000) * OPINION_CONFIG.CASUALTY_PENALTY_PER_THOUSAND
	);
	if (casualtyPenalty) {
		components.push({
			key: "casualties",
			label: "Civilian casualties",
			detail: `${casualtyCount.toLocaleString()} casualties (capped)`,
			points: -Math.round(casualtyPenalty)
		});
	}
	const hardship = opinionLossFromHardship(needs?.hardship ?? 0);
	if (hardship) {
		components.push({
			key: "hardship",
			label: "Civilian hardship",
			detail: "shortages in the region",
			points: -hardship
		});
	}

	const raw = score - casualtyPenalty - hardship;
	return { score: clamp(raw), raw, components };
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
	const breakdown = await regionOpinionBreakdown(db, regionId, now, needs);
	return breakdown?.score ?? OPINION_CONFIG.BASE;
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

/**
 * What one patron has built and how much goodwill it bought. Each project
 * carries its standalone value, its saturated effect and what it has cost.
 */
export async function patronage(db: Database, userId: string, now = new Date()) {
	await completeCivicProjects(db, now);
	const rows = await db
		.select()
		.from(civicProjects)
		.where(eq(civicProjects.userId, userId))
		.orderBy(asc(civicProjects.startedAt), asc(civicProjects.id));
	const allocations = await civicAllocations(
		db,
		rows.filter((p) => p.completedAt).map((p) => p.regionId)
	);
	const byProject = new Map<number, CivicAllocation>();
	for (const list of allocations.values()) for (const a of list) byProject.set(a.projectId, a);

	const projects = rows.map((p) => {
		const known = isCivicBuildingType(p.buildingType);
		const type = p.buildingType as CivicBuildingType;
		const a = byProject.get(p.id);
		return {
			...p,
			value: known ? civicBuildingOpinion(type, p.tier, !!p.plaque) : 0,
			goodwill: a?.effective ?? 0,
			multiplier: a?.multiplier ?? null,
			invested: known ? civicInvested(type, p.tier + (p.upgradeCompletesAt ? 1 : 0), !!p.plaque) : 0
		};
	});
	const goodwill = Math.round(projects.reduce((sum, p) => sum + p.goodwill, 0));
	const invested = projects.reduce((sum, p) => sum + p.invested, 0);
	return { projects, goodwill, invested, completed: projects.filter((p) => p.completedAt).length };
}

/**
 * Every civic building in one region, whoever paid for it, oldest first:
 * its patron, its standalone value and what it adds after saturation.
 * Buildings still going up carry no allocation yet.
 */
export async function regionCivicProjects(db: Database, regionId: number, now = new Date()) {
	await completeCivicProjects(db, now);
	const [rows, allocations] = await Promise.all([
		db
			.select({ project: civicProjects, patronName: userProfiles.name, patronLogo: userProfiles.logo })
			.from(civicProjects)
			.leftJoin(userProfiles, eq(userProfiles.accountId, civicProjects.userId))
			.where(eq(civicProjects.regionId, regionId))
			.orderBy(asc(civicProjects.startedAt), asc(civicProjects.id)),
		civicAllocations(db, [regionId])
	]);
	const byProject = new Map((allocations.get(regionId) ?? []).map((a) => [a.projectId, a]));
	return rows.map(({ project: p, patronName, patronLogo }) => {
		const known = isCivicBuildingType(p.buildingType);
		const type = p.buildingType as CivicBuildingType;
		const a = byProject.get(p.id);
		return {
			...p,
			patronName: patronName ?? "Unknown patron",
			patronLogo,
			value: known ? civicBuildingOpinion(type, p.tier, !!p.plaque) : 0,
			goodwill: a?.effective ?? 0,
			multiplier: a?.multiplier ?? null,
			invested: known ? civicInvested(type, p.tier + (p.upgradeCompletesAt ? 1 : 0), !!p.plaque) : 0
		};
	});
}

/** A cheap summary for a region page: civic buildings there, yours, and your goodwill. */
export async function regionCivicSummary(db: Database, regionId: number, userId: string) {
	const [rows, allocations] = await Promise.all([
		db.select({ userId: civicProjects.userId }).from(civicProjects).where(eq(civicProjects.regionId, regionId)),
		civicAllocations(db, [regionId])
	]);
	const mine = (allocations.get(regionId) ?? []).filter((a) => a.userId === userId);
	return {
		buildings: rows.length,
		mine: rows.filter((r) => r.userId === userId).length,
		goodwill: Math.round(mine.reduce((s, a) => s + a.effective, 0) * 10) / 10
	};
}
