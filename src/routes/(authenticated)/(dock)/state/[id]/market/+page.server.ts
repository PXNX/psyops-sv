import { db } from "$lib/server/db";
import {
    states,
    ministers,
    presidents,
    stateTreasury,
    stateResourceInventory,
    governmentBudgetTransactions
} from "$lib/server/schema";
import { eq, and, sql } from "drizzle-orm";
import { fail, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const stateId = parseInt(params.id);
    const account = locals.account!;

    const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);

    if (!state) {
        error(404, "State not found");
    }

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

    const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);

    const stateResources = await db
        .select()
        .from(stateResourceInventory)
        .where(eq(stateResourceInventory.stateId, stateId));

    const marketPrices: Record<string, number> = {
        iron: 1000,
        copper: 1200,
        steel: 1500,
        gunpowder: 2000,
        wood: 800,
        coal: 900
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
        marketPrices
    };
};

export const actions: Actions = {
    buyResource: async ({ request, params, locals }) => {
        const account = locals.account!;
        const stateId = parseInt(params.id);

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
        const resourceName = formData.get("resourceName") as string;
        const quantity = parseInt(formData.get("quantity") as string);
        const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

        if (!resourceName || quantity < 1 || pricePerUnit < 1) {
            return fail(400, { message: "Invalid purchase data" });
        }

        const totalCost = quantity * pricePerUnit;

        const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1);

        if (!treasury || treasury.balance < totalCost) {
            return fail(400, {
                message: "Insufficient treasury funds",
                required: totalCost,
                available: treasury?.balance || 0
            });
        }

        const newBalance = treasury.balance - totalCost;
        await db
            .update(stateTreasury)
            .set({
                balance: newBalance,
                totalSpent: sql`${stateTreasury.totalSpent} + ${totalCost}`,
                updatedAt: new Date()
            })
            .where(eq(stateTreasury.stateId, stateId));

        const [existing] = await db
            .select()
            .from(stateResourceInventory)
            .where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resourceName as any)))
            .limit(1);

        if (existing) {
            await db
                .update(stateResourceInventory)
                .set({
                    quantity: existing.quantity + quantity,
                    updatedAt: new Date()
                })
                .where(
                    and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resourceName as any))
                );
        } else {
            await db.insert(stateResourceInventory).values({
                stateId,
                resourceType: resourceName as any,
                quantity
            });
        }

        await db.insert(governmentBudgetTransactions).values({
            stateId,
            transactionType: "resource_purchase",
            amount: -totalCost,
            balanceAfter: newBalance,
            description: `Purchased ${quantity}x ${resourceName}`,
            authorizedBy: account.id,
            itemType: "resource",
            itemName: resourceName,
            quantity,
            pricePerUnit
        });

        return {
            success: true,
            message: `Successfully purchased ${quantity}x ${resourceName} for $${totalCost.toLocaleString()}`
        };
    },

    sellResource: async ({ request, params, locals }) => {
        const account = locals.account!;
        const stateId = parseInt(params.id);

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
        const resourceName = formData.get("resourceName") as string;
        const quantity = parseInt(formData.get("quantity") as string);
        const pricePerUnit = parseInt(formData.get("pricePerUnit") as string);

        if (!resourceName || quantity < 1 || pricePerUnit < 1) {
            return fail(400, { message: "Invalid sale data" });
        }

        const [existing] = await db
            .select()
            .from(stateResourceInventory)
            .where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resourceName as any)))
            .limit(1);

        if (!existing || existing.quantity < quantity) {
            return fail(400, { message: "Insufficient resources" });
        }

        await db
            .update(stateResourceInventory)
            .set({
                quantity: existing.quantity - quantity,
                updatedAt: new Date()
            })
            .where(and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resourceName as any)));

        const totalRevenue = quantity * pricePerUnit;

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

        await db.insert(governmentBudgetTransactions).values({
            stateId,
            transactionType: "resource_sale",
            amount: totalRevenue,
            balanceAfter: newBalance,
            description: `Sold ${quantity}x ${resourceName}`,
            authorizedBy: account.id,
            itemType: "resource",
            itemName: resourceName,
            quantity,
            pricePerUnit
        });

        return {
            success: true,
            message: `Successfully sold ${quantity}x ${resourceName} for $${totalRevenue.toLocaleString()}`
        };
    }
};
