// src/lib/server/taxes.ts
import { db } from "$lib/server/db";
import { stateTaxes, taxRevenue, stateTreasury } from "$lib/server/schema";
import { eq, and, sql } from "drizzle-orm";

export interface TaxCalculation {
	grossAmount: number;
	taxAmount: number;
	netAmount: number;
	applicableTaxes: Array<{
		id: number;
		name: string;
		rate: number;
		amount: number;
	}>;
}

/**
 * Calculate and collect taxes for a transaction
 * @param stateId - The state where the transaction occurs
 * @param taxType - Type of tax to collect (mining, production, market_transaction, income)
 * @param grossAmount - The total amount before taxes
 * @param userId - The user paying the tax
 * @returns Tax calculation breakdown
 */
export async function calculateAndCollectTax(
	stateId: number,
	taxType: "mining" | "production" | "market_transaction" | "income",
	grossAmount: number,
	userId: string
): Promise<TaxCalculation> {
	// Get active taxes for this state and type
	const activeTaxes = await db
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
			name: tax.taxName,
			rate: tax.taxRate,
			amount: taxAmount
		});

		// Record tax collection
		await db.insert(taxRevenue).values({
			stateId,
			taxId: tax.id,
			amount: taxAmount,
			collectedFrom: userId,
			transactionType: taxType
		});
	}

	// Update state treasury
	const [treasury] = await db.select().from(stateTreasury).where(eq(stateTreasury.stateId, stateId));

	if (treasury) {
		await db
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} + ${totalTaxAmount}`,
				totalCollected: sql`${stateTreasury.totalCollected} + ${totalTaxAmount}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));
	} else {
		// Create treasury if it doesn't exist
		await db.insert(stateTreasury).values({
			stateId,
			balance: totalTaxAmount,
			totalCollected: totalTaxAmount,
			totalSpent: 0
		});
	}

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
export async function getActiveTaxes(stateId: number) {
	return await db
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
	grossAmount: number
): Promise<{ taxAmount: number; netAmount: number }> {
	const activeTaxes = await db
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
