// Wallet service - handles user wallet operations
import type { Database } from "../../db";
import { userWallets } from "../../schema";
import { eq } from "drizzle-orm";
import { ECONOMY_CONFIG } from "#lib/config/index.js";
import { creditWallet, debitWallet, type Executor } from "../../money";

function assertPositiveAmount(amount: number) {
	if (!Number.isSafeInteger(amount) || amount <= 0) {
		throw new Error(`Invalid amount: ${amount}`);
	}
}

export class WalletService {
	constructor(private db: Database) {}

	// ============ Economy Calculations ============

	calculateTax(amount: number, taxRate: number): number {
		return Math.floor(amount * (taxRate / 100));
	}

	calculateMarketTransactionFee(totalPrice: number): number {
		return Math.floor(totalPrice * (ECONOMY_CONFIG.MARKET_TRANSACTION_FEE_PERCENT / 100));
	}

	calculateVisaCost(baseCost: number, taxRate: number): number {
		const tax = this.calculateTax(baseCost, taxRate);
		return baseCost + tax;
	}

	calculateFactoryOutput(productionRate: number, workerCount: number, infrastructureBonus: number = 0): number {
		const baseOutput = productionRate * workerCount;
		const bonus = infrastructureBonus * 0.01; // 1% per infrastructure point
		return Math.floor(baseOutput * (1 + bonus));
	}

	calculateResourceValue(resource: string, quantity: number): number {
		// Base values for resources (in currency)
		const baseValues: Record<string, number> = {
			iron: 10,
			copper: 15,
			steel: 50,
			gunpowder: 30,
			wood: 5,
			coal: 8,
			rifles: 100,
			ammunition: 5,
			artillery: 500,
			vehicles: 1000,
			explosives: 200
		};

		return (baseValues[resource] || 0) * quantity;
	}

	// ============ Wallet Operations ============

	async getWallet(userId: string) {
		const result = await this.db.select().from(userWallets).where(eq(userWallets.userId, userId));
		return result[0] || null;
	}

	async createWallet(userId: string) {
		const [wallet] = await this.db
			.insert(userWallets)
			.values({
				userId,
				balance: ECONOMY_CONFIG.INITIAL_USER_WALLET
			})
			.returning();
		return wallet;
	}

	async getOrCreateWallet(userId: string) {
		let wallet = await this.getWallet(userId);
		if (!wallet) {
			wallet = await this.createWallet(userId);
		}
		return wallet;
	}

	/** Credit a wallet (creating it on first use) and return the new balance. */
	async addFunds(userId: string, amount: number, db: Executor = this.db) {
		assertPositiveAmount(amount);
		await this.ensureWallet(userId, db);
		return creditWallet(db, userId, amount);
	}

	/** Debit a wallet; throws "Insufficient funds" rather than going negative. */
	async deductFunds(userId: string, amount: number, db: Executor = this.db) {
		assertPositiveAmount(amount);
		await this.ensureWallet(userId, db);
		return debitWallet(db, userId, amount);
	}

	/** Move money between two wallets: both legs commit together or not at all. */
	async transfer(fromUserId: string, toUserId: string, amount: number) {
		if (fromUserId === toUserId) throw new Error("Cannot transfer to the same wallet");
		await this.db.transaction(async (tx) => {
			await this.deductFunds(fromUserId, amount, tx);
			await this.addFunds(toUserId, amount, tx);
		});
	}

	private async ensureWallet(userId: string, db: Executor) {
		await db
			.insert(userWallets)
			.values({ userId, balance: ECONOMY_CONFIG.INITIAL_USER_WALLET })
			.onConflictDoNothing({ target: userWallets.userId });
	}

	async getBalance(userId: string): Promise<number> {
		const wallet = await this.getWallet(userId);
		return wallet ? Number(wallet.balance) : 0;
	}
}
