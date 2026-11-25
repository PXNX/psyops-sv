// src/lib/server/taxes.ts
import type { db } from "#lib/server/db.js";
import { stateTaxes, taxRevenue, stateTreasury, governmentBudgetTransactions } from "#lib/server/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { creditRegionalShare } from "#lib/server/services/politics/regional-budget.js";

export type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Resolve the live database only when a caller did not pass one. Keeping the
// import type-only lets services and tests import this module without loading
// the SvelteKit runtime just to get a default parameter.
async function resolveDb(dbClient?: DbClient): Promise<DbClient> {
	return dbClient ?? (await import("#lib/server/db.js")).db;
}

export interface TaxCalculation {
	grossAmount: number;
	taxAmount: number;
	netAmount: number;
	applicableTaxes: Array<{
		id: number;
		type: "mining" | "production" | "market_transaction" | "income";
		rate: number;
		amount: number;
	}>;
}

const TAX_TYPE_LABELS: Record<string, string> = {
	income: "Income tax",
	mining: "Mining tax",
	production: "Production tax",
	market_transaction: "Market transaction tax"
};

/**
 * Calculate and collect taxes for a transaction
 * @param stateId - The state where the transaction occurs
 * @param taxType - Type of tax to collect (mining, production, market_transaction, income)
 * @param grossAmount - The total amount before taxes
 * @param userId - The user paying the tax
 * @param dbClient - Optional database client (transaction or db instance)
 * @param regionId - The region the tax was raised in. When given, the state's
 *   regional share of it goes to that region's budget (regional-budget.ts) and
 *   only the rest reaches the treasury.
 * @returns Tax calculation breakdown
 */
export async function calculateAndCollectTax(
	stateId: number | null,
	taxType: "mining" | "production" | "market_transaction" | "income",
	grossAmount: number,
	userId: string,
	clientOpt?: DbClient,
	regionId?: number | null
): Promise<TaxCalculation> {
	const dbClient = await resolveDb(clientOpt);
	// No state (e.g. independent region) means no taxes are collected
	if (stateId === null) {
		return {
			grossAmount,
			taxAmount: 0,
			netAmount: grossAmount,
			applicableTaxes: []
		};
	}

	// Get active taxes for this state and type
	const activeTaxes = await dbClient
		.select()
		.from(stateTaxes)
		.where(and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.taxType, taxType), eq(stateTaxes.isActive, true)));

	if (activeTaxes.length === 0) {
		return {
			grossAmount,
			taxAmount: 0,
			netAmount: grossAmount,
			applicableTaxes: []
		};
	}

	// Calculate total tax amount
	let totalTaxAmount = 0;
	const applicableTaxes: TaxCalculation["applicableTaxes"] = [];

	for (const tax of activeTaxes) {
		const taxAmount = Math.floor((grossAmount * tax.taxRate) / 100);
		totalTaxAmount += taxAmount;

		applicableTaxes.push({
			id: tax.id,
			type: tax.taxType,
			rate: tax.taxRate,
			amount: taxAmount
		});

		// Record tax collection
		await dbClient.insert(taxRevenue).values({
			stateId,
			taxId: tax.id,
			amount: taxAmount,
			collectedFrom: userId,
			transactionType: taxType
		});
	}

	// The region keeps its share; the treasury gets the rest.
	const label = TAX_TYPE_LABELS[taxType] || taxType;
	const { regional, state: stateAmount } =
		regionId != null
			? await creditRegionalShare(dbClient as never, {
					stateId,
					regionId,
					taxAmount: totalTaxAmount,
					label,
					payerId: userId
				})
			: { regional: 0, state: totalTaxAmount };

	// Update state treasury
	const [treasury] = await dbClient.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId));

	let newBalance: number;
	if (treasury) {
		newBalance = treasury.balance + stateAmount;
		await dbClient
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} + ${stateAmount}`,
				totalCollected: sql`${stateTreasury.totalCollected} + ${stateAmount}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));
	} else {
		newBalance = stateAmount;
		await dbClient.insert(stateTreasury).values({
			stateId,
			balance: stateAmount,
			totalCollected: stateAmount,
			totalSpent: 0
		});
	}

	// Record government budget transaction
	const regionalNote = regional > 0 ? `, $${regional.toLocaleString()} kept by the region` : "";
	await dbClient.insert(governmentBudgetTransactions).values({
		stateId,
		transactionType: "tax_collection",
		amount: stateAmount,
		balanceAfter: newBalance,
		description: `${label} collected: $${totalTaxAmount.toLocaleString()} (${applicableTaxes.map((t) => `${t.rate}%`).join(" + ")})${regionalNote}`,
		authorizedBy: userId
	});

	return {
		grossAmount,
		taxAmount: totalTaxAmount,
		netAmount: grossAmount - totalTaxAmount,
		applicableTaxes
	};
}

/**
 * Get all active taxes for a state
 */
export async function getActiveTaxes(stateId: number, clientOpt?: DbClient) {
	const dbClient = await resolveDb(clientOpt);
	return await dbClient
		.select()
		.from(stateTaxes)
		.where(and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.isActive, true)));
}

/**
 * Preview tax amount without collecting
 */
export async function previewTax(
	stateId: number,
	taxType: "mining" | "production" | "market_transaction" | "income",
	grossAmount: number,
	clientOpt?: DbClient
): Promise<{ taxAmount: number; netAmount: number }> {
	const dbClient = await resolveDb(clientOpt);
	const activeTaxes = await dbClient
		.select()
		.from(stateTaxes)
		.where(and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.taxType, taxType), eq(stateTaxes.isActive, true)));

	let totalTaxAmount = 0;
	for (const tax of activeTaxes) {
		totalTaxAmount += Math.floor((grossAmount * tax.taxRate) / 100);
	}

	return {
		taxAmount: totalTaxAmount,
		netAmount: grossAmount - totalTaxAmount
	};
}
