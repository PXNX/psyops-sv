// Public construction: the one place buildings are started and finished.
// Parliament proposals and governors/economy ministers both start buildings
// here. A building costs treasury money plus stockpile resources up front,
// then sits "under construction" for its template's constructionTime and
// raises its region's level by one when finished.
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { regions, stateBuildings, stateResourceInventory, stateTreasury } from "#lib/server/schema.js";
import { BUILDING_TEMPLATES, type BuildingType, type RegionStat } from "#lib/config/index.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Region = typeof regions.$inferSelect;

const DAY = 24 * 60 * 60 * 1000;

/** A region's current level for a stat (power plants live in `economy`). */
export const regionLevel = (region: Pick<Region, RegionStat>, stat: RegionStat) => region[stat] ?? 0;

export class ConstructionError extends Error {}

export interface ConstructionCheck {
	ok: boolean;
	/** Why it can't be built right now, in player language. */
	problems: string[];
	level: number;
	pending: number;
	maxLevel: number;
	costs: { resource: string; needed: number; available: number }[];
}

/**
 * Whether the next level of `type` can be started in a region right
 * now, and what they'd cost against what the state has. Pure; the caller
 * supplies the numbers.
 */
export function checkConstruction(input: {
	type: BuildingType;
	quantity: number;
	region: Pick<Region, RegionStat>;
	pending: number;
	treasury: number;
	stockpile: Record<string, number>;
}): ConstructionCheck {
	const template = BUILDING_TEMPLATES[input.type];
	const level = regionLevel(input.region, template.stat);
	const problems: string[] = [];

	// Levels go up one at a time: one order, one level, and the next only
	// once the current one is finished.
	if (input.quantity !== 1) problems.push("Buildings go up one level at a time.");
	if (input.pending > 0) {
		problems.push(`${template.name} level ${level + 1} is still under construction here.`);
	} else if (level >= template.maxLevel) {
		problems.push(`${template.statLabel} is already at its maximum of ${template.maxLevel}.`);
	}
	const infrastructure = regionLevel(input.region, "infrastructure");
	if (infrastructure < template.infrastructureRequired) {
		problems.push(
			`Needs infrastructure level ${template.infrastructureRequired} in this region (it has ${infrastructure}).`
		);
	}

	const costs = Object.entries(template.costs).map(([resource, perUnit]) => ({
		resource,
		needed: perUnit,
		available: resource === "currency" ? input.treasury : (input.stockpile[resource] ?? 0)
	}));
	for (const c of costs) {
		if (c.available < c.needed) {
			problems.push(
				c.resource === "currency"
					? `The treasury is ${(c.needed - c.available).toLocaleString()} short.`
					: `The stockpile is ${(c.needed - c.available).toLocaleString()} ${c.resource} short.`
			);
		}
	}

	return { ok: problems.length === 0, problems, level, pending: input.pending, maxLevel: template.maxLevel, costs };
}

/** Buildings of each type still under construction in a region. */
export async function pendingByType(db: Database | Tx, regionId: number): Promise<Record<string, number>> {
	const rows = await db
		.select({ type: stateBuildings.buildingType, n: count() })
		.from(stateBuildings)
		.where(and(eq(stateBuildings.regionId, regionId), eq(stateBuildings.isUnderConstruction, true)))
		.groupBy(stateBuildings.buildingType);
	return Object.fromEntries(rows.map((r) => [r.type, Number(r.n)]));
}

export async function stateStockpile(db: Database | Tx, stateId: number): Promise<Record<string, number>> {
	const rows = await db.select().from(stateResourceInventory).where(eq(stateResourceInventory.stateId, stateId));
	return Object.fromEntries(rows.map((r) => [r.resourceType, r.quantity]));
}

/**
 * Pays for and starts the next level of a building. All or nothing: the region is
 * locked so two orders can't both take the last free level, and each payment
 * only goes through if the money/resources are still there.
 * Throws ConstructionError with a player-readable message otherwise.
 */
