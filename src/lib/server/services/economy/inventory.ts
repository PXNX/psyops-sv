// Moving resources and products in and out of player and state inventories.
// Every change happens inside the UPDATE (or an upsert), so concurrent
// requests can't overwrite each other, and taking only succeeds while the
// stock is still there.
import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { productInventory, resourceInventory, stateProductInventory, stateResourceInventory } from "../../schema";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Tx;
// "resource" or "product" (market listings store it as text).
export type ItemType = "resource" | "product" | (string & {});

/** Adds `quantity` to a player's inventory, creating the row if needed. */
export async function addUserItem(
	db: Executor,
	userId: string,
	itemType: ItemType,
	itemName: string,
	quantity: number
) {
	if (itemType === "resource") {
		await db
			.insert(resourceInventory)
			.values({ userId, resourceType: itemName as never, quantity })
			.onConflictDoUpdate({
				target: [resourceInventory.userId, resourceInventory.resourceType],
				set: { quantity: sql`${resourceInventory.quantity} + ${quantity}`, updatedAt: new Date() }
			});
	} else {
		await db
			.insert(productInventory)
			.values({ userId, productType: itemName as never, quantity })
			.onConflictDoUpdate({
				target: [productInventory.userId, productInventory.productType],
				set: { quantity: sql`${productInventory.quantity} + ${quantity}`, updatedAt: new Date() }
			});
	}
}

/** Takes `quantity` from a player's inventory; false (and nothing taken) if they don't have it. */
export async function takeUserItem(
	db: Executor,
	userId: string,
	itemType: ItemType,
	itemName: string,
	quantity: number
): Promise<boolean> {
	const rows =
		itemType === "resource"
			? await db
					.update(resourceInventory)
					.set({ quantity: sql`${resourceInventory.quantity} - ${quantity}`, updatedAt: new Date() })
					.where(
						and(
							eq(resourceInventory.userId, userId),
							eq(resourceInventory.resourceType, itemName as never),
							gte(resourceInventory.quantity, quantity)
						)
					)
					.returning({ id: resourceInventory.id })
			: await db
					.update(productInventory)
					.set({ quantity: sql`${productInventory.quantity} - ${quantity}`, updatedAt: new Date() })
					.where(
						and(
							eq(productInventory.userId, userId),
							eq(productInventory.productType, itemName as never),
							gte(productInventory.quantity, quantity)
						)
					)
					.returning({ id: productInventory.id });
	return rows.length > 0;
}

/** Adds `quantity` to a state's stockpile, creating the row if needed. */
export async function addStateItem(
	db: Executor,
	stateId: number,
	itemType: ItemType,
	itemName: string,
	quantity: number
) {
	if (itemType === "resource") {
		await db
			.insert(stateResourceInventory)
			.values({ stateId, resourceType: itemName as never, quantity })
			.onConflictDoUpdate({
				target: [stateResourceInventory.stateId, stateResourceInventory.resourceType],
				set: { quantity: sql`${stateResourceInventory.quantity} + ${quantity}`, updatedAt: new Date() }
			});
	} else {
		await db
			.insert(stateProductInventory)
			.values({ stateId, productType: itemName as never, quantity })
			.onConflictDoUpdate({
				target: [stateProductInventory.stateId, stateProductInventory.productType],
				set: { quantity: sql`${stateProductInventory.quantity} + ${quantity}`, updatedAt: new Date() }
			});
	}
}
