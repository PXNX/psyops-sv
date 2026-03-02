// src/routes/(authenticated)/(dock)/state/[id]/budget/+page.server.ts
import { db } from "$lib/server/db";
import {
    states,
    governmentBudgetTransactions,
    userProfiles,
    accounts,
    stateTreasury
} from "$lib/server/schema";
import { eq, sql, desc } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, url }) => {
    const stateId = parseInt(params.id);

    // Get page from URL query params (default to 1)
    const page = parseInt(url.searchParams.get("page") || "1");
    const offset = (page - 1) * PAGE_SIZE;

    // Get state info
    const [state] = await db.select().from(states).where(eq(states.id, stateId)).limit(1);

    if (!state) {
        error(404, "State not found");
    }

    // Get total count
    const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(governmentBudgetTransactions)
        .where(eq(governmentBudgetTransactions.stateId, stateId));

    const totalPages = Math.ceil(count / PAGE_SIZE);

    // Get paginated transactions with user information
    const transactions = await db
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
            authorizerName: userProfiles.name
        })
        .from(governmentBudgetTransactions)
        .leftJoin(accounts, eq(governmentBudgetTransactions.authorizedBy, accounts.id))
        .leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
        .where(eq(governmentBudgetTransactions.stateId, stateId))
        .orderBy(desc(governmentBudgetTransactions.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset);

    // Get current treasury balance
    const [treasury] = await db
        .select({ balance: stateTreasury.balance })
        .from(stateTreasury)
        .where(eq(stateTreasury.stateId, stateId));

    // Get analytics data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await db
        .select({
            transactionType: governmentBudgetTransactions.transactionType,
            amount: governmentBudgetTransactions.amount,
            createdAt: governmentBudgetTransactions.createdAt
        })
        .from(governmentBudgetTransactions)
        .where(
            sql`${governmentBudgetTransactions.stateId} = ${stateId} AND ${governmentBudgetTransactions.createdAt} >= ${thirtyDaysAgo}`
        )
        .orderBy(desc(governmentBudgetTransactions.createdAt));

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
    const formattedTransactions = transactions.map((tx) => ({
        id: tx.id,
        type: tx.transactionType,
        amount: Number(tx.amount),
        balanceAfter: Number(tx.balanceAfter),
        description: tx.description,
        authorizedBy: {
            id: tx.authorizedBy,
            name: tx.authorizerName || "Unknown User"
        },
        itemType: tx.itemType,
        itemName: tx.itemName,
        quantity: tx.quantity,
        pricePerUnit: tx.pricePerUnit ? Number(tx.pricePerUnit) : null,
        metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
        createdAt: tx.createdAt,
        isIncome: Number(tx.amount) > 0
    }));

    return {
        state: {
            id: state.id,
            name: state.name
        },
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
