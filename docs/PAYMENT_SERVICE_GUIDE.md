# Payment Service Guide

This guide explains how to use the centralized PaymentService for all monetary transactions in the application, **including tax handling**.

## Overview

The `PaymentService` provides a centralized way to handle all money transfers and automatically creates transaction history entries for audit trails. This ensures:

- **Consistency**: All payments go through the same code path
- **Transaction History**: Every payment is automatically recorded
- **Audit Trail**: Users can see exactly where their money went
- **Tax Transparency**: Tax payments are clearly shown as separate line items
- **Debugging**: Easier to track down payment issues

## Installation

The PaymentService is located at `src/lib/server/services/economy/payment.service.ts`.

## Basic Usage

### 1. Initialize the Service

```typescript
import { db } from '$lib/server/db';
import { PaymentService } from '$lib/server/services/economy/payment.service';

const paymentService = new PaymentService(db);
```

### 2. Add Funds to a User

Use this when money is coming INTO a user's wallet (e.g., gift code redemption, factory wages, market sales).

```typescript
await paymentService.addFunds({
 userId: 'user-id',
 amount: 50000,
 transactionType: 'gift_code_redemption',
 description: 'Redeemed gift code WELCOME2024',
 relatedEntityType: 'giftcode',
 relatedEntityId: 123,
 metadata: {
  code: 'WELCOME2024',
  resources: ['iron', 'steel']
 }
});
```

### 3. Deduct Funds from a User

Use this when money is going OUT of a user's wallet (e.g., purchases, edit costs).

```typescript
await paymentService.deductFunds({
 userId: 'user-id',
 amount: 100000,
 transactionType: 'factory_edit',
 description: 'Factory edit cost',
 relatedEntityType: 'factory',
 relatedEntityId: 42
});
```

### 4. Transfer Between Users

Use this when money moves from one user to another (e.g., market transactions).

```typescript
const { fromTransaction, toTransaction } = await paymentService.transfer({
 fromUserId: 'buyer-id',
 toUserId: 'seller-id',
 amount: 25000,
 transactionType: 'market_purchase',
 description: 'Purchased 100x iron ore',
 relatedEntityType: 'listing',
 relatedEntityId: 789,
 metadata: {
  itemType: 'resource',
  itemName: 'iron',
  quantity: 100,
  pricePerUnit: 250
 }
});
```

## Handling Taxes

**IMPORTANT**: Taxes are a special case because they are collected by the tax system (`calculateAndCollectTax`) which directly updates wallets and state treasuries. The PaymentService provides a special method to record these tax payments in the transaction history.

### Standard Flow for Taxable Transactions

```typescript
import { calculateAndCollectTax } from '$lib/server/taxes';
import { PaymentService } from '$lib/server/services/economy/payment.service';

const paymentService = new PaymentService(db);

// 1. Calculate and collect tax (this updates wallet and state treasury)
const taxCalculation = await calculateAndCollectTax(
 stateId,
 'market_transaction',
 grossAmount,
 userId
);
// Returns: { grossAmount, taxAmount, netAmount, applicableTaxes }

// 2. Perform the main transaction with NET amount
await paymentService.transfer({
 fromUserId: buyerId,
 toUserId: sellerId,
 amount: taxCalculation.netAmount, // NET after tax
 transactionType: 'market_purchase',
 description: 'Purchased items',
 // ... other options
});

// 3. Record the tax payment in history
if (taxCalculation.taxAmount > 0) {
 await paymentService.recordTaxPayment({
  userId: buyerId,
  taxAmount: taxCalculation.taxAmount,
  taxType: 'market_transaction',
  grossAmount: grossAmount,
  stateId: stateId,
  relatedTransactionType: 'market_purchase',
  relatedEntityType: 'listing',
  relatedEntityId: listingId
 });
}
```

### Why This Pattern?

The tax system (`calculateAndCollectTax`) already:

- Deducts tax from user's wallet
- Adds tax to state treasury
- Records tax revenue in `tax_revenue` table

