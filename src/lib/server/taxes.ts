// src/lib/server/taxes.ts
import { db } from "$lib/server/db";
import { stateTaxes, taxRevenue, stateTreasury, governmentBudgetTransactions } from "$lib/server/schema";
import { eq, and, sql } from "drizzle-orm";

export type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

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
 * @returns Tax calculation breakdown
 */
export async function calculateAndCollectTax(
	stateId: number | null,
	taxType: "mining" | "production" | "market_transaction" | "income",
	grossAmount: number,
	userId: string,
	dbClient: DbClient = db
): Promise<TaxCalculation> {
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

	// Update state treasury
	const [treasury] = await dbClient.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId));

	let newBalance: number;
	if (treasury) {
		newBalance = treasury.balance + totalTaxAmount;
		await dbClient
			.update(stateTreasury)
			.set({
				balance: newBalance,
				totalCollected: sql`${stateTreasury.totalCollected} + ${totalTaxAmount}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));
	} else {
		newBalance = totalTaxAmount;
		await dbClient.insert(stateTreasury).values({
			stateId,
			balance: totalTaxAmount,
			totalCollected: totalTaxAmount,
			totalSpent: 0
		});
	}

	// Record government budget transaction
	const label = TAX_TYPE_LABELS[taxType] || taxType;
	await dbClient.insert(governmentBudgetTransactions).values({
		stateId,
		transactionType: "tax_collection",
		amount: totalTaxAmount,
		balanceAfter: newBalance,
		description: `${label} collected: $${totalTaxAmount.toLocaleString()} (${applicableTaxes.map((t) => `${t.rate}%`).join(" + ")})`,
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
export async function getActiveTaxes(stateId: number, dbClient: DbClient = db) {
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
	dbClient: DbClient = db
): Promise<{ taxAmount: number; netAmount: number }> {
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
