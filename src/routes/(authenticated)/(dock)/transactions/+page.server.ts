// src/routes/(authenticated)/(dock)/transactions/+page.server.ts
import { db } from "$lib/server/db";
import { transactionHistory, userProfiles, accounts } from "$lib/server/schema";
import { eq, sql, desc } from "drizzle-orm";
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
        }
    };
};
