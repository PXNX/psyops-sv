# Transaction History Migration Checklist

Use this checklist to ensure you've properly migrated to the centralized payment service.

## Phase 1: Setup

- [ ] Review `docs/PAYMENT_SERVICE_GUIDE.md`
- [ ] Review `docs/TRANSACTION_HISTORY_IMPLEMENTATION.md`
- [ ] Accept all proposed changes in your IDE
- [ ] Run database migration: `psql -U username -d database -f docs/migrations/add_transaction_history.sql`
  - OR generate with Drizzle: `npm run db:generate && npm run db:migrate`
- [ ] Verify `transaction_history` table exists in database
- [ ] Verify `transaction_type` enum exists in database

## Phase 2: Test the Transaction History Page

- [ ] Navigate to `/transactions`
- [ ] Page loads without errors
- [ ] No transactions show initially (empty state displays)
- [ ] Pagination controls render correctly

## Phase 3: Update Market Transactions

### File: `src/routes/(authenticated)/(dock)/market/+page.server.ts`

- [ ] Import `PaymentService` at the top
- [ ] Update `buyListing` action:
  - [ ] Replace direct wallet updates with `paymentService.transfer()`
  - [ ] Add transaction metadata (item name, quantity, price)
  - [ ] Handle tax payments separately with `paymentService.deductFunds()`
  - [ ] Test: Buy an item from the market
  - [ ] Verify: Transaction appears in `/transactions`
  - [ ] Verify: Both buyer and seller have transaction records
  
- [ ] Update `removeListing` action (if it refunds money):
  - [ ] Replace direct wallet updates with `paymentService.addFunds()`
  - [ ] Test: Remove a listing
  - [ ] Verify: Refund transaction appears in history

## Phase 4: Update Gift Code Redemptions

### File: `src/routes/(authenticated)/(dock)/giftcode/+page.server.ts`

- [ ] Import `PaymentService` at the top
- [ ] Update `redeem` action:
  - [ ] Replace direct wallet update with `paymentService.addFunds()`
  - [ ] Set `transactionType: 'gift_code_redemption'`
  - [ ] Add metadata with code and resources
  - [ ] Test: Redeem a gift code
  - [ ] Verify: Transaction appears in `/transactions`
  - [ ] Verify: Currency amount is correct
  - [ ] Verify: Metadata contains gift code info

## Phase 5: Update Factory Operations

### File: Factory work service (likely `src/lib/server/service/factoryWork.ts` or similar)

- [ ] Import `PaymentService`
- [ ] Update wage payment logic:
  - [ ] Replace direct wallet update with `paymentService.addFunds()`
  - [ ] Set `transactionType: 'factory_wage'`
  - [ ] Add metadata with factory ID, gross/net wages
  - [ ] Test: Work a shift at a factory
  - [ ] Verify: Wage transaction appears in `/transactions`
  - [ ] Verify: Tax payment appears separately if applicable

### File: `src/routes/(authenticated)/(dock)/factory/[id]/edit/+page.server.ts`

- [ ] Import `PaymentService`
- [ ] Update edit cost payment:
  - [ ] Replace direct wallet update with `paymentService.deductFunds()`
  - [ ] Set `transactionType: 'factory_edit'`
  - [ ] Test: Edit a factory
  - [ ] Verify: Edit cost transaction appears in `/transactions`

## Phase 6: Update Company Operations

### File: `src/routes/(authenticated)/(dock)/company/[id]/+page.server.ts`

- [ ] Import `PaymentService`
- [ ] Update deposit action:
  - [ ] Replace direct wallet update with `paymentService.deductFunds()`
  - [ ] Set `transactionType: 'company_deposit'`
  - [ ] Add metadata with company ID
  - [ ] Test: Deposit money to company
  - [ ] Verify: Transaction appears in `/transactions`
  
- [ ] Update withdrawal action:
  - [ ] Replace direct wallet update with `paymentService.addFunds()`
  - [ ] Set `transactionType: 'company_withdrawal'`
  - [ ] Add metadata with company ID
  - [ ] Test: Withdraw money from company
  - [ ] Verify: Transaction appears in `/transactions`

### File: `src/routes/(authenticated)/(dock)/company/[id]/edit/+page.server.ts`

- [ ] Import `PaymentService`
- [ ] Update edit cost payment:
  - [ ] Replace direct wallet update with `paymentService.deductFunds()`
  - [ ] Set `transactionType: 'company_edit'`
  - [ ] Test: Edit a company
  - [ ] Verify: Edit cost transaction appears in `/transactions`

## Phase 7: Update Settings Changes

### File: `src/routes/(authenticated)/(dock)/settings/+page.server.ts`

- [ ] Import `PaymentService`
- [ ] Update name change action:
  - [ ] Replace direct wallet update with `paymentService.deductFunds()`
  - [ ] Set `transactionType: 'settings_name_change'`
  - [ ] Add metadata with old and new names
  - [ ] Test: Change your name
  - [ ] Verify: Transaction appears in `/transactions`
  
