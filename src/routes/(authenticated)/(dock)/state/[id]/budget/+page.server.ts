// src/routes/(authenticated)/(dock)/state/[id]/budget/+page.server.ts
import { db } from "#lib/server/db.js";
import { states, governmentBudgetTransactions, userProfiles, accounts, stateTreasury } from "#lib/server/schema.js";
import { and, eq, gte, sql, desc } from "drizzle-orm";
import { error, fail } from "@sveltejs/kit";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	RegionalBudgetError,
	setRegionShareOverride,
	setStateRegionalShare,
	stateRegionalShares
} from "#lib/server/services/politics/regional-budget.js";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

/** A malformed or non-JSON ledger note must never take down the page. */
function parseMetadata(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const stateId = parseInt(params.id);

	// Get page from URL query params (default to 1)
	const page = parseInt(url.searchParams.get("page") || "1");
	const offset = (page - 1) * PAGE_SIZE;

	// Get analytics data (last 30 days)
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// All lookups are independent reads, so fetch them in parallel
	const [state, [{ count }], transactions, [treasury], recentTransactions] = await Promise.all([
		// Get state info; fail fast if it doesn't exist
		db
			.select()
			.from(states)
			.where(eq(states.id, stateId))
			.limit(1)
			.then(([state]) => state ?? error(404, "State not found")),
		// Get total count
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(governmentBudgetTransactions)
			.where(eq(governmentBudgetTransactions.stateId, stateId)),
		// Get paginated transactions with user information
		db
			.select({
				id: governmentBudgetTransactions.id,
				transactionType: governmentBudgetTransactions.transactionType,
				amount: governmentBudgetTransactions.amount,
				balanceAfter: governmentBudgetTransactions.balanceAfter,
				description: governmentBudgetTransactions.description,
				authorizedBy: governmentBudgetTransactions.authorizedBy,
				itemType: governmentBudgetTransactions.itemType,
				itemName: governmentBudgetTransactions.itemName,
				quantity: governmentBudgetTransactions.quantity,
				pricePerUnit: governmentBudgetTransactions.pricePerUnit,
				metadata: governmentBudgetTransactions.metadata,
				createdAt: governmentBudgetTransactions.createdAt,
				// User info
				authorizerName: userProfiles.name,
				authorizerLogo: userProfiles.logo
			})
			.from(governmentBudgetTransactions)
			.leftJoin(accounts, eq(governmentBudgetTransactions.authorizedBy, accounts.id))
			.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
			.where(eq(governmentBudgetTransactions.stateId, stateId))
			.orderBy(desc(governmentBudgetTransactions.createdAt))
			.limit(PAGE_SIZE)
			.offset(offset),
		// Get current treasury balance
		db.select({ balance: stateTreasury.balance }).from(stateTreasury).where(eq(stateTreasury.stateId, stateId)),
		db
			.select({
				transactionType: governmentBudgetTransactions.transactionType,
				amount: governmentBudgetTransactions.amount,
				createdAt: governmentBudgetTransactions.createdAt
			})
			.from(governmentBudgetTransactions)
			.where(
				and(
					eq(governmentBudgetTransactions.stateId, stateId),
					gte(governmentBudgetTransactions.createdAt, thirtyDaysAgo)
				)
			)
			.orderBy(desc(governmentBudgetTransactions.createdAt))
	]);

	const totalPages = Math.ceil(count / PAGE_SIZE);
	// How local tax is split between each region's budget and the treasury.
	const regionalShare = await stateRegionalShares(db, stateId, locals.account!.id);

	// Calculate analytics
	let totalIncome = 0;
	let totalExpenses = 0;
	const categoryBreakdown: Record<string, { income: number; expenses: number }> = {};

	for (const tx of recentTransactions) {
		const amount = Number(tx.amount);

		if (amount > 0) {
			totalIncome += amount;
		} else {
			totalExpenses += Math.abs(amount);
		}

		// Category breakdown
		if (!categoryBreakdown[tx.transactionType]) {
			categoryBreakdown[tx.transactionType] = { income: 0, expenses: 0 };
		}

		if (amount > 0) {
			categoryBreakdown[tx.transactionType].income += amount;
		} else {
			categoryBreakdown[tx.transactionType].expenses += Math.abs(amount);
		}
	}

	// Format transactions for display
	const authorizerLogos = await Promise.all(transactions.map((tx) => getLogoUrl(tx.authorizerLogo)));
	const formattedTransactions = transactions.map((tx, i) => ({
		id: tx.id,
		type: tx.transactionType,
		amount: Number(tx.amount),
		balanceAfter: Number(tx.balanceAfter),
		description: tx.description,
		authorizedBy: {
			id: tx.authorizedBy,
			name: tx.authorizerName || "Unknown User",
			logo: authorizerLogos[i]
		},
		itemType: tx.itemType,
		itemName: tx.itemName,
		quantity: tx.quantity,
		pricePerUnit: tx.pricePerUnit ? Number(tx.pricePerUnit) : null,
		metadata: tx.metadata ? parseMetadata(tx.metadata) : null,
		createdAt: tx.createdAt,
		isIncome: Number(tx.amount) > 0
	}));

	return {
		state: {
			id: state.id,
			name: state.name
		},
		regionalShare,
		transactions: formattedTransactions,
		pagination: {
			currentPage: page,
			totalPages,
			totalCount: count,
			pageSize: PAGE_SIZE,
			hasNextPage: page < totalPages,
			hasPreviousPage: page > 1
		},
		analytics: {
			currentBalance: treasury ? Number(treasury.balance) : 0,
			totalIncome,
			totalExpenses,
			netChange: totalIncome - totalExpenses,
			categoryBreakdown: Object.entries(categoryBreakdown).map(([type, data]) => ({
				type,
				income: data.income,
				expenses: data.expenses,
				net: data.income - data.expenses
			}))
		}
	};
};

/** Parse a percent field; empty means "no value". */
function percent(raw: FormDataEntryValue | null): number | null {
	const s = String(raw ?? "").trim();
	if (s === "") return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : NaN;
}

export const actions: Actions = {
	// President or economy minister: the state's default regional share.
	setRegionalShare: async ({ params, request, locals }) => {
		const form = await request.formData();
		const share = percent(form.get("share"));
		if (share === null || Number.isNaN(share)) return fail(400, { error: "Enter a share in percent." });
		try {
			const applied = await setStateRegionalShare(db, {
				stateId: parseInt(params.id),
				userId: locals.account!.id,
				share
			});
			return { success: true, message: `Regions now keep ${applied}% of the tax raised in them.` };
		} catch (err) {
			if (err instanceof RegionalBudgetError) return fail(403, { error: err.message });
			throw err;
		}
	},
	// One region's override; an empty share clears it.
	setRegionOverride: async ({ params, request, locals }) => {
		const form = await request.formData();
		const regionId = Number(form.get("regionId"));
		const share = percent(form.get("share"));
		if (!Number.isInteger(regionId)) return fail(400, { error: "Pick a region." });
		if (Number.isNaN(share)) return fail(400, { error: "Enter a share in percent." });
		try {
			const applied = await setRegionShareOverride(db, {
				stateId: parseInt(params.id),
				regionId,
				userId: locals.account!.id,
				share
			});
			return {
				success: true,
				message:
					applied === null ? "Override cleared; the region follows the state share." : `Override set to ${applied}%.`
			};
		} catch (err) {
			if (err instanceof RegionalBudgetError) return fail(403, { error: err.message });
			throw err;
		}
	}
};