export async function startConstruction(
	db: Database,
	input: {
		stateId: number;
		regionId: number;
		type: BuildingType;
		/** Always 1: levels are built one at a time. */
		quantity?: number;
		builtBy: string;
		proposalId?: number | null;
	}
): Promise<{ completesAt: Date }> {
	const template = BUILDING_TEMPLATES[input.type];
	if (!template) throw new ConstructionError("Unknown building type.");

	return db.transaction(async (tx) => {
		const [region] = await tx.select().from(regions).where(eq(regions.id, input.regionId)).for("update");
		if (!region || region.stateId !== input.stateId) {
			throw new ConstructionError("That region doesn't belong to this state.");
		}

		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, input.stateId));
		const check = checkConstruction({
			type: input.type,
			quantity: input.quantity ?? 1,
			region,
			pending: (await pendingByType(tx, input.regionId))[input.type] ?? 0,
			treasury: treasury?.balance ?? 0,
			stockpile: await stateStockpile(tx, input.stateId)
		});
		if (!check.ok) throw new ConstructionError(check.problems.join(" "));

		for (const { resource, needed } of check.costs) {
			const paid =
				resource === "currency"
					? await tx
							.update(stateTreasury)
							.set({
								balance: sql`${stateTreasury.balance} - ${needed}`,
								totalSpent: sql`${stateTreasury.totalSpent} + ${needed}`,
								updatedAt: new Date()
							})
							.where(and(eq(stateTreasury.stateId, input.stateId), gte(stateTreasury.balance, needed)))
							.returning({ id: stateTreasury.id })
					: await tx
							.update(stateResourceInventory)
							.set({ quantity: sql`${stateResourceInventory.quantity} - ${needed}`, updatedAt: new Date() })
							.where(
								and(
									eq(stateResourceInventory.stateId, input.stateId),
									eq(stateResourceInventory.resourceType, resource as never),
									gte(stateResourceInventory.quantity, needed)
								)
							)
							.returning({ id: stateResourceInventory.id });
			if (paid.length === 0) throw new ConstructionError(`Not enough ${resource} any more.`);
		}

		const startedAt = new Date();
		const completesAt = new Date(startedAt.getTime() + template.constructionTime * DAY);
		await tx.insert(stateBuildings).values({
			name: `${template.name} ${check.level + 1}`,
			buildingType: input.type,
			regionId: input.regionId,
			stateId: input.stateId,
			proposalId: input.proposalId ?? null,
			builtBy: input.builtBy,
			isUnderConstruction: true,
			constructionStartedAt: startedAt,
			constructionCompletesAt: completesAt
		});
		return { completesAt };
	});
}

/**
 * Finishes every building whose construction time is up and raises its
 * region's level. Safe to run concurrently: each building is claimed by a
 * conditional update, so its level is only ever added once.
 */
export async function completePendingConstructions(
	db: Database,
	filter: { stateId?: number; regionId?: number } = {}
): Promise<number> {
	const conditions = [
		eq(stateBuildings.isUnderConstruction, true),
		lte(stateBuildings.constructionCompletesAt, new Date())
	];
	if (filter.stateId !== undefined) conditions.push(eq(stateBuildings.stateId, filter.stateId));
	if (filter.regionId !== undefined) conditions.push(eq(stateBuildings.regionId, filter.regionId));

	const due = await db
		.select({ id: stateBuildings.id })
		.from(stateBuildings)
		.where(and(...conditions));
	if (due.length === 0) return 0;

	return db.transaction(async (tx) => {
		const claimed = await tx
			.update(stateBuildings)
			.set({ isUnderConstruction: false })
			.where(
				and(
					inArray(
						stateBuildings.id,
						due.map((d) => d.id)
					),
					eq(stateBuildings.isUnderConstruction, true)
				)
			)
			.returning({ type: stateBuildings.buildingType, regionId: stateBuildings.regionId });

		for (const b of claimed) {
			const template = BUILDING_TEMPLATES[b.type as BuildingType];
			if (!template) continue; // legacy road/bridge rows carry no level
			const column = regions[template.stat];
			await tx
				.update(regions)
				.set({ [template.stat]: sql`least(coalesce(${column}, 0) + 1, ${template.maxLevel})` })
				.where(eq(regions.id, b.regionId));
		}
		return claimed.length;
	});
}

/**
 * Share of each region level destroyed when an attacker takes the region.
 * The defences were breached, so forts suffer most.
 */
export const CONQUEST_DAMAGE: Record<RegionStat, number> = {
	fortifications: 0.5,
	radar: 0.5,
	infrastructure: 0.25,
	economy: 0.25,
	hospitals: 0.2,
	education: 0.2
};

/** Levels lost per stat when a region is conquered (at least one of anything built). */
export function conquestLosses(region: Pick<Region, RegionStat>): Partial<Record<RegionStat, number>> {
	const losses: Partial<Record<RegionStat, number>> = {};
	for (const [stat, share] of Object.entries(CONQUEST_DAMAGE) as [RegionStat, number][]) {
		const level = regionLevel(region, stat);
		if (level > 0) losses[stat] = Math.max(1, Math.round(level * share));
	}
	return losses;
}

/**
 * Wrecks a conquered region: knocks levels off its buildings and scraps
 * anything still under construction there (it was the old owner's project).
 * Run inside the transaction that hands the region over.
 */
export async function applyConquestDamage(tx: Tx, regionId: number) {
	const [region] = await tx.select().from(regions).where(eq(regions.id, regionId)).for("update");
	if (!region) return { losses: {}, scrapped: 0 };
	const losses = conquestLosses(region);
	if (Object.keys(losses).length) {
		await tx
			.update(regions)
			.set(
				Object.fromEntries(
					Object.entries(losses).map(([stat, lost]) => [
						stat,
						Math.max(0, regionLevel(region, stat as RegionStat) - lost!)
					])
				)
			)
			.where(eq(regions.id, regionId));
	}
	const scrapped = await tx
		.delete(stateBuildings)
		.where(and(eq(stateBuildings.regionId, regionId), eq(stateBuildings.isUnderConstruction, true)))
		.returning({ id: stateBuildings.id });
	return { losses, scrapped: scrapped.length };
}
