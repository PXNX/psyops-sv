import { db } from "#lib/server/db.js";
import {
	states,
	ministers,
	presidents,
	stateTreasury,
	stateResourceInventory,
	governmentBudgetTransactions
} from "#lib/server/schema.js";
import { eq, and, gte, sql } from "drizzle-orm";
import { fail, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

// The government market is the game itself: it sells at a fixed price and
// buys back for less, so a state can't trade with itself for profit. Prices
// are never taken from the form.
const BUY_PRICES: Record<string, number> = {
	iron: 1000,
	copper: 1200,
	steel: 1500,
	gunpowder: 2000,
	wood: 800,
	coal: 900,
	// Strategic and energy goods procured on the world market. A blockade does
	// not change this house price; the energy desk prices imported plant parts
	// separately and adds a blockade surcharge there.
	oil: 3000,
	gas: 2500,
	uranium: 9000,
	rare_earth: 6000,
	silicon: 4000,
	fuel: 5000,
	enriched_uranium: 40000
};
const SELL_RATIO = 0.7;
const sellPrice = (resource: string) => Math.floor((BUY_PRICES[resource] ?? 0) * SELL_RATIO);
const MAX_QUANTITY = 100_000;

async function canTradeFor(stateId: number, userId: string) {
	const [[presidency], [economyMinistry]] = await Promise.all([
		db
			.select({ id: presidents.id })
			.from(presidents)
			.where(and(eq(presidents.stateId, stateId), eq(presidents.userId, userId)))
			.limit(1),
		db
			.select({ id: ministers.id })
			.from(ministers)
			.where(and(eq(ministers.stateId, stateId), eq(ministers.ministry, "economy"), eq(ministers.userId, userId)))
			.limit(1)
	]);
	return !!presidency || !!economyMinistry;
}

async function readTrade(request: Request) {
	const formData = await request.formData();
	const resourceName = String(formData.get("resourceName") ?? "");
	const quantity = Number(formData.get("quantity"));
	if (!(resourceName in BUY_PRICES) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
		return null;
	}
	return { resourceName, quantity };
}

class TradeRefused extends Error {}

export const load: PageServerLoad = async ({ params, locals }) => {
	const stateId = parseInt(params.id);
	const account = locals.account!;

	const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);

	if (!state) {
		error(404, "State not found");
	}

	const [[presidency], [economyMinistry], [treasury], stateResources] = await Promise.all([
		db
			.select()
			.from(presidents)
			.where(and(eq(presidents.stateId, stateId), eq(presidents.userId, account.id)))
			.limit(1),
		db
			.select()
			.from(ministers)
			.where(and(eq(ministers.stateId, stateId), eq(ministers.ministry, "economy"), eq(ministers.userId, account.id)))
			.limit(1),
		db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId)).limit(1),
		db.select().from(stateResourceInventory).where(eq(stateResourceInventory.stateId, stateId))
	]);

	const canTrade = !!presidency || !!economyMinistry;

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
		marketPrices: BUY_PRICES,
		sellPrices: Object.fromEntries(Object.keys(BUY_PRICES).map((r) => [r, sellPrice(r)]))
	};
};

export const actions: Actions = {
	buyResource: async ({ request, params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		if (!(await canTradeFor(stateId, account.id))) {
			return fail(403, { error: "Only the president or the economy minister can trade resources." });
		}
		const trade = await readTrade(request);
		if (!trade) return fail(400, { error: "Choose a resource and a quantity." });
		const { resourceName, quantity } = trade;
		const pricePerUnit = BUY_PRICES[resourceName];
		const totalCost = quantity * pricePerUnit;

		try {
			await db.transaction(async (tx) => {
				const [paid] = await tx
					.update(stateTreasury)
					.set({
						balance: sql`${stateTreasury.balance} - ${totalCost}`,
						totalSpent: sql`${stateTreasury.totalSpent} + ${totalCost}`,
						updatedAt: new Date()
					})
					.where(and(eq(stateTreasury.stateId, stateId), gte(stateTreasury.balance, totalCost)))
					.returning({ balance: stateTreasury.balance });
				if (!paid) throw new TradeRefused("The treasury can't afford that.");

				await tx
					.insert(stateResourceInventory)
					.values({ stateId, resourceType: resourceName as never, quantity })
					.onConflictDoUpdate({
						target: [stateResourceInventory.stateId, stateResourceInventory.resourceType],
						set: { quantity: sql`${stateResourceInventory.quantity} + ${quantity}`, updatedAt: new Date() }
					});

				await tx.insert(governmentBudgetTransactions).values({
					stateId,
					transactionType: "resource_purchase",
					amount: -totalCost,
					balanceAfter: paid.balance,
					description: `Purchased ${quantity}x ${resourceName}`,
					authorizedBy: account.id,
					itemType: "resource",
					itemName: resourceName,
					quantity,
					pricePerUnit
				});
			});
		} catch (err) {
			if (err instanceof TradeRefused) return fail(400, { error: err.message });
			throw err;
		}

		return { success: true, message: `Bought ${quantity} ${resourceName} for $${totalCost.toLocaleString()}.` };
	},

	sellResource: async ({ request, params, locals }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);
		if (!(await canTradeFor(stateId, account.id))) {
			return fail(403, { error: "Only the president or the economy minister can trade resources." });
		}
		const trade = await readTrade(request);
		if (!trade) return fail(400, { error: "Choose a resource and a quantity." });
		const { resourceName, quantity } = trade;
		const pricePerUnit = sellPrice(resourceName);
		const totalRevenue = quantity * pricePerUnit;

		try {
			await db.transaction(async (tx) => {
				const [taken] = await tx
					.update(stateResourceInventory)
					.set({ quantity: sql`${stateResourceInventory.quantity} - ${quantity}`, updatedAt: new Date() })
					.where(
						and(
							eq(stateResourceInventory.stateId, stateId),
							eq(stateResourceInventory.resourceType, resourceName as never),
							gte(stateResourceInventory.quantity, quantity)
						)
					)
					.returning({ id: stateResourceInventory.id });
				if (!taken) throw new TradeRefused(`The stockpile doesn't have ${quantity} ${resourceName}.`);

				const [treasury] = await tx
					.insert(stateTreasury)
					.values({ stateId, balance: totalRevenue, totalCollected: totalRevenue, totalSpent: 0 })
					.onConflictDoUpdate({
						target: stateTreasury.stateId,
						set: {
							balance: sql`${stateTreasury.balance} + ${totalRevenue}`,
							totalCollected: sql`${stateTreasury.totalCollected} + ${totalRevenue}`,
							updatedAt: new Date()
						}
					})
					.returning({ balance: stateTreasury.balance });

				await tx.insert(governmentBudgetTransactions).values({
					stateId,
					transactionType: "resource_sale",
					amount: totalRevenue,
					balanceAfter: treasury!.balance,
					description: `Sold ${quantity}x ${resourceName}`,
					authorizedBy: account.id,
					itemType: "resource",
					itemName: resourceName,
					quantity,
					pricePerUnit
				});
			});
		} catch (err) {
			if (err instanceof TradeRefused) return fail(400, { error: err.message });
			throw err;
		}

		return { success: true, message: `Sold ${quantity} ${resourceName} for $${totalRevenue.toLocaleString()}.` };
	}
};
