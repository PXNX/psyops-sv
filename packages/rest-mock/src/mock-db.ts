// Mock database using drizzle.mock({ schema })
// Provides:
//  1. A typed Drizzle ORM mock instance (same API as the real db)
//  2. A simple in-memory record store for the REST server to query

import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Re-export the schema from the main app (imported at the workspace level)
// In tests or the rest-mock server, seed data is kept in the record store below.
// The drizzle mock is mainly for type-safe service instantiation.

// ─── Drizzle mock factory ────────────────────────────────────────────────

/**
 * Create a drizzle.mock() instance with the given schema.
 * Callers pass in `* as schema` from the app's schema.ts so that
 * this package stays decoupled from the app's file paths.
 */
export function createMockDrizzle<S extends Record<string, unknown>>(schema: S) {
    return drizzle.mock({ schema }) as PostgresJsDatabase<S>;
}

// ─── In-memory record store (for REST server & seed data) ────────────────

type Row = Record<string, unknown>;

export class MockRecordStore {
    private tables = new Map<string, Row[]>();
    private counters = new Map<string, number>();

    // ── helpers ──

    private ensureTable(name: string): Row[] {
        if (!this.tables.has(name)) {
            this.tables.set(name, []);
        }
        return this.tables.get(name)!;
    }

    private nextId(table: string): number {
        const cur = this.counters.get(table) ?? 0;
        const next = cur + 1;
        this.counters.set(table, next);
        return next;
    }

    // ── CRUD ──

    getAll<T extends Row = Row>(table: string): T[] {
        return [...this.ensureTable(table)] as T[];
    }

    findById<T extends Row = Row>(table: string, id: string | number): T | undefined {
        return this.ensureTable(table).find((r) => r.id === id) as T | undefined;
    }

    findWhere<T extends Row = Row>(table: string, predicate: (row: T) => boolean): T[] {
        return (this.ensureTable(table) as T[]).filter(predicate);
    }

    findOneWhere<T extends Row = Row>(table: string, predicate: (row: T) => boolean): T | undefined {
        return (this.ensureTable(table) as T[]).find(predicate);
    }

    /**
     * Insert a row. If `id` is omitted and the table uses numeric IDs
     * (anything other than accounts / sessions), an auto-increment value is assigned.
     */
    insert<T extends Row = Row>(table: string, data: Partial<T> & Record<string, unknown>): T {
        const row = { ...data } as T;
        const needsAutoId = row.id === undefined || row.id === null;
        const hasStringId = table === "accounts" || table === "sessions";

        if (needsAutoId) {
            if (hasStringId) throw new Error(`Table "${table}" requires an explicit string id`);
            (row as Record<string, unknown>).id = this.nextId(table);
        }

        this.ensureTable(table).push(row as Row);
        return row;
    }

    update<T extends Row = Row>(table: string, id: string | number, patch: Partial<T>): T | undefined {
        const rows = this.ensureTable(table);
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) return undefined;
        rows[idx] = { ...rows[idx]!, ...patch };
        return rows[idx] as T;
    }

    updateWhere<T extends Row = Row>(table: string, predicate: (row: T) => boolean, patch: Partial<T>): T[] {
        const updated: T[] = [];
        const rows = this.ensureTable(table) as T[];
        for (let i = 0; i < rows.length; i++) {
            if (predicate(rows[i]!)) {
                rows[i] = { ...rows[i]!, ...patch };
                updated.push(rows[i]!);
            }
        }
        return updated;
    }

    delete(table: string, id: string | number): boolean {
        const rows = this.ensureTable(table);
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) return false;
        rows.splice(idx, 1);
        return true;
    }

    deleteWhere<T extends Row = Row>(table: string, predicate: (row: T) => boolean): number {
        const rows = this.ensureTable(table) as T[];
        const before = rows.length;
        const remaining = rows.filter((r) => !predicate(r));
        this.tables.set(table, remaining as Row[]);
        return before - remaining.length;
    }

    count(table: string): number {
        return this.ensureTable(table).length;
    }

    // ── convenience shortcuts ──

    getAccountByEmail(email: string) {
        return this.findOneWhere("accounts", (a: Row) => a.email === email);
    }

    getProfileByAccountId(accountId: string) {
        return this.findOneWhere("userProfiles", (p: Row) => p.accountId === accountId);
    }

    getWalletByUserId(userId: string) {
        return this.findOneWhere("userWallets", (w: Row) => w.userId === userId);
    }

    getResidenceByUserId(userId: string) {
        return this.findOneWhere("residences", (r: Row) => r.userId === userId);
    }

    getRegionsByState(stateId: number) {
        return this.findWhere("regions", (r: Row) => r.stateId === stateId);
    }

    getFactoriesByCompany(companyId: number) {
        return this.findWhere("factories", (f: Row) => f.companyId === companyId);
    }

    getCompaniesByOwner(ownerId: string) {
        return this.findWhere("companies", (c: Row) => c.ownerId === ownerId);
    }

    getActiveListings(itemType?: string, itemName?: string) {
        return this.findWhere("marketListings", (l: Row) => {
            if (itemType && l.itemType !== itemType) return false;
            if (itemName && l.itemName !== itemName) return false;
            return true;
        });
    }

    getChatMessages(messageType: string, limit = 50) {
        return this.findWhere(
            "chatMessages",
            (m: Row) => m.messageType === messageType && !m.isDeleted,
        ).slice(-limit);
    }

    // ── lifecycle ──

    reset(): void {
        this.tables.clear();
        this.counters.clear();
    }

    tableNames(): string[] {
        return [...this.tables.keys()];
    }
}

// ─── Singletons ──────────────────────────────────────────────────────────

let _store: MockRecordStore | null = null;

export function getMockStore(): MockRecordStore {
    if (!_store) _store = new MockRecordStore();
    return _store;
}

export function createMockStore(): MockRecordStore {
    return new MockRecordStore();
}

export function resetMockStore(): void {
    _store?.reset();
}
