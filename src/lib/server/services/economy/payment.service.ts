// Centralized payment service - handles all money transfers and creates transaction receipts
import type { Database } from '../../db';
import { userWallets, transactionHistory, type TransactionHistory } from '../../schema';
import { eq, sql, desc } from 'drizzle-orm';

export interface PaymentOptions {
    userId: string;
    amount: number;
    transactionType: TransactionHistory['transactionType'];
    description: string;
    relatedUserId?: string;
    relatedEntityType?: string;
    relatedEntityId?: number;
    metadata?: Record<string, any>;
}

export interface TransferOptions {
    fromUserId: string;
    toUserId: string;
    amount: number;
    transactionType: TransactionHistory['transactionType'];
    description: string;
    relatedEntityType?: string;
    relatedEntityId?: number;
    metadata?: Record<string, any>;
}

export interface TaxPaymentOptions {
    userId: string;
    taxAmount: number;
    taxType: 'mining' | 'production' | 'market_transaction' | 'income';
    grossAmount: number;
    stateId: number;
    relatedTransactionType?: TransactionHistory['transactionType'];
    relatedEntityType?: string;
    relatedEntityId?: number;
    metadata?: Record<string, any>;
}

export class PaymentService {
    constructor(private db: typeof import('../../db').db) { }

    /**
     * Add funds to a user's wallet and create a transaction record
     */
    async addFunds(options: PaymentOptions): Promise<TransactionHistory> {
        const { userId, amount, transactionType, description, relatedUserId, relatedEntityType, relatedEntityId, metadata } = options;

        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        // Update wallet balance
        const [updatedWallet] = await this.db
            .update(userWallets)
            .set({
                balance: sql`${userWallets.balance} + ${amount}`,
                updatedAt: new Date()
            })
            .where(eq(userWallets.userId, userId))
            .returning();

        if (!updatedWallet) {
            throw new Error('Wallet not found');
        }

        // Create transaction record
        const [transaction] = await this.db
            .insert(transactionHistory)
            .values({
                userId,
                transactionType,
                amount,
                balanceAfter: updatedWallet.balance,
                description,
                relatedUserId,
                relatedEntityType,
                relatedEntityId,
                metadata: metadata ? JSON.stringify(metadata) : null
            })
            .returning();

        return transaction;
    }

    /**
     * Deduct funds from a user's wallet and create a transaction record
     */
    async deductFunds(options: PaymentOptions): Promise<TransactionHistory> {
        const { userId, amount, transactionType, description, relatedUserId, relatedEntityType, relatedEntityId, metadata } = options;

        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        // Check balance first
        const [wallet] = await this.db
            .select()
            .from(userWallets)
            .where(eq(userWallets.userId, userId));

        if (!wallet) {
            throw new Error('Wallet not found');
        }

        if (wallet.balance < amount) {
            throw new Error('Insufficient funds');
        }

        // Update wallet balance
        const [updatedWallet] = await this.db
            .update(userWallets)
            .set({
                balance: sql`${userWallets.balance} - ${amount}`,
                updatedAt: new Date()
            })
            .where(eq(userWallets.userId, userId))
            .returning();

        // Create transaction record with negative amount for deductions
        const [transaction] = await this.db
            .insert(transactionHistory)
            .values({
                userId,
                transactionType,
                amount: -amount, // Negative for deductions
                balanceAfter: updatedWallet.balance,
                description,
                relatedUserId,
                relatedEntityType,
                relatedEntityId,
                metadata: metadata ? JSON.stringify(metadata) : null
            })
            .returning();

        return transaction;
    }

