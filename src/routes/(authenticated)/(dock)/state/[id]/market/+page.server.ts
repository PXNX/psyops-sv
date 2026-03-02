// src/routes/(authenticated)/(dock)/state/[id]/market/+page.server.ts
import { db } from "$lib/server/db";
import {
    states,
    ministers,
    presidents,
    stateTreasury,
    stateResourceInventory,
    stateProductInventory,
    resourceInventory,
    productInventory,
    userWallets,
    governmentBudgetTransactions,
    residences,
    regions
} from "$lib/server/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { fail, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const stateId = parseInt(params.id);
    const account = locals.account!;

    // Get state info
    const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);

    if (!state) {
        error(404, "State not found");
    }

    // Check if user is president or minister of economics
    const [presidency] = await db
        .select()
        .from(presidents)
        .where(and(eq(presidents.stateId, stateId), eq(presidents.userId, account.id)))
        .limit(1);

    const [economyMinistry] = await db
        .select()
        .from(ministers)
        .where(
            and(eq(ministers.stateId, stateId), eq(ministers.ministry, "economy"), eq(ministers.userId, account.id))
        )
        .limit(1);

    const canTrade = !!presidency || !!economyMinistry;

    // Get state treasury
    const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);

    // Get state resources
    const stateResources = await db
        .select()
        .from(stateResourceInventory)
        .where(eq(stateResourceInventory.stateId, stateId));

    // Get state products
    const stateProducts = await db
        .select()
        .from(stateProductInventory)
        .where(eq(stateProductInventory.stateId, stateId));

    // Get market prices (average from user inventories)
    // This is a simple approach - you might want to implement proper market pricing
    const marketPrices = {
        iron: 1000,
        copper: 1200,
        steel: 1500,
        gunpowder: 2000,
        wood: 800,
        coal: 900,
        rifles: 5000,
        ammunition: 3000,
        artillery: 15000,
        vehicles: 20000,
        explosives: 8000
    };

    return {
        state: {
            id: state.id,
            name: state.name
        },
        canTrade,
        isPresident: !!presidency,
        isEconomyMinister: !!economyMinistry,
        treasury: treasury || { balance: 0, stateId },
        resources: stateResources.map((r) => ({
            resourceType: r.resourceType,
            quantity: r.quantity
        })),
        products: stateProducts.map((p) => ({
            productType: p.productType,
            quantity: p.quantity
        })),
        marketPrices
    };
};

