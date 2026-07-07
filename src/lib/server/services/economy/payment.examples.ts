/**
 * Examples of how to use the PaymentService in existing code
 * 
 * This file demonstrates how to migrate existing payment logic to use the centralized PaymentService
 */

import { db } from '$lib/server/db';
import { PaymentService } from './payment.service';
import { calculateAndCollectTax } from '$lib/server/taxes';

// Create a payment service instance
const paymentService = new PaymentService(db);

// ============================================================================
// EXAMPLE 1: Market Purchase WITH TAXES (from market/+page.server.ts buyListing action)
// ============================================================================

export async function marketPurchaseWithTaxExample() {
    const listingId = 1;
    const buyerId = 'buyer-user-id';
    const sellerId = 'seller-user-id';
    const quantity = 10;
    const pricePerUnit = 1000;
    const grossAmount = quantity * pricePerUnit; // 10,000
    const buyerStateId = 5; // Buyer's state (for tax collection)

    // Step 1: Calculate and collect tax (this updates wallet and state treasury)
    const taxCalculation = await calculateAndCollectTax(
        buyerStateId,
        'market_transaction',
        grossAmount,
        buyerId
    );
    // taxCalculation = {
    //   grossAmount: 10000,
    //   taxAmount: 2000,    // 20% tax
    //   netAmount: 8000,
    //   applicableTaxes: [...]
    // }

    // Step 2: Transfer the NET amount to seller (buyer already paid tax)
    await paymentService.transfer({
        fromUserId: buyerId,
        toUserId: sellerId,
        amount: taxCalculation.netAmount, // 8,000 (after tax)
        transactionType: 'market_purchase',
        description: `Purchased ${quantity}x iron ore`,
        relatedEntityType: 'listing',
        relatedEntityId: listingId,
        metadata: {
            quantity,
            pricePerUnit,
            itemType: 'resource',
            itemName: 'iron',
            grossAmount,
            taxAmount: taxCalculation.taxAmount,
            netAmountToSeller: taxCalculation.netAmount
        }
    });

    // Step 3: Record the tax payment in transaction history
    if (taxCalculation.taxAmount > 0) {
        await paymentService.recordTaxPayment({
            userId: buyerId,
            taxAmount: taxCalculation.taxAmount,
            taxType: 'market_transaction',
            grossAmount,
            stateId: buyerStateId,
            relatedTransactionType: 'market_purchase',
            relatedEntityType: 'listing',
            relatedEntityId: listingId,
            metadata: {
                itemName: 'iron',
                quantity,
                sellerName: 'John Doe'
            }
        });
    }

    // Result: User sees TWO transactions in their history:
    // 1. "Purchased 10x iron ore" → -$8,000 (to seller)
    // 2. "Market Transaction Tax (20% of $10,000)" → -$2,000 (to state)
    // Total spent: $10,000
}

// ============================================================================
// EXAMPLE 2: Market Purchase WITHOUT TAXES
// ============================================================================

export async function marketPurchaseNoTaxExample() {
    const listingId = 1;
    const buyerId = 'buyer-user-id';
    const sellerId = 'seller-user-id';
    const quantity = 10;
    const pricePerUnit = 1000;
    const totalPrice = quantity * pricePerUnit;

    // Simple transfer when no taxes apply
    await paymentService.transfer({
        fromUserId: buyerId,
        toUserId: sellerId,
        amount: totalPrice,
        transactionType: 'market_purchase',
        description: `Purchased ${quantity}x iron ore`,
        relatedEntityType: 'listing',
        relatedEntityId: listingId,
        metadata: {
            quantity,
            pricePerUnit,
            itemType: 'resource',
            itemName: 'iron'
        }
    });

    // Result: User sees ONE transaction:
    // 1. "Purchased 10x iron ore" → -$10,000
}

// ============================================================================
// EXAMPLE 3: Factory Wage WITH INCOME TAX
// ============================================================================

export async function factoryWageWithTaxExample() {
    const workerId = 'worker-user-id';
    const factoryId = 42;
    const grossWage = 1500;
    const workerStateId = 3;

    // Step 1: Calculate and collect income tax
    const taxCalculation = await calculateAndCollectTax(
        workerStateId,
        'income',
        grossWage,
        workerId
    );
    // taxCalculation.taxAmount = 150 (10% income tax)
    // taxCalculation.netAmount = 1350

    // Step 2: Add NET wage to worker's wallet
    await paymentService.addFunds({
        userId: workerId,
        amount: taxCalculation.netAmount,
        transactionType: 'factory_wage',
        description: `Factory wage (gross: $${grossWage})`,
        relatedEntityType: 'factory',
        relatedEntityId: factoryId,
        metadata: {
            grossWage,
            taxAmount: taxCalculation.taxAmount,
            netWage: taxCalculation.netAmount,
            factoryId
        }
    });

    // Step 3: Record tax payment in history
    if (taxCalculation.taxAmount > 0) {
        await paymentService.recordTaxPayment({
            userId: workerId,
            taxAmount: taxCalculation.taxAmount,
            taxType: 'income',
            grossAmount: grossWage,
            stateId: workerStateId,
            relatedTransactionType: 'factory_wage',
            relatedEntityType: 'factory',
            relatedEntityId: factoryId
        });
    }

    // Result: User sees TWO transactions:
    // 1. "Factory wage (gross: $1,500)" → +$1,350
    // 2. "Income Tax (10% of $1,500)" → -$150
    // Net received: $1,350
}