- [ ] Update logo change action:
  - [ ] Replace direct wallet update with `paymentService.deductFunds()`
  - [ ] Set `transactionType: 'settings_logo_change'`
  - [ ] Test: Change your logo
  - [ ] Verify: Transaction appears in `/transactions`

## Phase 8: Update Newspaper Operations

### File: `src/routes/(authenticated)/(dock)/newspaper/[id]/edit/+page.server.ts`

- [ ] Import `PaymentService`
- [ ] Update edit cost payment:
  - [ ] Replace direct wallet update with `paymentService.deductFunds()`
  - [ ] Set `transactionType: 'newspaper_edit'`
  - [ ] Test: Edit a newspaper
  - [ ] Verify: Transaction appears in `/transactions`

## Phase 9: Update Visa Purchases

### File: Visa purchase route (find the file that handles visa purchases)

- [ ] Import `PaymentService`
- [ ] Update visa purchase:
  - [ ] Replace direct wallet update with `paymentService.deductFunds()`
  - [ ] Set `transactionType: 'visa_purchase'`
  - [ ] Add metadata with state ID, visa cost, tax
  - [ ] Test: Purchase a visa
  - [ ] Verify: Transaction appears in `/transactions`

## Phase 10: Add Navigation

- [ ] Add link to `/transactions` in user navigation menu
- [ ] Add link to `/transactions` in settings page
- [ ] Add link to `/transactions` near wallet balance display
- [ ] Test: Click all links and verify they work

## Phase 11: Final Testing

### Comprehensive Transaction Test

- [ ] Create a fresh test account
- [ ] Redeem a gift code
- [ ] Buy something from the market
- [ ] Sell something on the market
- [ ] Work at a factory
- [ ] Deposit to a company
- [ ] Withdraw from a company
- [ ] Edit a factory/company
- [ ] Change your name
- [ ] Change your logo
- [ ] Purchase a visa

### Verify Transaction History

- [ ] Visit `/transactions`
- [ ] All transactions appear
- [ ] Transactions are in chronological order (newest first)
- [ ] Income transactions show in green with positive amounts
- [ ] Expense transactions show in red with negative amounts
- [ ] Balances are correct after each transaction
- [ ] Related users are linked correctly
- [ ] Pagination works (if you have 20+ transactions)
- [ ] Can navigate to first/previous/next/last pages
- [ ] Page numbers display correctly

### Edge Cases

- [ ] Try to spend more money than you have
- [ ] Verify error message appears
- [ ] Verify NO transaction is created
- [ ] Try navigating to page 0
- [ ] Try navigating past the last page
- [ ] Verify pages handle out-of-range requests gracefully

## Phase 12: Performance Check

- [ ] Create 100+ transactions (use a script if needed)
- [ ] Visit `/transactions`
- [ ] Page loads in < 1 second
- [ ] Pagination is responsive
- [ ] Database queries are efficient (check logs)

## Phase 13: Documentation

- [ ] Add transaction history feature to user documentation
- [ ] Update changelog with new feature
- [ ] Document any custom transaction types you added
- [ ] Create admin guide for investigating transaction issues

## Phase 14: Cleanup

- [ ] Remove any old, unused wallet update code
- [ ] Search for direct `userWallets` updates and replace them
- [ ] Run ESLint/Prettier to format code
- [ ] Commit changes with descriptive message

## Troubleshooting

### Transaction not appearing in history

1. Check if PaymentService was actually called
2. Check for errors in server logs
3. Verify database transaction was committed
4. Check if user ID is correct

### Incorrect balance

1. Check if amount is positive/negative correctly
2. Verify `balanceAfter` matches actual wallet balance
3. Look for any direct wallet updates that bypass PaymentService

### Page not loading

1. Check server logs for errors
2. Verify database migration ran successfully
3. Check if `transaction_history` table exists
4. Verify query syntax is correct

### Pagination not working

1. Check URL parameters are being read correctly
2. Verify page number calculations
3. Check total count query
4. Verify offset calculation

## Success Criteria

✅ All existing payment flows work correctly
✅ All payments create transaction history entries
✅ Transaction history page loads without errors
✅ Users can view their complete transaction history
✅ Pagination works correctly
✅ Related users and entities are linked
✅ No direct wallet updates remain in codebase
✅ Performance is acceptable with many transactions

## Need Help?

- Review `docs/PAYMENT_SERVICE_GUIDE.md` for detailed usage
- Check `src/lib/server/services/economy/payment.examples.ts` for code examples
- Look at the transaction history page for UI inspiration

## Notes

Add any migration-specific notes here:

-
-
-

## Completed By

- Name: __________________
- Date: __________________
- Issues Found: ___________