The `recordTaxPayment()` method simply creates a transaction history entry so the user can see the tax in their transaction list. It does NOT move any money - that's already done.

### Example: Complete Market Purchase

```typescript
export const actions: Actions = {
 buyListing: async ({ request, locals }) => {
  const buyerId = locals.account!.id;
  const listingId = 123;
  const sellerId = 'seller-id';
  const quantity = 100;
  const pricePerUnit = 250;
  const grossAmount = quantity * pricePerUnit; // 25,000
  const buyerStateId = 5;
  
  const paymentService = new PaymentService(db);
  
  // Step 1: Collect taxes (updates wallet + treasury)
  const taxCalc = await calculateAndCollectTax(
   buyerStateId,
   'market_transaction',
   grossAmount,
   buyerId
  );
  // If 20% tax: taxCalc.taxAmount = 5,000, taxCalc.netAmount = 20,000
  
  // Step 2: Transfer NET amount to seller
  await paymentService.transfer({
   fromUserId: buyerId,
   toUserId: sellerId,
   amount: taxCalc.netAmount, // 20,000 to seller
   transactionType: 'market_purchase',
   description: `Purchased ${quantity}x iron ore`,
   relatedEntityType: 'listing',
   relatedEntityId: listingId,
   metadata: {
    quantity,
    pricePerUnit,
    grossAmount,
    taxPaid: taxCalc.taxAmount
   }
  });
  
  // Step 3: Record tax in history
  if (taxCalc.taxAmount > 0) {
   await paymentService.recordTaxPayment({
    userId: buyerId,
    taxAmount: taxCalc.taxAmount, // 5,000
    taxType: 'market_transaction',
    grossAmount,
    stateId: buyerStateId,
    relatedTransactionType: 'market_purchase',
    relatedEntityType: 'listing',
    relatedEntityId: listingId
   });
  }
  
  // User sees TWO transactions:
  // 1. "Purchased 100x iron ore" → -$20,000 (to seller)
  // 2. "Market Transaction Tax (20% of $25,000)" → -$5,000 (to state)
  // Total: -$25,000
 }
};
```

## Transaction Types

The following transaction types are available:

| Type | Description | Usage |
|------|-------------|-------|
| `market_purchase` | User buys from market | Buyer to Seller transfer |
| `market_sale` | User sells on market | Automatically created with purchase |
| `gift_code_redemption` | User redeems gift code | Add funds |
| `factory_wage` | User receives factory wage | Add funds |
| `company_deposit` | User deposits to company | Deduct funds |
| `company_withdrawal` | User withdraws from company | Add funds |
| `visa_purchase` | User buys travel visa | Deduct funds |
| `factory_edit` | User edits factory | Deduct funds |
| `company_edit` | User edits company | Deduct funds |
| `newspaper_edit` | User edits newspaper | Deduct funds |
| `settings_name_change` | User changes name | Deduct funds |
| `settings_logo_change` | User changes logo | Deduct funds |
| `tax_payment` | User pays taxes | Special - use `recordTaxPayment()` |

## API Reference

### `addFunds(options)`

Adds money to a user's wallet and creates a transaction record.

**Parameters:**

- `userId` (string): User receiving the funds
- `amount` (number): Amount to add (must be positive)
- `transactionType` (TransactionType): Type of transaction
- `description` (string): Human-readable description
- `relatedUserId?` (string): Optional related user
- `relatedEntityType?` (string): Optional entity type
- `relatedEntityId?` (number): Optional entity ID
- `metadata?` (object): Optional additional data

**Returns:** `Promise<TransactionHistory>`

**Throws:**

- `"Amount must be positive"`
- `"Wallet not found"`

---

### `deductFunds(options)`

Removes money from a user's wallet and creates a transaction record.

**Parameters:** Same as `addFunds()`

**Returns:** `Promise<TransactionHistory>`

**Throws:**

- `"Amount must be positive"`
- `"Wallet not found"`
- `"Insufficient funds"`

---

### `transfer(options)`

Transfers money from one user to another and creates transaction records for both.

**Parameters:**