export const actions: Actions = {
    buyResource: async ({ request, params, locals }) => {
        const account = locals.account!;
        const stateId = parseInt(params.id);

        // Verify permissions
        const [presidency] = await db
            .select()
            .from(presidents)
            .where(and(eq(presidents.stateId, stateId), eq(presidents.userId, account.id)))
            .limit(1);

        const [economyMinistry] = await db
            .select()
            .from(ministers)
            .where(
                and(eq(ministers.stateId, stateId), eq(ministers.ministry, "economy"), eq(ministers.userId, account.id))
            )
            .limit(1);

        if (!presidency && !economyMinistry) {
            return fail(403, { message: "Only the president or minister of economics can trade resources" });
        }

        const formData = await request.formData();
        const itemType = formData.get("itemType") as string;
        const itemName = formData.get("itemName") as string;
        const quantity = parseInt(formData.get("quantity") as string);
        const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

        if (!itemType || !itemName || quantity < 1 || pricePerUnit < 1) {
            return fail(400, { message: "Invalid purchase data" });
        }

        const totalCost = quantity * pricePerUnit;

        // Get treasury
        const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);

        if (!treasury || treasury.balance < totalCost) {
            return fail(400, {
                message: "Insufficient treasury funds",
                required: totalCost,
                available: treasury?.balance || 0
            });
        }

        // Update treasury
        const newBalance = treasury.balance - totalCost;
        await db
            .update(stateTreasury)
            .set({
                balance: newBalance,
                totalSpent: sql`${stateTreasury.totalSpent} + ${totalCost}`,
                updatedAt: new Date()
            })
            .where(eq(stateTreasury.stateId, stateId));

        // Add to state inventory
        if (itemType === "resource") {
            const [existing] = await db
                .select()
                .from(stateResourceInventory)
                .where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, itemName as any)))
                .limit(1);

            if (existing) {
                await db
                    .update(stateResourceInventory)
                    .set({
                        quantity: existing.quantity + quantity,
                        updatedAt: new Date()
                    })
                    .where(
                        and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, itemName as any))
                    );
            } else {
                await db.insert(stateResourceInventory).values({
                    stateId,
                    resourceType: itemName as any,
                    quantity
                });
            }
        } else if (itemType === "product") {
            const [existing] = await db
                .select()
                .from(stateProductInventory)
                .where(and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, itemName as any)))
                .limit(1);

            if (existing) {
                await db
                    .update(stateProductInventory)
                    .set({
                        quantity: existing.quantity + quantity,
                        updatedAt: new Date()
                    })
                    .where(and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, itemName as any)));
            } else {
                await db.insert(stateProductInventory).values({
                    stateId,
                    productType: itemName as any,
                    quantity
                });
            }
        }

        // Record transaction
        await db.insert(governmentBudgetTransactions).values({
            stateId,
            transactionType: "resource_purchase",
            amount: -totalCost,
            balanceAfter: newBalance,
            description: `Purchased ${quantity}x ${itemName}`,
            authorizedBy: account.id,
            itemType,
            itemName,
            quantity,
            pricePerUnit
        });

        return {
            success: true,
            message: `Successfully purchased ${quantity}x ${itemName} for $${totalCost.toLocaleString()}`
        };
    },

    sellResource: async ({ request, params, locals }) => {
        const account = locals.account!;
        const stateId = parseInt(params.id);

        // Verify permissions
        const [presidency] = await db
            .select()
            .from(presidents)
            .where(and(eq(presidents.stateId, stateId), eq(presidents.userId, account.id)))
            .limit(1);

        const [economyMinistry] = await db
            .select()
            .from(ministers)
            .where(
                and(eq(ministers.stateId, stateId), eq(ministers.ministry, "economy"), eq(ministers.userId, account.id))
            )
            .limit(1);

        if (!presidency && !economyMinistry) {
            return fail(403, { message: "Only the president or minister of economics can trade resources" });
        }

        const formData = await request.formData();
        const itemType = formData.get("itemType") as string;
        const itemName = formData.get("itemName") as string;
        const quantity = parseInt(formData.get("quantity") as string);
        const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

        if (!itemType || !itemName || quantity < 1 || pricePerUnit < 1) {
            return fail(400, { message: "Invalid sale data" });
        }

        // Check if state has enough resources
        if (itemType === "resource") {
            const [existing] = await db
                .select()
                .from(stateResourceInventory)
                .where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, itemName as any)))
                .limit(1);

            if (!existing || existing.quantity < quantity) {
                return fail(400, { message: "Insufficient resources" });
            }

            // Update inventory
            await db
                .update(stateResourceInventory)
                .set({
                    quantity: existing.quantity - quantity,
                    updatedAt: new Date()
                })
                .where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, itemName as any)));
        } else if (itemType === "product") {
            const [existing] = await db
                .select()
                .from(stateProductInventory)
                .where(and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, itemName as any)))
                .limit(1);

            if (!existing || existing.quantity < quantity) {
                return fail(400, { message: "Insufficient products" });
            }

            // Update inventory
            await db
                .update(stateProductInventory)
                .set({
                    quantity: existing.quantity - quantity,
                    updatedAt: new Date()
                })
                .where(and(eq(stateProductInventory.stateId, stateId), eq(stateProductInventory.productType, itemName as any)));
        }

        const totalRevenue = quantity * pricePerUnit;

        // Update treasury
        const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);

        const newBalance = (treasury?.balance || 0) + totalRevenue;

        if (treasury) {
            await db
                .update(stateTreasury)
                .set({
                    balance: newBalance,
                    totalCollected: sql`${stateTreasury.totalCollected} + ${totalRevenue}`,
                    updatedAt: new Date()
                })
                .where(eq(stateTreasury.stateId, stateId));
        } else {
            await db.insert(stateTreasury).values({
                stateId,
                balance: newBalance,
                totalCollected: totalRevenue,
                totalSpent: 0
            });
        }

        // Record transaction
        await db.insert(governmentBudgetTransactions).values({
            stateId,
            transactionType: "resource_sale",
            amount: totalRevenue,
            balanceAfter: newBalance,
            description: `Sold ${quantity}x ${itemName}`,
            authorizedBy: account.id,
            itemType,
            itemName,
            quantity,
            pricePerUnit
        });

        return {
            success: true,
            message: `Successfully sold ${quantity}x ${itemName} for $${totalRevenue.toLocaleString()}`
        };
    }
};
