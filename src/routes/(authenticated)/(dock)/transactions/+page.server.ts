// src/routes/(authenticated)/(dock)/transactions/+page.server.ts
import { db } from "$lib/server/db";
import { transactionHistory, userProfiles, accounts, userWallets } from "$lib/server/schema";
import { eq, sql, desc, gte, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
    const account = locals.account!;

    // Get page from URL query params (default to 1)
    const page = parseInt(url.searchParams.get("page") || "1");
    const offset = (page - 1) * PAGE_SIZE;

    // Get total count
    const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactionHistory)
        .where(eq(transactionHistory.userId, account.id));

    const totalPages = Math.ceil(count / PAGE_SIZE);

    // Get paginated transactions with related user information
    const transactions = await db
        .select({
            id: transactionHistory.id,
            transactionType: transactionHistory.transactionType,
            amount: transactionHistory.amount,
            balanceAfter: transactionHistory.balanceAfter,
            description: transactionHistory.description,
            relatedUserId: transactionHistory.relatedUserId,
            relatedEntityType: transactionHistory.relatedEntityType,
            relatedEntityId: transactionHistory.relatedEntityId,
            metadata: transactionHistory.metadata,
            createdAt: transactionHistory.createdAt,
            // Related user info (for transfers)
            relatedUserName: userProfiles.name
        })
        .from(transactionHistory)
        .leftJoin(userProfiles, eq(transactionHistory.relatedUserId, userProfiles.accountId))
        .where(eq(transactionHistory.userId, account.id))
        .orderBy(desc(transactionHistory.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset);

    // Get current balance
    const [wallet] = await db
        .select({ balance: userWallets.balance })
        .from(userWallets)
        .where(eq(userWallets.userId, account.id));

    // Get analytics data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await db
        .select({
            transactionType: transactionHistory.transactionType,
            amount: transactionHistory.amount,
            createdAt: transactionHistory.createdAt
        })
        .from(transactionHistory)
        .where(
            and(
                eq(transactionHistory.userId, account.id),
                gte(transactionHistory.createdAt, thirtyDaysAgo)
            )
        )
        .orderBy(desc(transactionHistory.createdAt));

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
        relatedUser: tx.relatedUserId
            ? {
                id: tx.relatedUserId,
                name: tx.relatedUserName || "Unknown User"
            }
            : null,
        relatedEntity: tx.relatedEntityType
            ? {
                type: tx.relatedEntityType,
                id: tx.relatedEntityId
            }
            : null,
        metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
        createdAt: tx.createdAt,
        // Determine if this was income or expense
        isIncome: Number(tx.amount) > 0
    }));

    return {
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
            currentBalance: wallet ? Number(wallet.balance) : 0,
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