    /**
     * Transfer funds from one user to another and create transaction records for both
     */
    async transfer(options: TransferOptions): Promise<{ fromTransaction: TransactionHistory; toTransaction: TransactionHistory }> {
        const { fromUserId, toUserId, amount, transactionType, description, relatedEntityType, relatedEntityId, metadata } = options;

        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        // Check sender's balance
        const [senderWallet] = await this.db
            .select()
            .from(userWallets)
            .where(eq(userWallets.userId, fromUserId));

        if (!senderWallet) {
            throw new Error('Sender wallet not found');
        }

        if (senderWallet.balance < amount) {
            throw new Error('Insufficient funds');
        }

        // Update sender's wallet
        const [updatedSenderWallet] = await this.db
            .update(userWallets)
            .set({
                balance: sql`${userWallets.balance} - ${amount}`,
                updatedAt: new Date()
            })
            .where(eq(userWallets.userId, fromUserId))
            .returning();

        // Update recipient's wallet
        const [updatedRecipientWallet] = await this.db
            .update(userWallets)
            .set({
                balance: sql`${userWallets.balance} + ${amount}`,
                updatedAt: new Date()
            })
            .where(eq(userWallets.userId, toUserId))
            .returning();

        if (!updatedRecipientWallet) {
            throw new Error('Recipient wallet not found');
        }

        // Create transaction record for sender (negative amount)
        const [fromTransaction] = await this.db
            .insert(transactionHistory)
            .values({
                userId: fromUserId,
                transactionType,
                amount: -amount,
                balanceAfter: updatedSenderWallet.balance,
                description,
                relatedUserId: toUserId,
                relatedEntityType,
                relatedEntityId,
                metadata: metadata ? JSON.stringify(metadata) : null
            })
            .returning();

        // Create transaction record for recipient (positive amount)
        const [toTransaction] = await this.db
            .insert(transactionHistory)
            .values({
                userId: toUserId,
                transactionType,
                amount,
                balanceAfter: updatedRecipientWallet.balance,
                description,
                relatedUserId: fromUserId,
                relatedEntityType,
                relatedEntityId,
                metadata: metadata ? JSON.stringify(metadata) : null
            })
            .returning();

        return { fromTransaction, toTransaction };
    }

    /**
     * Record a tax payment in transaction history
     * This should be called AFTER the tax system has already deducted the tax from the wallet
     * and added it to the state treasury. This method just creates the audit trail.
     */
    async recordTaxPayment(options: TaxPaymentOptions): Promise<TransactionHistory> {
        const { userId, taxAmount, taxType, grossAmount, stateId, relatedTransactionType, relatedEntityType, relatedEntityId, metadata } = options;

        if (taxAmount <= 0) {
            throw new Error('Tax amount must be positive');
        }

        // Get current wallet balance (already updated by tax system)
        const [wallet] = await this.db
            .select({ balance: userWallets.balance })
            .from(userWallets)
            .where(eq(userWallets.userId, userId));

        if (!wallet) {
            throw new Error('Wallet not found');
        }

        // Format tax type for display
        const taxTypeDisplay = taxType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Calculate tax rate
        const taxRate = ((taxAmount / grossAmount) * 100).toFixed(1);

        // Create transaction record
        const [transaction] = await this.db
            .insert(transactionHistory)
            .values({
                userId,
                transactionType: 'tax_payment',
                amount: -taxAmount, // Negative since it's a deduction
                balanceAfter: wallet.balance,
                description: `${taxTypeDisplay} Tax (${taxRate}% of $${grossAmount.toLocaleString()})`,
                relatedEntityType: relatedEntityType || 'state',
                relatedEntityId: relatedEntityId || stateId,
                metadata: JSON.stringify({
                    taxType,
                    grossAmount,
                    taxAmount,
                    netAmount: grossAmount - taxAmount,
                    taxRate: parseFloat(taxRate),
                    stateId,
                    relatedTransactionType,
                    ...metadata
                })
            })
            .returning();

        return transaction;
    }

    /**
     * Get user's transaction history with pagination
     */
    async getTransactionHistory(
        userId: string,
        options: { page?: number; pageSize?: number } = {}
    ): Promise<{ transactions: TransactionHistory[]; total: number; totalPages: number }> {
        const page = options.page || 1;
        const pageSize = options.pageSize || 20;
        const offset = (page - 1) * pageSize;

        // Get total count
        const [{ count }] = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(transactionHistory)
            .where(eq(transactionHistory.userId, userId));

        // Get paginated transactions
        const transactions = await this.db
            .select()
            .from(transactionHistory)
            .where(eq(transactionHistory.userId, userId))
            .orderBy(desc(transactionHistory.createdAt))
            .limit(pageSize)
            .offset(offset);

        return {
            transactions,
            total: count,
            totalPages: Math.ceil(count / pageSize)
        };
    }

    /**
     * Get user's current balance
     */
    async getBalance(userId: string): Promise<number> {
        const [wallet] = await this.db
            .select({ balance: userWallets.balance })
            .from(userWallets)
            .where(eq(userWallets.userId, userId));

        return wallet ? Number(wallet.balance) : 0;
    }
}
