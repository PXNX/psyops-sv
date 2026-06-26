// src/routes/(authenticated)/(dock)/transactions/+page.server.ts
import { db } from "$lib/server/db";
import { transactionHistory, userProfiles, accounts, userWallets, factories, companies, states, files } from "$lib/server/schema";
import { eq, sql, desc, gte, and, inArray } from "drizzle-orm";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
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
            relatedUserName: userProfiles.name,
            relatedUserLogo: userProfiles.logo
        })
        .from(transactionHistory)
        .leftJoin(userProfiles, eq(transactionHistory.relatedUserId, userProfiles.accountId))
        .where(eq(transactionHistory.userId, account.id))
        .orderBy(desc(transactionHistory.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset);

    // Batch-resolve entity names and logos for related entities
    const factoryIds = [...new Set(transactions.filter(t => t.relatedEntityType === "factory" && t.relatedEntityId).map(t => t.relatedEntityId!))];
    const stateIds = [...new Set(transactions.filter(t => t.relatedEntityType === "state" && t.relatedEntityId).map(t => t.relatedEntityId!))];
    const companyIds = [...new Set(transactions.filter(t => t.relatedEntityType === "company" && t.relatedEntityId).map(t => t.relatedEntityId!))];

    const [factoryMap, stateMap, companyMap] = await Promise.all([
        factoryIds.length > 0
            ? db.select({ id: factories.id, name: factories.name, companyId: factories.companyId, companyName: companies.name, companyLogo: companies.logo })
                .from(factories)
                .leftJoin(companies, eq(factories.companyId, companies.id))
                .where(inArray(factories.id, factoryIds))
                .then(rows => new Map(rows.map(r => [r.id, r])))
            : Promise.resolve(new Map<number, { id: number; name: string; companyId: number; companyName: string | null; companyLogo: number | null }>()),
        stateIds.length > 0
            ? db.select({ id: states.id, name: states.name, logo: states.logo })
                .from(states)
                .where(inArray(states.id, stateIds))
                .then(rows => new Map(rows.map(r => [r.id, r])))
            : Promise.resolve(new Map<number, { id: number; name: string; logo: number | null }>()),
        companyIds.length > 0
            ? db.select({ id: companies.id, name: companies.name, logo: companies.logo })
                .from(companies)
                .where(inArray(companies.id, companyIds))
                .then(rows => new Map(rows.map(r => [r.id, r])))
            : Promise.resolve(new Map<number, { id: number; name: string; logo: number | null }>()),
    ]);

    // Collect all file IDs that need signed URLs
    const fileIds = new Set<number>();
    for (const tx of transactions) {
        if (tx.relatedUserLogo) fileIds.add(tx.relatedUserLogo);
    }
    for (const f of factoryMap.values()) {
        if (f.companyLogo) fileIds.add(f.companyLogo);
    }
    for (const s of stateMap.values()) {
        if (s.logo) fileIds.add(s.logo);
    }
    for (const c of companyMap.values()) {
        if (c.logo) fileIds.add(c.logo);
    }

    // Batch-fetch file keys and resolve signed URLs
    const fileUrlMap = new Map<number, string>();
    if (fileIds.size > 0) {
        const fileRows = await db.select({ id: files.id, key: files.key }).from(files).where(inArray(files.id, [...fileIds]));
        const urlResults = await Promise.all(fileRows.map(async (f) => {
            try {
                const url = await getSignedDownloadUrl(f.key);
                return { id: f.id, url };
            } catch {
                return { id: f.id, url: null };
            }
        }));
        for (const r of urlResults) {
            if (r.url) fileUrlMap.set(r.id, r.url);
        }
    }

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

    // Resolve entity display info per transaction
    function resolveEntity(tx: typeof transactions[number]): { name: string | null; avatarUrl: string | null; href: string | null } {
        const entityType = tx.relatedEntityType;
        const entityId = tx.relatedEntityId;

        if (entityType === "factory" && entityId) {
            const factory = factoryMap.get(entityId);
            if (factory) {
                return {
                    name: factory.name,
                    avatarUrl: factory.companyLogo ? fileUrlMap.get(factory.companyLogo) ?? null : null,
                    href: `/factory/${entityId}`
                };
            }
        }
        if (entityType === "state" && entityId) {
            const state = stateMap.get(entityId);
            if (state) {
                return {
                    name: state.name,
                    avatarUrl: state.logo ? fileUrlMap.get(state.logo) ?? null : null,
                    href: `/state/${entityId}`
                };
            }
        }
        if (entityType === "company" && entityId) {
            const company = companyMap.get(entityId);
            if (company) {
                return {
                    name: company.name,
                    avatarUrl: company.logo ? fileUrlMap.get(company.logo) ?? null : null,
                    href: `/company/${entityId}`
                };
            }
        }
        if (tx.relatedUserId) {
            return {
                name: tx.relatedUserName || "Unknown User",
                avatarUrl: tx.relatedUserLogo ? fileUrlMap.get(tx.relatedUserLogo) ?? null : null,
                href: `/user/${tx.relatedUserId}`
            };
        }
        return { name: null, avatarUrl: null, href: null };
    }

    // Format transactions for display
    const formattedTransactions = transactions.map((tx) => {
        const entity = resolveEntity(tx);
        return {
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
            entity,
            metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
            createdAt: tx.createdAt,
            isIncome: Number(tx.amount) > 0
        };
    });

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
