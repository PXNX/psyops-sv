// Authentication service
import type { Database } from '../../db';
import { accounts, sessions, userProfiles } from '../../schema';
import { eq } from 'drizzle-orm';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';

export class AuthService {
    constructor(private db: typeof import('../../db').db) { }

    generateSessionToken(): string {
        const bytes = new Uint8Array(20);
        crypto.getRandomValues(bytes);
        return encodeBase32LowerCaseNoPadding(bytes);
    }

    async createSession(token: string, accountId: string) {
        const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
        const session = {
            id: sessionId,
            accountId,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
        };

        await this.db.insert(sessions).values(session);
        return session;
    }

    async validateSessionToken(token: string) {
        const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
        const result = await this.db
            .select({ account: accounts, session: sessions })
            .from(sessions)
            .innerJoin(accounts, eq(sessions.accountId, accounts.id))
            .where(eq(sessions.id, sessionId));

        if (result.length === 0) {
            return { session: null, account: null };
        }

        const { session, account } = result[0]!;

        if (Date.now() >= session.expiresAt.getTime()) {
            await this.db.delete(sessions).where(eq(sessions.id, session.id));
            return { session: null, account: null };
        }

        // Extend session if it's past halfway through its lifetime
        if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
            session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
            await this.db
                .update(sessions)
                .set({ expiresAt: session.expiresAt })
                .where(eq(sessions.id, session.id));
        }

        return { session, account };
    }

    async invalidateSession(sessionId: string) {
        await this.db.delete(sessions).where(eq(sessions.id, sessionId));
    }

    async getUserProfile(accountId: string) {
        const result = await this.db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.accountId, accountId));
        return result[0] || null;
    }
}