// ============================================================================
// EXAMPLE 4: Gift Code Redemption (no taxes)
// ============================================================================

export async function giftCodeRedemptionExample() {
    const userId = 'user-id';
    const giftCodeId = 123;
    const currencyAmount = 50000;

    await paymentService.addFunds({
        userId,
        amount: currencyAmount,
        transactionType: 'gift_code_redemption',
        description: `Redeemed gift code WELCOME2024`,
        relatedEntityType: 'giftcode',
        relatedEntityId: giftCodeId,
        metadata: {
            giftCodeId,
            code: 'WELCOME2024',
            resources: [
                { type: 'iron', quantity: 100 },
                { type: 'steel', quantity: 50 }
            ]
        }
    });

    // Result: User sees ONE transaction:
    // 1. "Redeemed gift code WELCOME2024" → +$50,000
}

// ============================================================================
// EXAMPLE 5: Complete Market Purchase Flow (Actual Implementation)
// ============================================================================

export async function completeMarketPurchaseFlow() {
    // This is how you'd implement it in the actual market buyListing action
    const buyerId = 'buyer-id';
    const sellerId = 'seller-id';
    const listingId = 789;
    const quantity = 100;
    const pricePerUnit = 250;
    const grossAmount = quantity * pricePerUnit; // 25,000
    const buyerStateId = 5;

    // 1. Calculate taxes
    const taxCalculation = await calculateAndCollectTax(
        buyerStateId,
        'market_transaction',
        grossAmount,
        buyerId
    );

    // 2. Check if buyer has enough funds (gross amount including tax)
    const buyerBalance = await paymentService.getBalance(buyerId);
    if (buyerBalance < grossAmount) {
        throw new Error('Insufficient funds');
    }

    // 3. Transfer net amount to seller
    const { fromTransaction, toTransaction } = await paymentService.transfer({
        fromUserId: buyerId,
        toUserId: sellerId,
        amount: taxCalculation.netAmount,
        transactionType: 'market_purchase',
        description: `Purchased ${quantity}x iron ore`,
        relatedEntityType: 'listing',
        relatedEntityId: listingId,
        metadata: {
            itemType: 'resource',
            itemName: 'iron',
            quantity,
            pricePerUnit,
            grossAmount,
            taxPaid: taxCalculation.taxAmount
        }
    });

    // 4. Record tax payment (if any)
    if (taxCalculation.taxAmount > 0) {
        await paymentService.recordTaxPayment({
            userId: buyerId,
            taxAmount: taxCalculation.taxAmount,
            taxType: 'market_transaction',
            grossAmount,
            stateId: buyerStateId,
            relatedTransactionType: 'market_purchase',
            relatedEntityType: 'listing',
            relatedEntityId: listingId
        });
    }

    // 5. Update inventory, listings, etc. (existing market logic)
    // ...

    return {
        success: true,
        buyerTransaction: fromTransaction,
        sellerTransaction: toTransaction,
        taxPaid: taxCalculation.taxAmount
    };
}

// ============================================================================
// EXAMPLE 6: Edit Costs (no taxes)
// ============================================================================

export async function factoryEditExample() {
    const userId = 'user-id';
    const factoryId = 10;
    const editCost = 50000;

    await paymentService.deductFunds({
        userId,
        amount: editCost,
        transactionType: 'factory_edit',
        description: `Factory edit cost`,
        relatedEntityType: 'factory',
        relatedEntityId: factoryId
    });

    // Result: User sees ONE transaction:
    // 1. "Factory edit cost" → -$50,000
}

// ============================================================================
// EXAMPLE 7: Visa Purchase WITH TAX
// ============================================================================

export async function visaPurchaseExample() {
    const userId = 'user-id';
    const stateId = 7;
    const visaCost = 5000;
    const visaTaxAmount = 1000; // 20% tax
    const totalCost = visaCost + visaTaxAmount;

    // Deduct total cost (visa + tax)
    await paymentService.deductFunds({
        userId,
        amount: totalCost,
        transactionType: 'visa_purchase',
        description: `Purchased visa for State #${stateId}`,
        relatedEntityType: 'state',
        relatedEntityId: stateId,
        metadata: {
            visaCost,
            visaTax: visaTaxAmount,
            stateId
        }
    });

    // Note: If visa tax is collected through the standard tax system,
    // you would also call recordTaxPayment() here similar to market purchases
}

// ============================================================================
// USAGE PATTERN IN ROUTES
// ============================================================================

/**
 * Standard pattern for any transaction with taxes:
 * 
 * 1. Calculate and collect tax (if applicable)
 *    const taxCalc = await calculateAndCollectTax(...)
 * 
 * 2. Perform the main transaction
 *    await paymentService.transfer() or addFunds() or deductFunds()
 * 
 * 3. Record tax payment in history (if tax was collected)
 *    if (taxCalc.taxAmount > 0) {
 *      await paymentService.recordTaxPayment(...)
 *    }
 * 
 * This ensures:
 * - Taxes are properly collected and added to state treasury
 * - Main transaction is recorded with correct net amount
 * - Tax payment appears as separate line item in user's history
 * - Users can see exactly how much tax they paid and why
 */