- `fromUserId` (string): User sending the money
- `toUserId` (string): User receiving the money
- `amount` (number): Amount to transfer
- `transactionType` (TransactionType): Type of transaction
- `description` (string): Human-readable description
- `relatedEntityType?` (string): Optional entity type
- `relatedEntityId?` (number): Optional entity ID
- `metadata?` (object): Optional additional data

**Returns:** `Promise<{ fromTransaction: TransactionHistory; toTransaction: TransactionHistory }>`

**Throws:**

- `"Amount must be positive"`
- `"Sender wallet not found"`
- `"Recipient wallet not found"`
- `"Insufficient funds"`

---

### `recordTaxPayment(options)` ⭐ NEW

Records a tax payment in transaction history. **Use this AFTER `calculateAndCollectTax()` has already collected the tax.**

**Parameters:**

- `userId` (string): User who paid the tax
- `taxAmount` (number): Amount of tax paid
- `taxType` (string): Type of tax ('mining', 'production', 'market_transaction', 'income')
- `grossAmount` (number): Original amount before tax
- `stateId` (number): State that collected the tax
- `relatedTransactionType?` (TransactionType): The transaction this tax relates to
- `relatedEntityType?` (string): Optional entity type
- `relatedEntityId?` (number): Optional entity ID
- `metadata?` (object): Optional additional data

**Returns:** `Promise<TransactionHistory>`

**Throws:**

- `"Tax amount must be positive"`
- `"Wallet not found"`

**Description:**
This method automatically generates a clear description like:

- "Market Transaction Tax (20% of $10,000)"
- "Income Tax (15% of $5,000)"

---

### `getTransactionHistory(userId, options?)`

Retrieves paginated transaction history for a user.

**Parameters:**

- `userId` (string): User ID
- `options.page?` (number): Page number (default: 1)
- `options.pageSize?` (number): Items per page (default: 20)

**Returns:** `Promise<{ transactions: TransactionHistory[]; total: number; totalPages: number }>`

---

### `getBalance(userId)`

Gets the current balance for a user.

**Parameters:**

- `userId` (string): User ID

**Returns:** `Promise<number>` - Current balance

## Best Practices

### 1. Always Use Descriptive Descriptions

```typescript
// ❌ Bad
description: 'Purchase'

// ✅ Good
description: 'Purchased 100x iron ore from market'
```

### 2. Include Metadata for Complex Transactions

```typescript
metadata: {
 itemType: 'resource',
 itemName: 'iron',
 quantity: 100,
 pricePerUnit: 250,
 totalPrice: 25000,
 taxPaid: 5000,
 sellerId: 'seller-user-id'
}
```

### 3. Always Record Taxes

Whenever `calculateAndCollectTax()` returns a non-zero `taxAmount`, you MUST call `recordTaxPayment()` to make it visible to the user.

```typescript
if (taxCalculation.taxAmount > 0) {
 await paymentService.recordTaxPayment({
  userId,
  taxAmount: taxCalculation.taxAmount,
  taxType: 'market_transaction',
  grossAmount,
  stateId,
  relatedTransactionType: 'market_purchase'
 });
}
```

### 4. Link Related Entities

Always specify `relatedEntityType` and `relatedEntityId` when applicable:

```typescript
relatedEntityType: 'factory',  // or 'listing', 'company', 'giftcode', etc.
relatedEntityId: 42
```

### 5. Handle Errors Appropriately

```typescript
try {
 await paymentService.deductFunds({
  userId,
  amount,
  transactionType: 'market_purchase',
  description: 'Purchase'
 });
} catch (error) {
 if (error.message === 'Insufficient funds') {
  return fail(400, { message: 'You don\'t have enough money' });
 }
 throw error;
}
```

## Viewing Transaction History

Users can view their complete transaction history at `/transactions`. The page includes:

- All incoming and outgoing transactions
- **Tax payments shown as separate line items**
- Pagination (20 transactions per page)
- Transaction details including date, type, amount, and related parties
- Current balance after each transaction

### Example User View

After buying $10,000 worth of items with 20% tax, the user sees:

```
Date         Type              Description                           Amount      Balance After
2024-01-15   Market Purchase   Purchased 100x iron ore              -$8,000     $42,000
2024-01-15   Tax Payment       Market Transaction Tax (20% of...)   -$2,000     $50,000
```

**Total spent: $10,000** (clearly visible)

## Example Implementations

See `src/lib/server/services/economy/payment.examples.ts` for complete examples of:

- Market purchases with taxes
- Factory wage payments with income tax
- Gift code redemptions (no tax)
- Company deposits and withdrawals
- Edit cost payments
- Visa purchases

## Common Patterns

### Pattern 1: Simple Payment (No Taxes)

```typescript
await paymentService.deductFunds({
 userId,
 amount,
 transactionType: 'factory_edit',
 description: 'Factory edit cost'
});
```

### Pattern 2: Transfer Between Users (No Taxes)

```typescript
await paymentService.transfer({
 fromUserId,
 toUserId,
 amount,
 transactionType: 'market_purchase',
 description: 'Purchased items'
});
```

### Pattern 3: Payment With Taxes ⭐

```typescript
// 1. Collect tax
const taxCalc = await calculateAndCollectTax(stateId, taxType, grossAmount, userId);

// 2. Main transaction (use NET amount)
await paymentService.transfer({
 fromUserId: buyer,
 toUserId: seller,
 amount: taxCalc.netAmount,
 // ...
});

// 3. Record tax
if (taxCalc.taxAmount > 0) {
 await paymentService.recordTaxPayment({
  userId,
  taxAmount: taxCalc.taxAmount,
  taxType,
  grossAmount,
  stateId
 });
}
```

### Pattern 4: Income With Taxes ⭐

```typescript
// 1. Collect income tax
const taxCalc = await calculateAndCollectTax(stateId, 'income', grossIncome, userId);

// 2. Add NET income
await paymentService.addFunds({
 userId,
 amount: taxCalc.netAmount,
 transactionType: 'factory_wage',
 description: `Factory wage (gross: $${grossIncome})`
});

// 3. Record tax
if (taxCalc.taxAmount > 0) {
 await paymentService.recordTaxPayment({
  userId,
  taxAmount: taxCalc.taxAmount,
  taxType: 'income',
  grossAmount: grossIncome,
  stateId,
  relatedTransactionType: 'factory_wage'
 });
}
```

## Testing

When testing payment flows, always verify:

1. Transaction history entries are created
2. Wallet balances are updated correctly
3. Related entities are properly linked
4. Metadata is stored correctly
5. **Tax payments appear as separate transactions**
6. **Tax amounts are correct**

```typescript
// Example test
const grossAmount = 10000;
const taxCalc = await calculateAndCollectTax(stateId, 'market_transaction', grossAmount, userId);

await paymentService.transfer({
 fromUserId: buyer,
 toUserId: seller,
 amount: taxCalc.netAmount,
 transactionType: 'market_purchase',
 description: 'Test purchase'
});

await paymentService.recordTaxPayment({
 userId: buyer,
 taxAmount: taxCalc.taxAmount,
 taxType: 'market_transaction',
 grossAmount,
 stateId
});

// Verify
const history = await paymentService.getTransactionHistory(buyer);
expect(history.transactions).toHaveLength(2); // Purchase + Tax
expect(history.transactions[0].type).toBe('tax_payment');
expect(history.transactions[0].amount).toBe(-taxCalc.taxAmount);
expect(history.transactions[1].type).toBe('market_purchase');
expect(history.transactions[1].amount).toBe(-taxCalc.netAmount);
```

## Summary

✅ **DO**:

- Always use PaymentService for wallet updates
- Record ALL taxes with `recordTaxPayment()`
- Include descriptive descriptions
- Add metadata for context
- Link related entities

❌ **DON'T**:

- Directly update `userWallets` table
- Forget to record tax payments
- Use vague descriptions
- Forget to handle errors
- Skip metadata for complex transactions

The PaymentService ensures every penny is accounted for and visible to users! 💰
