// src/lib/server/services/politics/regional-stockpile.ts
// A region's own stockpile of raw materials. The governor fills it by buying
// on the market with the regional budget and empties it on regional public
// works or by selling on the market. Every change happens inside the UPDATE
// (or an upsert), and taking only succeeds while the stock is still there,
// so two requests can't spend the same units twice.
//
// No SvelteKit virtual modules here (tests import this file).
import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "#lib/server/db.js";
import { regionResourceInventory, resourceTypeEnum } from "#lib/server/schema.js";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const RESOURCES: readonly string[] = resourceTypeEnum.enumValues;

/** Whether `name` is a raw material a region can stock. */
export const isRegionalResource = (name: string) => RESOURCES.includes(name);

/** The region's stockpile as `{ resource: quantity }` (only rows that exist). */
export async function regionStockpile(db: Db, regionId: number): Promise<Record<string, number>> {
	const rows = await db
		.select({ resource: regionResourceInventory.resourceType, quantity: regionResourceInventory.quantity })
		.from(regionResourceInventory)
		.where(eq(regionResourceInventory.regionId, regionId));
	return Object.fromEntries(rows.map((r) => [r.resource, r.quantity]));
}

/** Add `quantity` units to the region's stockpile, creating the row if needed. */
export async function addRegionResource(db: Db, regionId: number, resource: string, quantity: number) {
	if (!isRegionalResource(resource)) throw new Error(`${resource} isn't a raw material.`);
	await db
		.insert(regionResourceInventory)
		.values({ regionId, resourceType: resource as never, quantity })
		.onConflictDoUpdate({
			target: [regionResourceInventory.regionId, regionResourceInventory.resourceType],
			set: { quantity: sql`${regionResourceInventory.quantity} + ${quantity}`, updatedAt: new Date() }
		});
}

/** Take `quantity` units; false (and nothing taken) if the region doesn't have them. */
export async function takeRegionResource(
	db: Db,
	regionId: number,
	resource: string,
	quantity: number
): Promise<boolean> {
	if (!isRegionalResource(resource)) return false;
	const rows = await db
		.update(regionResourceInventory)
		.set({ quantity: sql`${regionResourceInventory.quantity} - ${quantity}`, updatedAt: new Date() })
		.where(
			and(
				eq(regionResourceInventory.regionId, regionId),
				eq(regionResourceInventory.resourceType, resource as never),
				gte(regionResourceInventory.quantity, quantity)
			)
		)
		.returning({ id: regionResourceInventory.id });
	return rows.length > 0;
}
