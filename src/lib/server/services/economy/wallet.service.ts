// Wallet service - handles user wallet operations
import type { Database } from '../../db';
import { userWallets } from '../../schema';
import { eq } from 'drizzle-orm';
import { ECONOMY_CONFIG } from '$lib/config';

export class WalletService {
    constructor(private db: typeof import('../../db').db) { }

    async getWallet(userId: string) {
        const result = await this.db.select().from(userWallets).where(eq(userWallets.userId, userId));
        return result[0] || null;
    }

    async createWallet(userId: string) {
        const wallet = {
            userId,
            balance: ECONOMY_CONFIG.INITIAL_USER_WALLET
        };
        await this.db.insert(userWallets).values(wallet);
        return wallet;
    }

    async getOrCreateWallet(userId: string) {
        let wallet = await this.getWallet(userId);
        if (!wallet) {
            wallet = await this.createWallet(userId);
        }
        return wallet;
    }

    async addFunds(userId: string, amount: number) {
        const wallet = await this.getOrCreateWallet(userId);
        const newBalance = BigInt(wallet.balance) + BigInt(amount);

        await this.db
            .update(userWallets)
            .set({
                balance: Number(newBalance),
                updatedAt: new Date()
            })
            .where(eq(userWallets.userId, userId));

        return Number(newBalance);
    }

    async deductFunds(userId: string, amount: number) {
        const wallet = await this.getOrCreateWallet(userId);

        if (BigInt(wallet.balance) < BigInt(amount)) {
            throw new Error('Insufficient funds');
        }

        const newBalance = BigInt(wallet.balance) - BigInt(amount);

        await this.db
            .update(userWallets)
            .set({
                balance: Number(newBalance),
                updatedAt: new Date()
            })
            .where(eq(userWallets.userId, userId));

        return Number(newBalance);
    }

    async transfer(fromUserId: string, toUserId: string, amount: number) {
        // Start transaction
        await this.db.transaction(async (tx) => {
            await this.deductFunds(fromUserId, amount);
            await this.addFunds(toUserId, amount);
        });
    }

    async getBalance(userId: string): Promise<number> {
        const wallet = await this.getWallet(userId);
        return wallet ? Number(wallet.balance) : 0;
    }
}
